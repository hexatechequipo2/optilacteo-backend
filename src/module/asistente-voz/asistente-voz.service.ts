import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionParametro } from '../config-parametro/entities/config-parametro.entity';
import type { ILoteRepository } from '../lote/repository/lote-repository.interface';
import { LOTE_REPOSITORY } from '../lote/repository/lote-repository.interface';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { DictadoParametrosParserService } from './parser/dictado-parametros-parser.service';
import { ParsearDictadoDto } from './dto/parsear-dictado.dto';
import { ParsearDictadoResponseDto } from './dto/parsear-dictado-response.dto';
import { AsistenteVozMapper } from './mappers/asistente-voz.mapper';

@Injectable()
export class AsistenteVozService {
  constructor(
    @Inject(LOTE_REPOSITORY)
    private readonly loteRepository: ILoteRepository,
    @InjectRepository(ConfiguracionParametro)
    private readonly configParametroRepository: Repository<ConfiguracionParametro>,
    private readonly parser: DictadoParametrosParserService,
  ) {}

  // Solo previsualiza: parsea el texto dictado y arma la estructura que la
  // pantalla de revisión necesita para mostrar valores, marcar dudosos y
  // avisar qué obligatorios faltan. No persiste nada — el registro real
  // sigue siendo MedicionManualService.registrar con el DTO ya existente.
  async parsearDictado(
    loteId: number,
    dto: ParsearDictadoDto,
    tenant: TenantContext,
  ): Promise<ParsearDictadoResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    // Mismo criterio que medicion-manual.service.ts: el lote tiene que
    // existir y pertenecer a la empresa del tenant.
    const lote = await this.loteRepository.findById(loteId, empresaId);
    if (!lote) {
      throw new NotFoundException(`Lote ${loteId} no encontrado`);
    }

    const resultadoParseo = this.parser.parsear(dto.texto);

    // Config de la empresa para el tipo de materia prima de ESTE lote: de
    // acá salen tanto los obligatorios como los umbralMin/umbralMax para
    // marcar fueraDeUmbralEmpresa — mismo query que hace el service de
    // registro manual, misma fuente de verdad.
    const configs = await this.configParametroRepository.find({
      where: { empresaId, tipoMateriaPrima: lote.materiaPrima },
    });

    return AsistenteVozMapper.aRespuesta(resultadoParseo, configs);
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
