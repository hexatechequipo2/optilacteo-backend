import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuditoriaUsuarioDto {
  @ApiPropertyOptional()
  userId!: number | null;

  @ApiPropertyOptional()
  userEmail!: string;

  @ApiPropertyOptional()
  fecha!: Date;
}

export class TrazabilidadEntidadDto {
  @ApiPropertyOptional({ type: AuditoriaUsuarioDto })
  creadoPor?: AuditoriaUsuarioDto;

  @ApiPropertyOptional({ type: AuditoriaUsuarioDto })
  ultimaModificacion?: AuditoriaUsuarioDto;
}
