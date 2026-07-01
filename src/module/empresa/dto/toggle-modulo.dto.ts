// NUEVO: DTO para el endpoint de activar/desactivar módulo individual

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ModuloSistema } from '../enums/modulo-sistema.enum';

export class ToggleModuloDto {
  @ApiProperty({ example: 'inventario', enum: ModuloSistema })
  @IsEnum(ModuloSistema)
  modulo!: ModuloSistema;
}