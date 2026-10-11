import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AuditLog } from '../audit/entity/audit-log.entity';
import { Lote } from '../lote/entities/lote.entity';
import { MedicionManualLote } from '../medicion-manual/entities/medicion-manual-lote.entity';
import { SensorLectura } from '../lectura-sensor/entities/sensor-lectura.entity';
import { PoliticaRetencionService } from './politica-retencion.service';
import { RegistroPorVencerDto } from './dto/registro-por-vencer.dto';

// Forma mínima que necesitamos de cada entidad para poder tratarlas de
// forma genérica (todas la cumplen: id numérico, empresaId, createdAt).
interface RegistroRetenible {
  id: number;
  empresaId: number;
  createdAt: Date;
}

interface EntidadRetenible {
  nombre: string;
  repo: Repository<RegistroRetenible>;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

@Injectable()
export class RetencionArchivadoService {
  private readonly logger = new Logger(RetencionArchivadoService.name);
  private readonly s3 = new S3Client({});
  private readonly bucket =
    process.env.RETENTION_ARCHIVE_BUCKET ?? 'optilacteo-retencion-archivo';

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
    @InjectRepository(MedicionManualLote)
    private readonly medicionRepo: Repository<MedicionManualLote>,
    @InjectRepository(SensorLectura)
    private readonly lecturaRepo: Repository<SensorLectura>,
    private readonly politicaRetencionService: PoliticaRetencionService,
  ) {}

  private getEntidades(): EntidadRetenible[] {
    return [
      { nombre: 'audit_log', repo: this.auditLogRepo as unknown as Repository<RegistroRetenible> },
      { nombre: 'lotes', repo: this.loteRepo as unknown as Repository<RegistroRetenible> },
      {
        nombre: 'mediciones_manuales_lote',
        repo: this.medicionRepo as unknown as Repository<RegistroRetenible>,
      },
      {
        nombre: 'sensor_lecturas',
        repo: this.lecturaRepo as unknown as Repository<RegistroRetenible>,
      },
    ];
  }

  // AC3: pasados los N meses configurados (mínimo 24), exporta a CSV, sube
  // a S3 y recién ahí borra de la tabla operativa. Si falla la subida, no
  // se borra nada: se prefiere conservar el dato de más a perderlo.
  // Usa QueryBuilder (no .find()) para no arrastrar relaciones eager
  // (ej. Lote.parametros) al CSV.
  async archivarVencidos(empresaId: number): Promise<void> {
    const retencionMeses =
      await this.politicaRetencionService.getRetencionMeses(empresaId);
    const limite = this.restarMeses(new Date(), retencionMeses);

    for (const entidad of this.getEntidades()) {
      const vencidos = await entidad.repo
        .createQueryBuilder('r')
        .where('r.empresaId = :empresaId', { empresaId })
        .andWhere('r.createdAt < :limite', { limite })
        .getMany();

      if (vencidos.length === 0) continue;

      const csv = this.toCsv(vencidos as unknown as Record<string, unknown>[]);
      const key = `retencion/${entidad.nombre}/empresa-${empresaId}/${Date.now()}.csv`;

      try {
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: csv,
            ContentType: 'text/csv',
          }),
        );
      } catch (error) {
        this.logger.error(
          `Fallo al archivar ${entidad.nombre} (empresa ${empresaId}) a S3, no se elimina nada: ${
            (error as Error).message
          }`,
        );
        continue;
      }

      const ids = vencidos.map((r) => r.id);
      await entidad.repo.delete(ids);

      this.logger.log(
        `Archivados y eliminados ${ids.length} registros de ${entidad.nombre} (empresa ${empresaId}) -> s3://${this.bucket}/${key}`,
      );
    }
  }

  // AC3/AC4 (variante GET manual): registros cuyo vencimiento cae dentro de
  // la ventana de aviso configurada (default 30 días).
  //
  // vencimiento = createdAt + retencionMeses
  // "próximo a vencer" <=>  hoy <= vencimiento <= hoy + diasAviso
  // <=>  (hoy - retencionMeses) <= createdAt <= (hoy + diasAviso - retencionMeses)
  async findProximosAVencer(
    empresaId: number,
  ): Promise<{ retencionMeses: number; diasAvisoVencimiento: number; registros: RegistroPorVencerDto[] }> {
    const retencionMeses =
      await this.politicaRetencionService.getRetencionMeses(empresaId);
    const diasAviso = await this.politicaRetencionService.getDiasAviso(empresaId);

    const hoy = new Date();
    const limiteInferior = this.restarMeses(hoy, retencionMeses);
    const limiteSuperior = this.restarMeses(
      new Date(hoy.getTime() + diasAviso * MS_POR_DIA),
      retencionMeses,
    );

    const registros: RegistroPorVencerDto[] = [];

    for (const entidad of this.getEntidades()) {
      const proximos = await entidad.repo.find({
        where: {
          empresaId,
          createdAt: Between(limiteInferior, limiteSuperior),
        } as any,
        order: { createdAt: 'ASC' } as any,
      });

      for (const r of proximos) {
        const fechaVencimiento = this.sumarMeses(r.createdAt, retencionMeses);
        registros.push({
          entidad: entidad.nombre,
          id: r.id,
          createdAt: r.createdAt,
          fechaVencimiento,
          diasRestantes: Math.ceil(
            (fechaVencimiento.getTime() - hoy.getTime()) / MS_POR_DIA,
          ),
        });
      }
    }

    registros.sort((a, b) => a.diasRestantes - b.diasRestantes);

    return { retencionMeses, diasAvisoVencimiento: diasAviso, registros };
  }

  private toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);

    const escape = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str =
        value instanceof Date
          ? value.toISOString()
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
      const escaped = str.replace(/"/g, '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    };

    const lines = rows.map((row) =>
      headers.map((h) => escape(row[h])).join(','),
    );

    return [headers.join(','), ...lines].join('\n');
  }

  private restarMeses(fecha: Date, meses: number): Date {
    const resultado = new Date(fecha);
    resultado.setMonth(resultado.getMonth() - meses);
    return resultado;
  }

  private sumarMeses(fecha: Date, meses: number): Date {
    const resultado = new Date(fecha);
    resultado.setMonth(resultado.getMonth() + meses);
    return resultado;
  }
}