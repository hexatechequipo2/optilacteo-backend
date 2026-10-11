import { IsInt, Min } from 'class-validator';

export class AsignarRolDto {
  @IsInt() @Min(1)
  rolId!: number;
}