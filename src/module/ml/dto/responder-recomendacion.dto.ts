import { IsBoolean, IsInt, IsString, MinLength, ValidateIf } from 'class-validator';

// Mínimo de caracteres exigido por HU-37 AC2. Ajustar si el equipo definió
// otro valor.
const JUSTIFICACION_MIN_LENGTH = 20;

export class ResponderRecomendacionDto {
  @IsBoolean()
  aceptada!: boolean;

  // Requerido solo al rechazar: si se acepta, el destino real se toma
  // automáticamente del destino recomendado (ver MlService.responderRecomendacion).
  @ValidateIf((o: ResponderRecomendacionDto) => o.aceptada === false)
  @IsInt()
  destinoRealId?: number;

  // HU-37 AC1/AC2: obligatoria cuando se rechaza (aceptada=false). OJO:
  // esto NO garantiza por sí solo que sea una divergencia real — el
  // service (ml.service.ts) es quien valida que destinoRealId sea
  // distinto del destino recomendado.
  @ValidateIf((o: ResponderRecomendacionDto) => o.aceptada === false)
  @IsString()
  @MinLength(JUSTIFICACION_MIN_LENGTH, {
    message: `La justificación debe tener al menos ${JUSTIFICACION_MIN_LENGTH} caracteres`,
  })
  justificacion?: string;
}