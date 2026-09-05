import { ApiProperty } from '@nestjs/swagger';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import type { ConfianzaParseoDictado } from '../parser/dictado-parametros.types';

export class ParametroDictadoResponseDto {
  @ApiProperty({ enum: Parametro })
  parametro!: Parametro;

  @ApiProperty()
  valor!: number;

  @ApiProperty({
    enum: ['alta', 'media'],
    description: 'Confianza del parseo del texto, no de la medición en sí.',
  })
  confianza!: ConfianzaParseoDictado;

  @ApiProperty({
    description:
      'Plausibilidad física global (RANGOS_FISICOS), independiente de la empresa — ej: un pH de 47 es un error de transcripción.',
  })
  fueraDeRangoFisico!: boolean;

  @ApiProperty({
    nullable: true,
    description:
      'Fuera del umbral (umbralMin/umbralMax) configurado por la empresa para este parámetro y el tipo de materia prima del lote. null si la empresa no tiene un umbral configurado para esa combinación.',
  })
  fueraDeUmbralEmpresa!: boolean | null;

  @ApiProperty({
    description:
      'Fragmento del texto original del que se extrajo este parámetro.',
  })
  textoOriginal!: string;
}

export class FragmentoNoReconocidoResponseDto {
  @ApiProperty()
  texto!: string;

  @ApiProperty({
    enum: ['sin_valor_asociado', 'texto_no_reconocido'],
    description:
      'sin_valor_asociado: se nombró un parámetro conocido pero no se encontró un valor. texto_no_reconocido: el fragmento no matchea ningún parámetro del vocabulario.',
  })
  motivo!: 'sin_valor_asociado' | 'texto_no_reconocido';
}

export class ParsearDictadoResponseDto {
  @ApiProperty({ type: [ParametroDictadoResponseDto] })
  parametros!: ParametroDictadoResponseDto[];

  @ApiProperty({ type: [FragmentoNoReconocidoResponseDto] })
  noReconocido!: FragmentoNoReconocidoResponseDto[];

  @ApiProperty({
    enum: Parametro,
    isArray: true,
    description:
      'Obligatorios para el tipo de materia prima del lote (ConfiguracionParametro) que no llegaron con un valor reconocido.',
  })
  obligatoriosFaltantes!: Parametro[];

  @ApiProperty()
  textoOriginal!: string;
}
