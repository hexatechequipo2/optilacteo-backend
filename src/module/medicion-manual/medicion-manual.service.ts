import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import type { ILoteRepository } from '../lote/repository/lote-repository.interface';
import { LOTE_REPOSITORY } from '../lote/repository/lote-repository.interface';
import type { ISensorLoteHistorialRepository } from '../sensor/repository/sensor-lote-historial.repository.interface';
import { SENSOR_LOTE_HISTORIAL_REPOSITORY } from '../sensor/repository/sensor-lote-historial.repository.interface';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { CreateMedicionManualLoteDto } from './dto/create-medicion-manual-lote.dto';
import { HistorialMedicionManualFilterQueryDto } from './dto/historial-medicion-manual-filter-query.dto';
import {
  MedicionManualLoteResponseDto,
  HistorialMedicionManualResponseDto,
} from './dto/medicion-manual-lote-response.dto';
import type { IMedicionManualLoteRepository } from './repository/medicion-manual-lote.repository.interface';
import { MEDICION_MANUAL_LOTE_REPOSITORY } from './repository/medicion-manual-lote.repository.interface';
import { MedicionManualMapper } from './mappers/medicion-manual.mapper';
// --- nuevo: HU-21 ---
import { ClasificacionLoteService } from '../lote/clasificacion-lote.service';
// --- nuevo: HU-50 ---
import { AnomaliaService } from '../anomalia/anomalia.service';

const VENTANA_HISTORICO_ANOMALIA = 10;

@Injectable()
export class MedicionManualService {
  private readonly logger = new Logger(MedicionManualService.name);

  constructor(
    @Inject(LOTE_REPOSITORY)
    private readonly loteRepository: ILoteRepository,
    @InjectRepository(ConfiguracionParametro)
    private readonly configParametroRepository: Repository<ConfiguracionParametro>,
    @Inject(MEDICION_MANUAL_LOTE_REPOSITORY)
    private readonly medicionRepository: IMedicionManualLoteRepository,
    @Inject(SENSOR_LOTE_HISTORIAL_REPOSITORY)
    private readonly sensorLoteHistorialRepository: ISensorLoteHistorialRepository,
    // --- nuevo: HU-21 ---
    private readonly clasificacionLoteService: ClasificacionLoteService,
    // --- nuevo: HU-50 ---
    private readonly anomaliaService: AnomaliaService,
  ) {}

  async registrar(
    loteId: number,
    dto: CreateMedicionManualLoteDto,
    usuarioId: number,
    tenant: TenantContext,
  ): Promise<MedicionManualLoteResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    // AC8 + AC14: lote inexistente o de otra empresa -> 404.
    const lote = await this.loteRepository.findById(loteId, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${loteId} no encontrado`);
    }

    // HU-20 es respaldo TOTAL: solo si el lote no tiene NINGÚN sensor
    // asociado hoy. Si tiene uno (sea cual sea su estado), corresponde
    // HU-15 (ingresarManual por sensor puntual en falla/inactivo).
    const sensoresAsociados =
      await this.sensorLoteHistorialRepository.findSensoresActualesDeLote(
        loteId,
        empresaId,
      );
    if (sensoresAsociados.length > 0) {
      throw new BadRequestException(
        `El lote ${loteId} tiene sensores asociados. Para reportar un valor cuando ` +
          `un sensor puntual no está disponible, use el ingreso manual por sensor (HU-15).`,
      );
    }

    // AC3: parámetros obligatorios según el tipo de materia prima elegido.
    const configs = await this.configParametroRepository.find({
      where: { empresaId, tipoMateriaPrima: dto.tipoMateriaPrima },
    });
    const obligatorios = new Set(configs.map((c) => c.parametro));
    const enviados = new Set(dto.parametros.map((p) => p.parametro));

    const faltantes = [...obligatorios].filter((p) => !enviados.has(p));
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Faltan parámetros obligatorios para '${dto.tipoMateriaPrima}': ${faltantes.join(', ')}`,
      );
    }

    // AC5/6: fuera de rango se ACEPTA y se marca, no se rechaza.
    const nuevas = MedicionManualMapper.toEntities(
      dto,
      lote.id,
      empresaId,
      usuarioId,
    );
    const creadas = await this.medicionRepository.create(nuevas);

    const mapaConfig = new Map(
      configs.map((c) => [`${c.parametro}|${c.tipoMateriaPrima}`, c]),
    );
    const mediciones = MedicionManualMapper.toResponseItemList(
      creadas,
      mapaConfig,
    );

    // HU-21: dispara la clasificación automática si ya están todos los
    // parámetros obligatorios. Best-effort: no debe romper el registro.
    this.clasificacionLoteService
      .evaluarYClasificar(lote.id, empresaId)
      .catch((err) =>
        this.logger.error(`Error al clasificar lote ${lote.id}: ${err}`),
      );

    // HU-50: por cada parámetro cargado, consulta al microservicio ML si
    // el valor es una anomalía respecto al histórico reciente del mismo
    // lote+parámetro. Best-effort: no debe romper el registro de la
    // medición si el microservicio falla o está caído.
    for (const medicion of creadas) {
      this.medicionRepository
        .findUltimosValores(
          lote.id,
          medicion.parametro,
          empresaId,
          VENTANA_HISTORICO_ANOMALIA,
        )
        .then((historico) =>
          this.anomaliaService.evaluarAnomalia({
            empresaId,
            loteId: lote.id,
            loteCodigo: lote.codigo,
            parametro: medicion.parametro,
            valor: Number(medicion.valor),
            historicoReciente: historico,
          }),
        )
        .catch((err) =>
          this.logger.error(
            `Error al evaluar anomalía para lote ${lote.id}, parámetro ` +
              `${medicion.parametro}: ${err}`,
          ),
        );
    }

    return {
      loteId: lote.id,
      tipoMateriaPrima: dto.tipoMateriaPrima,
      usuarioId,
      mediciones,
    };
  }

  async historial(
    loteId: number,
    query: HistorialMedicionManualFilterQueryDto,
    tenant: TenantContext,
  ): Promise<HistorialMedicionManualResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    const lote = await this.loteRepository.findById(loteId, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${loteId} no encontrado`);
    }

    const fechaInicio = query.fechaInicio
      ? new Date(query.fechaInicio)
      : undefined;
    const fechaFin = this.normalizarFechaFin(query.fechaFin);

    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin no puede ser anterior a la fecha de inicio.',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [mediciones, total] =
      await this.medicionRepository.findByLotePaginado(
        { loteId, fechaInicio, fechaFin, page, limit },
        empresaId,
      );

    const configs = await this.configParametroRepository.find({
      where: { empresaId },
    });
    const mapaConfig = new Map(
      configs.map((c) => [`${c.parametro}|${c.tipoMateriaPrima}`, c]),
    );
    const data = MedicionManualMapper.toResponseItemList(
      mediciones,
      mapaConfig,
    );

    return { data, total, page, limit };
  }

  private resolveEmpresaId(tenant: TenantContext): number {
    if (tenant.empresaId == null) {
      throw new BadRequestException(
        'No se pudo determinar la empresa del usuario autenticado',
      );
    }
    return tenant.empresaId;
  }

  private normalizarFechaFin(fechaFin?: string): Date | undefined {
    if (!fechaFin) return undefined;
    const fecha = new Date(fechaFin);
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
      fecha.setUTCHours(23, 59, 59, 999);
    }
    return fecha;
  }
}