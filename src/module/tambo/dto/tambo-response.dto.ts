import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TamboResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nombre!: string;

  @ApiPropertyOptional({ nullable: true })
  ubicacion?: string | null;

  @ApiProperty()
  activo!: boolean;

  @ApiProperty()
  empresaId!: number;

  @ApiProperty()
  proveedorId!: number;

  @ApiProperty()
  createdAt!: Date;
}