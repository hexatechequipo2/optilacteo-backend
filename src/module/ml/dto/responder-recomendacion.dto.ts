import { IsBoolean, IsString } from 'class-validator';

export class ResponderRecomendacionDto {
  @IsBoolean()
  aceptada!: boolean;

  @IsString()
  destinoReal!: string;
}
