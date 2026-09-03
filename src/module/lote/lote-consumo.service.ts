import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TenantContext } from '../../common/types/tenant-context.type';
import type { ILoteRepository } from '../lote/repository/lote-repository.interface';
import { LOTE_REPOSITORY } from '../lote/repository/lote-repository.interface';
import { EstadoLote } from '../lote/enums/estado-lote.enum';
import { LoteProduccion } from '../lote/entities/lote-produccion.entity';
import { LoteConsumo } from '../lote/entities/lote-consumo.entity';
import { LoteConsumoParametro } from '../lote/entities/lote-consumo-parametro.entity';
import { CreateLoteConsumoDto } from '../lote/dto/create-lote-consumo.dto';
import {
  LoteConsumoResponseDto,
  LoteProduccionResponseDto,
} from '../lote/dto/lote-consumo-response.dto';
import { LoteConsumoMapper } from '../lote/mappers/lote-consumo.mapper';
import { MlService } from '../ml/ml.service';
import { RecomendacionMapper } from '../ml/mappers/recomendacion.mapper';
import { RecomendacionResponseDto } from '../ml/dto/recomendacion-response.dto';

@Injectable()
export class LoteConsumoService {
  constructor(
    @Inject(LOTE_REPOSITORY)
    private readonly loteRepository: ILoteRepository,
    @InjectRepository(LoteProduccion)
    private readonly loteProduccionRepository: Repository<LoteProduccion>,
    @InjectRepository(LoteConsumo)
    private readonly loteConsumoRepository: Repository<LoteConsumo>,
    private readonly mlService: MlService,
  ) {}

