import { IsBoolean, IsInt, ValidateIf } from 'class-validator';

export class ResponderRecomendacionDto {
  @IsBoolean()
  aceptada!: boolean;

  // Requerido solo al rechazar: si se acepta, el destino real se toma
  // automáticamente del destino recomendado (ver MlService.responderRecomendacion).
  @ValidateIf((o: ResponderRecomendacionDto) => o.aceptada === false)
  @IsInt()
  destinoRealId?: number;
}