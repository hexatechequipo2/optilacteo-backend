import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { Lote } from '../entities/lote.entity';
import { TipoEventoTrazabilidad } from '../enums/tipo-evento-trazabilidad.enum';
import {
  EventoTrazabilidadDto,
  TrazabilidadLoteResponseDto,
} from '../dto/trazabilidad-lote-response.dto';

interface BuildParams {
  lote: Lote;
  empresa: Empresa;
  trazabilidad: TrazabilidadLoteResponseDto;
  fechaGeneracion: Date;
  firmaDigital: string;
}

interface DetalleLine {
  text: string;
  indent: boolean;
}

const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 495; // ancho útil en A4 con margen 50 a cada lado
const ORPHAN_THRESHOLD = 60; // mínimo espacio libre para arrancar un evento nuevo

// HU-45: maquetado puro del PDF de trazabilidad. Sin lógica de negocio ni
// acceso a datos — solo recibe todo ya resuelto y dibuja. Deja que pdfkit
// maneje la paginación de forma nativa (evita precalcular alturas a mano,
// que es frágil). Solo se controla que no quede un título huérfano al
// pie de una hoja.
@Injectable()
export class TrazabilidadPdfBuilder {
  build(params: BuildParams): Promise<Buffer> {
    const { lote, empresa, trazabilidad, fechaGeneracion, firmaDigital } = params;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawHeader(doc, empresa);
      this.drawTitulo(doc, lote, fechaGeneracion);
      this.drawLeyenda(doc);
      this.drawEventos(doc, trazabilidad.eventos);
      this.drawFirmaFinal(doc, firmaDigital);
      this.drawNumeroPagina(doc);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument, empresa: Empresa): void {
    const startY = doc.y;

    if (empresa.logoPath && existsSync(empresa.logoPath)) {
      try {
        doc.image(empresa.logoPath, PAGE_MARGIN, startY, { width: 60, height: 60, fit: [60, 60] });
      } catch {
        // Logo corrupto o no soportado: seguimos sin logo, no rompemos el reporte.
      }
    }

    const textX = empresa.logoPath ? 120 : PAGE_MARGIN;
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#111111')
      .text(empresa.name, textX, startY, { width: 400 })
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555555')
      .text(`CUIT: ${empresa.cuit}`, textX)
      .text(empresa.direccion ?? '');

    doc.moveDown(1.5);
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y)
      .strokeColor('#cccccc')
      .lineWidth(1)
      .stroke();
    doc.moveDown(1);
    doc.fillColor('#000000');
  }

  private drawTitulo(doc: PDFKit.PDFDocument, lote: Lote, fechaGeneracion: Date): void {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Reporte de Trazabilidad de Lote', { align: 'center' });

    doc.moveDown(0.6);
    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    doc.text(`Número de lote: ${lote.codigo}`);
    doc.text(`Fecha de generación: ${fechaGeneracion.toLocaleString('es-AR')}`);
    doc.text(`Estado actual: ${this.humanizeEstado(lote.estado)}`);
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Cronología de eventos');
    doc.moveDown(0.5);
  }

  // Mide el ancho real de cada etiqueta con widthOfString y arma filas
  // dinámicamente, para que nunca se corte sin importar cuánto midan los
  // textos (a diferencia de columnas de ancho fijo).
  private drawLeyenda(doc: PDFKit.PDFDocument): void {
    const items: Array<[string, string]> = [
      ['#2563eb', 'Recepción'],
      ['#7c3aed', 'Revisión / Clasificación'],
      ['#64748b', 'Movimiento / Consumo'],
      ['#16a34a', 'Decisión sin observaciones'],
      ['#dc2626', 'Atención: divergencia o no apto'],
    ];

    const startX = PAGE_MARGIN;
    const maxX = PAGE_MARGIN + CONTENT_WIDTH;
    const swatch = 7;
    const gapSwatchLabel = 4;
    const gapEntreItems = 16;
    const rowHeight = 14;

    doc.fontSize(8).font('Helvetica');

    let x = startX;
    let y = doc.y;

    for (const [color, label] of items) {
      const labelWidth = doc.widthOfString(label);
      const itemWidth = swatch + gapSwatchLabel + labelWidth;

      if (x + itemWidth > maxX) {
        x = startX;
        y += rowHeight;
      }

      doc.rect(x, y + 1, swatch, swatch).fill(color);
      doc
        .fillColor('#444444')
        .text(label, x + swatch + gapSwatchLabel, y, { lineBreak: false });

      x += itemWidth + gapEntreItems;
    }

    doc.x = startX;
    doc.y = y + rowHeight + 4;
    doc.fillColor('#000000');
  }

  private drawEventos(doc: PDFKit.PDFDocument, eventos: EventoTrazabilidadDto[]): void {
    eventos.forEach((evento, index) => this.drawEvento(doc, evento, index));
  }

  private drawEvento(doc: PDFKit.PDFDocument, evento: EventoTrazabilidadDto, index: number): void {
    // Control de huérfanos: si no entra ni el título en lo que queda de
    // página, saltamos. El resto del contenido fluye naturalmente entre
    // páginas (pdfkit lo maneja solo).
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y > pageBottom - ORPHAN_THRESHOLD) {
      doc.addPage();
    }

    const color = this.colorForEvento(evento);
    const atencion = this.requiereAtencion(evento);
    const prefijo = atencion ? 'ATENCIÓN — ' : '';
    const tituloText = `${prefijo}${index + 1}. ${this.humanizeTipo(evento.tipo)}  —  ${new Date(
      evento.fecha,
    ).toLocaleString('es-AR')}`;

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(color)
      .text(this.sanitize(tituloText), PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });

    doc.moveDown(0.25);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#333333')
      .text(this.sanitize(evento.descripcion), PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });

    const detalleLines = this.formatDetalleLines(evento.detalle);
    if (detalleLines.length) {
      doc.moveDown(0.25);
      doc.font('Helvetica').fontSize(8).fillColor('#666666');
      for (const line of detalleLines) {
        const bullet = line.indent ? '   -  ' : '•  ';
        const width = line.indent ? CONTENT_WIDTH - 14 : CONTENT_WIDTH;
        const x = line.indent ? PAGE_MARGIN + 14 : PAGE_MARGIN;
        doc.text(`${bullet}${this.sanitize(line.text)}`, x, doc.y, { width });
      }
    }

    doc.moveDown(0.5);
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y)
      .strokeColor('#eeeeee')
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.5);
    doc.fillColor('#000000');
  }

  private requiereAtencion(evento: EventoTrazabilidadDto): boolean {
    const detalle = evento.detalle ?? {};
    if (evento.tipo === TipoEventoTrazabilidad.CLASIFICACION) {
      return detalle.clasificacion === 'no_apto';
    }
    if (evento.tipo === TipoEventoTrazabilidad.RECOMENDACION_DESTINO) {
      return Boolean(detalle.divergencia);
    }
    return false;
  }

  private colorForEvento(evento: EventoTrazabilidadDto): string {
    if (this.requiereAtencion(evento)) return '#dc2626';

    switch (evento.tipo) {
      case TipoEventoTrazabilidad.RECEPCION:
        return '#2563eb';
      case TipoEventoTrazabilidad.CLASIFICACION:
      case TipoEventoTrazabilidad.REVISION_CALIDAD:
        return '#7c3aed';
      case TipoEventoTrazabilidad.CAMBIO_UBICACION:
      case TipoEventoTrazabilidad.INGRESO_CAMARA:
      case TipoEventoTrazabilidad.CONSUMO_PARCIAL:
        return '#64748b';
      case TipoEventoTrazabilidad.RECOMENDACION_DESTINO:
      case TipoEventoTrazabilidad.FINALIZACION:
        return '#16a34a';
      default:
        return '#374151';
    }
  }

  // Arma las líneas de detalle a mostrar debajo de cada evento:
  // - Oculta una "xxxId" cuando existe su par legible "xxxNombre" o
  //   "xxxCodigo" (ej. destinoRecomendadoId se oculta si ya está
  //   destinoRecomendadoNombre; loteProduccionId se oculta si ya está
  //   loteProduccionCodigo).
  // - Los arrays de parámetros (parametros / parametrosUtilizados) se
  //   listan como sub-ítems indentados en vez de una sola línea larga.
  private formatDetalleLines(detalle: Record<string, unknown>): DetalleLine[] {
    const lines: DetalleLine[] = [];

    for (const [key, value] of Object.entries(detalle)) {
      if (value === null || value === undefined || value === '') continue;

      if (key.endsWith('Id')) {
        const base = key.slice(0, -2);
        const parHermano = detalle[`${base}Nombre`] ?? detalle[`${base}Codigo`];
        if (parHermano !== undefined && parHermano !== null) {
          continue;
        }
      }

      if ((key === 'parametros' || key === 'parametrosUtilizados') && Array.isArray(value)) {
        const params = (value as Array<Record<string, unknown>>).filter(
          (p) => p && p.parametro !== undefined,
        );
        if (!params.length) continue;

        lines.push({ text: 'Parámetros:', indent: false });
        for (const p of params) {
          lines.push({ text: `${p.parametro}: ${p.valor}`, indent: true });
        }
        continue;
      }

      lines.push({ text: `${this.humanizeKey(key)}: ${this.formatValue(value)}`, indent: false });
    }

    return lines;
  }

  private formatValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ');
    }
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private humanizeKey(key: string): string {
    const map: Record<string, string> = {
      codigo: 'Código',
      proveedorId: 'Proveedor (ID)',
      tamboId: 'Tambo (ID)',
      materiaPrima: 'Materia prima',
      cantidad: 'Cantidad',
      numeroRemito: 'N° de remito',
      cantidadComprometidaKg: 'Cantidad comprometida (kg)',
      usuarioId: 'Usuario (ID)',
      decision: 'Decisión',
      justificacion: 'Justificación',
      destinoRecomendadoNombre: 'Destino recomendado',
      destinoRealNombre: 'Destino real',
      divergencia: 'Divergencia',
      loteProduccionCodigo: 'Lote de producción',
      skuNombre: 'SKU',
      ubicacionAnterior: 'Ubicación anterior',
      ubicacionNueva: 'Ubicación nueva',
      rendimiento: 'Rendimiento',
      unidadRendimiento: 'Unidad de rendimiento',
      clasificacion: 'Clasificación',
    };
    return map[key] ?? key;
  }

  private humanizeTipo(tipo: TipoEventoTrazabilidad): string {
    const map: Record<TipoEventoTrazabilidad, string> = {
      [TipoEventoTrazabilidad.RECEPCION]: 'Recepción',
      [TipoEventoTrazabilidad.CLASIFICACION]: 'Clasificación automática',
      [TipoEventoTrazabilidad.REVISION_CALIDAD]: 'Revisión manual de calidad',
      [TipoEventoTrazabilidad.CAMBIO_UBICACION]: 'Cambio de ubicación',
      [TipoEventoTrazabilidad.INGRESO_CAMARA]: 'Ingreso a cámara',
      [TipoEventoTrazabilidad.CONSUMO_PARCIAL]: 'Consumo parcial',
      [TipoEventoTrazabilidad.FINALIZACION]: 'Finalización',
      [TipoEventoTrazabilidad.RECOMENDACION_DESTINO]: 'Destino productivo',
    };
    return map[tipo] ?? tipo;
  }

  private humanizeEstado(estado: string): string {
    const map: Record<string, string> = {
      registrado: 'Registrado',
      en_proceso: 'En proceso',
      finalizado: 'Finalizado',
      rechazado: 'Rechazado',
    };
    return map[estado] ?? estado;
  }

  // Reemplaza caracteres que las fuentes estándar de pdfkit (WinAnsi) no
  // soportan y que se ven como "mojibake" (ej. la flecha "→"). No toca el
  // JSON de la API, solo lo que efectivamente se imprime en el PDF.
  private sanitize(text: string): string {
    return text.replace(/→/g, '->');
  }

  // Bloque de cierre del documento: se agrega una sola vez, al final de
  // todos los eventos (no en cada página). Si no entra en lo que queda de
  // la página actual, salta a una nueva antes de dibujarlo, para que
  // quede como una unidad visual y no se corte a la mitad.
  private drawFirmaFinal(doc: PDFKit.PDFDocument, firmaDigital: string): void {
    const bloqueAltura = 70;
    const pageBottom = doc.page.height - doc.page.margins.bottom;

    if (doc.y > pageBottom - bloqueAltura) {
      doc.addPage();
    }

    doc.moveDown(1);
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y)
      .strokeColor('#cccccc')
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.8);

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#333333')
      .text('Firma digital del sistema', PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });

    doc.moveDown(0.3);
    doc
      .font('Courier')
      .fontSize(8)
      .fillColor('#555555')
      .text(firmaDigital, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });

    doc.moveDown(0.3);
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#999999')
      .text(
        'Este hash permite verificar que el contenido del reporte no fue alterado desde su generación.',
        PAGE_MARGIN,
        doc.y,
        { width: CONTENT_WIDTH },
      );

    doc.fillColor('#000000');
  }

  // Numeración de página en todas las hojas del documento (sin la firma).
  private drawNumeroPagina(doc: PDFKit.PDFDocument): void {
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(range.start + i);

      const originalBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const bottom = doc.page.height - 35;
      doc
        .fontSize(7)
        .fillColor('#999999')
        .text(`Página ${i + 1} de ${totalPages}`, PAGE_MARGIN + CONTENT_WIDTH - 60, bottom, {
          width: 60,
          align: 'right',
          lineBreak: false,
        });

      doc.page.margins.bottom = originalBottomMargin;
    }
  }
}