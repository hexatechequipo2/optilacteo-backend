import { ApiProperty } from '@nestjs/swagger';

export class PlcConfigResponseDto {
  @ApiProperty({ nullable: true })
  url!: string | null;

  @ApiProperty({
    description:
      'Indica si la empresa tiene sensores digitales/analógicos que dependen de esta configuración',
  })
  requierePlc!: boolean;
}

export class TestConnectionResponseDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty()
  mensaje!: string;
}