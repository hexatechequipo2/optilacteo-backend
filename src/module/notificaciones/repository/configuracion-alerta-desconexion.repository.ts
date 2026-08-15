import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionAlertaDesconexion } from '../entities/configuracion-alerta-desconexion.entity';
import { IConfiguracionAlertaDesconexionRepository } from './configuracion-alerta-desconexion.repository.interface';

@Injectable()
export class ConfiguracionAlertaDesconexionRepository
  implements IConfiguracionAlertaDesconexionRepository
{
  constructor(
    @InjectRepository(ConfiguracionAlertaDesconexion)
    private readonly repo: Repository<ConfiguracionAlertaDesconexion>,
  ) {}

  findByEmpresa(empresaId: number) {
    return this.repo.findOne({ where: { empresaId } });
  }

  save(config: ConfiguracionAlertaDesconexion) {
    return this.repo.save(config);
  }
}