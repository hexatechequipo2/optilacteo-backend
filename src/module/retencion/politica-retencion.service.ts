import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { POLITICA_RETENCION_REPOSITORY } from './repository/politica-retencion.repository.interface';
import type { IPoliticaRetencionRepository } from './repository/politica-retencion.repository.interface';
import {
  PoliticaRetencion,
  RETENCION_MESES_MINIMO,
} from './entities/politica-retencion.entity';
import { UpdatePoliticaRetencionDto } from './dto/update-politica-retencion.dto';
import { PoliticaRetencionResponseDto } from './dto/politica-retencion-response.dto';

const DIAS_AVISO_DEFAULT = 30;

@Injectable()
export class PoliticaRetencionService {
  constructor(
    @Inject(POLITICA_RETENCION_REPOSITORY)
    private readonly repository: IPoliticaRetencionRepository,
  ) {}

  // AC2: sin fila propia, la empresa igual queda cubierta por el mínimo
  // legal por default, sin que el admin tenga que hacer nada.
  async getConfig(empresaId: number): Promise<PoliticaRetencionResponseDto> {
    const config = await this.repository.findByEmpresa(empresaId);
    if (!config) {
      return {
        id: 0,
        empresaId,
        retencionMeses: RETENCION_MESES_MINIMO,
        diasAvisoVencimiento: DIAS_AVISO_DEFAULT,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      };
    }
    return this.toResponse(config);
  }

  // Uso interno (guard y jobs): valor numérico plano, sin envoltorio DTO.
  async getRetencionMeses(empresaId: number): Promise<number> {
    const config = await this.repository.findByEmpresa(empresaId);
    return config?.retencionMeses ?? RETENCION_MESES_MINIMO;
  }

  async getDiasAviso(empresaId: number): Promise<number> {
    const config = await this.repository.findByEmpresa(empresaId);
    return config?.diasAvisoVencimiento ?? DIAS_AVISO_DEFAULT;
  }

  async update(
    empresaId: number,
    dto: UpdatePoliticaRetencionDto,
  ): Promise<PoliticaRetencionResponseDto> {
    // AC4: segunda barrera server-side, además del @Min del DTO. Aplica
    // incluso si en el futuro alguien llama al service salteando el DTO.
    if (dto.retencionMeses < RETENCION_MESES_MINIMO) {
      throw new ConflictException(
        `La retención no puede ser menor a ${RETENCION_MESES_MINIMO} meses (requisito SENASA/CAA)`,
      );
    }

    let config = await this.repository.findByEmpresa(empresaId);

    if (!config) {
      config = this.repository.create({
        empresaId,
        retencionMeses: dto.retencionMeses,
        diasAvisoVencimiento: dto.diasAvisoVencimiento ?? DIAS_AVISO_DEFAULT,
      });
    } else {
      config.retencionMeses = dto.retencionMeses;
      if (dto.diasAvisoVencimiento !== undefined) {
        config.diasAvisoVencimiento = dto.diasAvisoVencimiento;
      }
    }

    const saved = await this.repository.save(config);
    return this.toResponse(saved);
  }

  private toResponse(entity: PoliticaRetencion): PoliticaRetencionResponseDto {
    return {
      id: entity.id,
      empresaId: entity.empresaId,
      retencionMeses: entity.retencionMeses,
      diasAvisoVencimiento: entity.diasAvisoVencimiento,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}