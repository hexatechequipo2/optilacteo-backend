import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

// HU-34 AC1/AC3: alta o cambio manual del destino productivo de un lote,
// independiente del flujo de recomendación ML (HU-49/HU-37).
export class AsignarDestinoProductivoDto {
  @ApiProperty({ example: 3, description: 'ID del DestinoProductivo a asignar' })
  @IsInt()
  @IsPositive()
  destinoProductivoId!: number;
}