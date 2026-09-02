import { IsBoolean, IsInt } from 'class-validator';

export class ResponderRecomendacionDto {
  @IsBoolean()
  aceptada!: boolean;

  @IsInt()
  destinoRealId!: number;
}
