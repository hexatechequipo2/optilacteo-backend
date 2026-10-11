import { ForbiddenException, Injectable } from '@nestjs/common';
import { PoliticaRetencionService } from './politica-retencion.service';

// HU-48 AC1: "Los datos no pueden ser eliminados del sistema antes de
// cumplirse 24 meses desde su creación... incluso para el administrador".
//
// Hoy ninguno de los services de las 4 entidades en alcance
// (AuditLogService, LoteService, MedicionManualLoteService,
// SensorLecturaService) expone un método delete/remove, así que el AC ya
// se cumple por omisión. Este service es la barrera explícita: cualquier
// delete que se agregue a futuro sobre esas entidades DEBE llamar primero
// a assertPuedeEliminar. No depende del rol de quien llama.
@Injectable()
export class RetentionGuardService {
  constructor(
    private readonly politicaRetencionService: PoliticaRetencionService,
  ) {}

  async assertPuedeEliminar(
    empresaId: number,
    entidad: string,
    createdAt: Date,
  ): Promise<void> {
    const retencionMeses =
      await this.politicaRetencionService.getRetencionMeses(empresaId);
    const vencimiento = this.sumarMeses(createdAt, retencionMeses);

    if (vencimiento > new Date()) {
      throw new ForbiddenException(
        `No se puede eliminar este registro de ${entidad}: no cumplió el período mínimo de retención de ${retencionMeses} meses (vence el ${vencimiento
          .toISOString()
          .slice(0, 10)}).`,
      );
    }
  }

  private sumarMeses(fecha: Date, meses: number): Date {
    const resultado = new Date(fecha);
    resultado.setMonth(resultado.getMonth() + meses);
    return resultado;
  }
}