import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateConfigParametroDto } from './create-config-parametro.dto';

export class UpdateConfigParametroDto extends PartialType(
  OmitType(CreateConfigParametroDto, ['parametro', 'tipoMateriaPrima'] as const),
) {}