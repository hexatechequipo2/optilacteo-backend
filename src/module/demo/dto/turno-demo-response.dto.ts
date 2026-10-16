import { ApiProperty } from '@nestjs/swagger';

export class TurnoDemoResponseDto {
  @ApiProperty()
  loteId!: number;
}
