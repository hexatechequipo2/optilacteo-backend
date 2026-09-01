import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class UpdatePlcConfigDto {
  @ApiProperty({
    description: 'URL del endpoint del PLC/gateway industrial de la empresa',
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
