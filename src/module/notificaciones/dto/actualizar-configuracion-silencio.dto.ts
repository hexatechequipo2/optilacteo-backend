import { PartialType } from '@nestjs/swagger';
import { CrearConfiguracionSilencioDto } from './crear-configuracion-silencio.dto';

export class ActualizarConfiguracionSilencioDto extends PartialType(
  CrearConfiguracionSilencioDto,
) {}