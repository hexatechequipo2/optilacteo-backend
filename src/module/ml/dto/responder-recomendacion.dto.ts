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

  // HU-37 AC1/AC2: obligatoria solo cuando el operador elige un destino
  // distinto al recomendado (o sea, cuando rechaza la recomendación).
  @ValidateIf((o: ResponderRecomendacionDto) => o.aceptada === false)
  @IsString()
  @MinLength(JUSTIFICACION_MIN_LENGTH, {
    message: `La justificación debe tener al menos ${JUSTIFICACION_MIN_LENGTH} caracteres`,
  })
  justificacion?: string;
}