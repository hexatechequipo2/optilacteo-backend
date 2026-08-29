import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class TestConnectionDto {
  @ApiProperty({
    description: 'URL a probar antes de guardarla',
    example: 'http://192.168.1.50:8080/api/lecturas',
  })
  @IsUrl(
    {
      require_tld: false,
      require_protocol: true,
      protocols: ['http', 'https'],
    },
    { message: 'La URL del PLC no tiene un formato válido' },
  )
  url!: string;
}
