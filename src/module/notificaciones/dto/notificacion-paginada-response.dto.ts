import { ApiProperty } from '@nestjs/swagger';
import { NotificacionResponseDto } from './notificacion-response.dto';

export class NotificacionPaginadaResponseDto {
  @ApiProperty({ type: [NotificacionResponseDto] })
  data!: NotificacionResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}