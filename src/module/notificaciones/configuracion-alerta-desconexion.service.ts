import { Inject, Injectable } from '@nestjs/common';
import type { IConfiguracionAlertaDesconexionRepository } from './repository/configuracion-alerta-desconexion.repository.interface';
import { CONFIGURACION_ALERTA_DESCONEXION_REPOSITORY } from './repository/configuracion-alerta-desconexion.repository.interface';
import { ConfiguracionAlertaDesconexion } from './entities/configuracion-alerta-desconexion.entity';

const UMBRAL_DEFAULT_MINUTOS = 15;

@Injectable()
export class ConfiguracionAlertaDesconexionService {
  constructor(
    @Inject(CONFIGURACION_ALERTA_DESCONEXION_REPOSITORY)
    private readonly repository: IConfiguracionAlertaDesconexionRepository,
  ) {}

  async obtenerOCrear(empresaId: number): Promise<ConfiguracionAlertaDesconexion> {
    const existente = await this.repository.findByEmpresa(empresaId);
    if (existente) return existente;

    const nueva = new ConfiguracionAlertaDesconexion();
    nueva.empresaId = empresaId;
    nueva.umbralMinutos = UMBRAL_DEFAULT_MINUTOS;
    return this.repository.save(nueva);
  }

  async actualizar(
    empresaId: number,
    umbralMinutos: number,
  ): Promise<ConfiguracionAlertaDesconexion> {
    const config = await this.obtenerOCrear(empresaId);
    config.umbralMinutos = umbralMinutos;
    return this.repository.save(config);
  }
}