import PDFDocument from 'pdfkit';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrazabilidadPdfBuilder } from '../pdf/trazabilidad-pdf.builder';
import { TipoEventoTrazabilidad } from '../enums/tipo-evento-trazabilidad.enum';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('TrazabilidadPdfBuilder', () => {
  let builder: TrazabilidadPdfBuilder;
  let tmpDir: string;
  let textSpy: jest.SpyInstance;

  const textos = () => textSpy.mock.calls.map((c) => String(c[0]));
  const esPdf = (b: Buffer) => b.subarray(0, 5).toString() === '%PDF-';

  const empresa = (o: Record<string, unknown> = {}) =>
    ({
      name: 'Lácteos SA',
      cuit: '30-12345678-9',
      direccion: 'Calle 123',
      logoPath: null,
      ...o,
    }) as any;

  const lote = { codigo: 'LOT-1', estado: 'en_proceso' } as any;

  const evento = (
    tipo: TipoEventoTrazabilidad | string,
    detalle: Record<string, unknown> = {},
    extra: Record<string, unknown> = {},
  ) =>
    ({
      tipo,
      fecha: new Date('2026-08-01T10:00:00'),
      descripcion: 'desc',
      detalle,
      ...extra,
    }) as any;

  const build = (eventos: any[], emp = empresa(), l = lote) =>
    builder.build({
      lote: l,
      empresa: emp,
      trazabilidad: { loteId: 1, codigoLote: l.codigo, eventos },
      fechaGeneracion: new Date('2026-08-10T12:00:00'),
      firmaDigital: 'a'.repeat(64),
    });

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pdf-test-'));
  });
  afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

  beforeEach(() => {
    builder = new TrazabilidadPdfBuilder();
    textSpy = jest.spyOn(PDFDocument.prototype, 'text');
  });
  afterEach(() => jest.restoreAllMocks());

  describe('encabezado', () => {
    it('genera un PDF válido sin eventos, sin logo y sin dirección', async () => {
      const buffer = await build([], empresa({ direccion: null }));

      expect(esPdf(buffer)).toBe(true);
      expect(textos()).toContain('Reporte de Trazabilidad de Lote');
      expect(textos()).toContain('Número de lote: LOT-1');
      expect(textos()).toContain('Estado actual: En proceso');
    });

    it('dibuja el logo cuando el archivo existe y es válido', async () => {
      const logoPath = join(tmpDir, 'logo.png');
      writeFileSync(logoPath, PNG_1X1);
      const imageSpy = jest.spyOn(PDFDocument.prototype, 'image');

      const buffer = await build([], empresa({ logoPath }));

      expect(imageSpy).toHaveBeenCalled();
      expect(esPdf(buffer)).toBe(true);
    });

    it('no intenta dibujar el logo si el archivo no existe', async () => {
      const imageSpy = jest.spyOn(PDFDocument.prototype, 'image');

      const buffer = await build([], empresa({ logoPath: join(tmpDir, 'nope.png') }));

      expect(imageSpy).not.toHaveBeenCalled();
      expect(esPdf(buffer)).toBe(true);
    });

    it('si el logo está corrupto, genera igual el reporte', async () => {
      const logoPath = join(tmpDir, 'corrupto.png');
      writeFileSync(logoPath, 'esto no es una imagen');

      const buffer = await build([], empresa({ logoPath }));

      expect(esPdf(buffer)).toBe(true);
    });

    it('humaniza el estado y deja pasar los desconocidos tal cual', async () => {
      await build([], empresa(), { codigo: 'X', estado: 'finalizado' });
      expect(textos()).toContain('Estado actual: Finalizado');

      textSpy.mockClear();
      await build([], empresa(), { codigo: 'X', estado: 'raro' });
      expect(textos()).toContain('Estado actual: raro');
    });
  });

  describe('eventos', () => {
    it('renderiza todos los tipos de evento y uno desconocido', async () => {
      const eventos = [
        ...Object.values(TipoEventoTrazabilidad).map((t) => evento(t)),
        evento('tipo_inventado'),
      ];

      const buffer = await build(eventos);

      expect(esPdf(buffer)).toBe(true);
      const t = textos().join('\n');
      expect(t).toContain('Recepción');
      expect(t).toContain('Clasificación automática');
      expect(t).toContain('Revisión manual de calidad');
      expect(t).toContain('Cambio de ubicación');
      expect(t).toContain('Ingreso a cámara');
      expect(t).toContain('Consumo parcial');
      expect(t).toContain('Finalización');
      expect(t).toContain('Destino productivo');
      expect(t).toContain('tipo_inventado');
    });

    it('marca como ATENCIÓN una clasificación no apta y una divergencia de destino', async () => {
      await build([
        evento(TipoEventoTrazabilidad.CLASIFICACION, { clasificacion: 'no_apto' }),
        evento(TipoEventoTrazabilidad.RECOMENDACION_DESTINO, { divergencia: true }),
      ]);

      const atencion = textos().filter((t) => t.startsWith('ATENCIÓN — '));
      expect(atencion).toHaveLength(2);
    });

    it('no marca ATENCIÓN en clasificación apta ni en destino aceptado', async () => {
      await build([
        evento(TipoEventoTrazabilidad.CLASIFICACION, { clasificacion: 'apto' }),
        evento(TipoEventoTrazabilidad.RECOMENDACION_DESTINO, { divergencia: false }),
      ]);

      expect(textos().some((t) => t.startsWith('ATENCIÓN'))).toBe(false);
      expect(textos()).toContain('•  Divergencia: No');
    });

    it('reemplaza la flecha → por -> en las descripciones', async () => {
      await build([evento(TipoEventoTrazabilidad.CAMBIO_UBICACION, {}, { descripcion: 'A → B' })]);

      expect(textos()).toContain('A -> B');
      expect(textos().some((t) => t.includes('→'))).toBe(false);
    });
  });

  describe('líneas de detalle', () => {
    it('oculta los xxxId con par legible, formatea valores y omite vacíos', async () => {
      await build([
        evento(TipoEventoTrazabilidad.RECEPCION, {
          codigo: 'LOT-1',
          proveedorId: 2,
          proveedorNombre: 'Prov SA',
          tamboId: 3, // sin par legible: se muestra
          loteProduccionId: 8,
          loteProduccionCodigo: 'PROD-1',
          vacio: '',
          nulo: null,
          indefinido: undefined,
          divergencia: true,
          tags: ['a', { b: 1 }],
          obj: { x: 1 },
          campoRaro: 5,
          parametros: [{ parametro: 'PH', valor: 6.5 }, null, { sinParametro: 1 }],
        }),
      ]);

      const t = textos();
      expect(t).toContain('•  Código: LOT-1');
      expect(t).toContain('•  Tambo (ID): 3');
      expect(t).toContain('•  Divergencia: Sí');
      expect(t).toContain('•  tags: a, {"b":1}');
      expect(t).toContain('•  obj: {"x":1}');
      expect(t).toContain('•  campoRaro: 5');
      expect(t).toContain('•  Parámetros:');
      expect(t).toContain('   -  PH: 6.5');
      expect(t.some((x) => x.includes('Proveedor (ID)'))).toBe(false);
      expect(t.some((x) => x.includes('loteProduccionId'))).toBe(false);
      expect(t.some((x) => x.includes('vacio:'))).toBe(false);
      expect(t.some((x) => x.includes('nulo:'))).toBe(false);
      expect(t.some((x) => x.includes('indefinido:'))).toBe(false);
    });

    it('no imprime "Parámetros:" si el array no tiene ítems válidos', async () => {
      await build([
        evento(TipoEventoTrazabilidad.CLASIFICACION, { parametrosUtilizados: [{ x: 1 }] }),
      ]);

      expect(textos().some((x) => x.includes('Parámetros:'))).toBe(false);
    });

    it('si "parametros" no es un array, lo trata como un campo común', async () => {
      await build([evento(TipoEventoTrazabilidad.RECEPCION, { parametros: 'texto' })]);

      expect(textos()).toContain('•  parametros: texto');
    });
  });

  describe('paginación y cierre', () => {
    it('agrega páginas cuando hay muchos eventos y numera todas', async () => {
      const addPageSpy = jest.spyOn(PDFDocument.prototype, 'addPage');
      const eventos = Array.from({ length: 60 }, () =>
        evento(
          TipoEventoTrazabilidad.RECEPCION,
          { codigo: 'LOT-1' },
          { descripcion: 'texto largo '.repeat(30) },
        ),
      );

      const buffer = await build(eventos);

      expect(esPdf(buffer)).toBe(true);
      expect(addPageSpy.mock.calls.length).toBeGreaterThan(1);
      expect(textos().some((t) => /^Página 1 de \d+$/.test(t))).toBe(true);
      expect(textos().some((t) => /^Página 2 de \d+$/.test(t))).toBe(true);
    });

    it('imprime la firma digital al final', async () => {
      await build([evento(TipoEventoTrazabilidad.RECEPCION)]);

      expect(textos()).toContain('Firma digital del sistema');
      expect(textos()).toContain('a'.repeat(64));
    });
  });
});