  // HU-68 (criterios 1, 2, 3, y caso "falla": consumir más de lo disponible)
  // + HU-49 AC1: cada consumo con parámetros nuevos dispara su propia
  // recomendación.
  async registrarConsumo(
    loteIngresoId: number,
    dto: CreateLoteConsumoDto,
    usuarioId: number,
    tenant: TenantContext,
  ): Promise<LoteConsumoResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    const lote = await this.loteRepository.findById(loteIngresoId, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${loteIngresoId} no encontrado`);
    }

    if (
      lote.estado === EstadoLote.FINALIZADO ||
      lote.estado === EstadoLote.RECHAZADO
    ) {
      throw new BadRequestException(
        `El lote ${loteIngresoId} está en estado ${lote.estado} y no admite nuevos consumos`,
      );
    }

    if (lote.cantidad == null || lote.cantidadDisponible == null) {
      throw new BadRequestException(
        `El lote ${loteIngresoId} no tiene una cantidad total registrada, no admite consumo parcial`,
      );
    }

    const disponible = Number(lote.cantidadDisponible);
    if (dto.cantidad > disponible) {
      throw new BadRequestException(
        `La cantidad solicitada (${dto.cantidad}) supera el saldo disponible del lote (${disponible})`,
      );
    }

    // Criterio 3: el primer consumo ya trae parámetros de calidad del
    // create() original del lote. Cualquier consumo posterior que use el
    // remanente necesita un nuevo registro de parámetros.
    const cantidadConsumosPrevios = await this.loteConsumoRepository.count({
      where: { loteIngresoId, empresaId },
    });
    const esPrimerConsumo = cantidadConsumosPrevios === 0;
    if (!esPrimerConsumo && (!dto.parametros || dto.parametros.length === 0)) {
      throw new BadRequestException(
        'Se requiere un nuevo registro de parámetros de calidad para usar el remanente de este lote',
      );
    }

    const loteProduccion = await this.resolverLoteProduccion(
      dto.loteProduccionId,
      empresaId,
    );

    const parametros = (dto.parametros ?? []).map((p) => {
      const entidad = new LoteConsumoParametro();
      entidad.parametro = p.parametro;
      entidad.valor = p.valor;
      return entidad;
    });

    let consumo = this.loteConsumoRepository.create({
      loteIngresoId: lote.id,
      loteProduccionId: loteProduccion.id,
      cantidad: dto.cantidad,
      empresaId,
      usuarioId,
      parametros,
    });
    consumo = await this.loteConsumoRepository.save(consumo);

    // Criterio 1 y 2: actualizar saldo remanente y estado del lote de ingreso.
    lote.cantidadDisponible = disponible - dto.cantidad;
    if (lote.estado === EstadoLote.REGISTRADO) {
      lote.estado = EstadoLote.EN_PROCESO;
    }
    if (lote.cantidadDisponible <= 0) {
      lote.cantidadDisponible = 0;
      lote.estado = EstadoLote.FINALIZADO;
    }
    await this.loteRepository.save(lote);

    // HU-49 AC1: solo se genera cuando hay parámetros nuevos en este
    // consumo (2do en adelante). El 1er consumo reutiliza los del alta
    // del lote y ya tiene su propia recomendación generada en LoteService.create().
    let recomendacion: RecomendacionResponseDto | null = null;
    if (dto.parametros && dto.parametros.length > 0) {
      const recomendacionEntity = await this.mlService.generarRecomendacion({
        empresaId,
        loteId: lote.id,
        loteConsumoId: consumo.id,
        parametros: dto.parametros.map((p) => ({
          parametro: p.parametro,
          valor: p.valor,
        })),
      });
      recomendacion = recomendacionEntity
        ? RecomendacionMapper.toResponseDto(recomendacionEntity)
        : null;
    }

    return {
      ...LoteConsumoMapper.toResponseDto(consumo, loteProduccion.codigo),
      recomendacion,
    };
  }

  // Criterio 2 y 4: consulta del saldo remanente y del historial de consumos.
  async historial(
    loteIngresoId: number,
    tenant: TenantContext,
  ): Promise<LoteConsumoResponseDto[]> {
    const empresaId = this.resolveEmpresaId(tenant);

    const lote = await this.loteRepository.findById(loteIngresoId, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${loteIngresoId} no encontrado`);
    }

    const consumos = await this.loteConsumoRepository.find({
      where: { loteIngresoId, empresaId },
      relations: { parametros: true, loteProduccion: true },
      order: { createdAt: 'ASC' },
    });

    return LoteConsumoMapper.toResponseDtoList(consumos);
  }

  // Alimenta el selector "lote de producción existente" del frontend.
  async findLotesProduccion(
    tenant: TenantContext,
  ): Promise<LoteProduccionResponseDto[]> {
    const empresaId = this.resolveEmpresaId(tenant);
    const lotes = await this.loteProduccionRepository.find({
      where: { empresaId },
      order: { createdAt: 'DESC' },
    });
    return lotes.map((lp) => ({
      id: lp.id,
      codigo: lp.codigo,
      createdAt: lp.createdAt,
    }));
  }

  private async resolverLoteProduccion(
    loteProduccionId: number | undefined,
    empresaId: number,
  ): Promise<LoteProduccion> {
    if (loteProduccionId) {
      const existente = await this.loteProduccionRepository.findOne({
        where: { id: loteProduccionId, empresaId },
      });
      if (!existente) {
        throw new NotFoundException(
          `Lote de producción ${loteProduccionId} no encontrado`,
        );
      }
      return existente;
    }

    const codigo = await this.generarCodigoProduccion(empresaId);
    const nuevo = this.loteProduccionRepository.create({ empresaId, codigo });
    return this.loteProduccionRepository.save(nuevo);
  }

  private async generarCodigoProduccion(empresaId: number): Promise<string> {
    const total = await this.loteProduccionRepository.count({
      where: { empresaId },
    });
    const secuencia = (total + 1).toString().padStart(5, '0');
    return `PROD-${empresaId}-${secuencia}`;
  }

  private resolveEmpresaId(tenant: TenantContext): number {
    if (tenant.empresaId == null) {
      throw new BadRequestException(
        'No se pudo determinar la empresa del usuario autenticado',
      );
    }
    return tenant.empresaId;
  }
}