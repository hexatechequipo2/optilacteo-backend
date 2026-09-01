import { ConfiguracionNotificacionNivel } from '../entities/configuracion-notificacion-nivel.entity';
import { ConfiguracionNotificacionResponseDto } from '../dto/configuracion-notificacion-response.dto';

export class ConfiguracionNotificacionMapper {
  static toResponse(
    config: ConfiguracionNotificacionNivel,
  ): ConfiguracionNotificacionResponseDto {
    return {
      id: config.id,
      nivelAlerta: config.nivelAlerta,
      rolId: config.rolId ?? null,
      rol: config.rol ? { id: config.rol.id, nombre: config.rol.nombre } : null,
      usuarioId: config.usuarioId ?? null,
      usuario: config.usuario
        ? {
            id: config.usuario.id,
            name: config.usuario.name,
            email: config.usuario.email,
          }
        : null,
      empresaId: config.empresaId,
      createdAt: config.createdAt,
    };
  }

  static toResponseList(
    configs: ConfiguracionNotificacionNivel[],
  ): ConfiguracionNotificacionResponseDto[] {
    return configs.map((c) => this.toResponse(c));
  }
}
