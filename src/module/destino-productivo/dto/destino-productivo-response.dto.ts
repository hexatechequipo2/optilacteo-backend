import { ApiProperty } from '@nestjs/swagger';

export class DestinoProductivoResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nombre!: string;
}
