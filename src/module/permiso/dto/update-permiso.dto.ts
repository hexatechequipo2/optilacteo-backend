import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsBoolean } from 'class-validator';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

export class UpdatePermisoDto {
  @ApiProperty({ example: 'dashboard', enum: ModuloSistema })
  @IsEnum(ModuloSistema)
  modulo!: ModuloSistema;

  @ApiProperty({ example: true })
  @IsBoolean()
  canRead!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canWrite!: boolean;
}