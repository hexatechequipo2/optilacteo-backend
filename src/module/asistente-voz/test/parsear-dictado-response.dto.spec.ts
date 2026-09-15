import {
  ParametroDictadoResponseDto,
  FragmentoNoReconocidoResponseDto,
  ParsearDictadoResponseDto,
} from '../dto/parsear-dictado-response.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('ParsearDictadoResponseDto — Cobertura de DTOs (HU-XX)', () => {
  it('debe instanciar correctamente todas las clases DTO de respuesta', () => {
    // Arrange & Act
    const parametroDto = new ParametroDictadoResponseDto();
    parametroDto.parametro = Parametro.PH;
    parametroDto.valor = 4.5;
    parametroDto.confianza = 'alta';
    parametroDto.fueraDeRangoFisico = false;
    parametroDto.fueraDeUmbralEmpresa = null;
    parametroDto.textoOriginal = 'pH de 4.5';

    const fragmentoDto = new FragmentoNoReconocidoResponseDto();
    fragmentoDto.texto = 'sin dato';
    fragmentoDto.motivo = 'texto_no_reconocido';

    const responseDto = new ParsearDictadoResponseDto();
    responseDto.parametros = [parametroDto];
    responseDto.noReconocido = [fragmentoDto];
    responseDto.obligatoriosFaltantes = [Parametro.TEMPERATURA];
    responseDto.textoOriginal = 'pH de 4.5 sin dato';

    // Assert
    expect(parametroDto).toBeInstanceOf(ParametroDictadoResponseDto);
    expect(fragmentoDto).toBeInstanceOf(FragmentoNoReconocidoResponseDto);
    expect(responseDto).toBeInstanceOf(ParsearDictadoResponseDto);

    expect(parametroDto.parametro).toBe(Parametro.PH);
    expect(fragmentoDto.motivo).toBe('texto_no_reconocido');
    expect(responseDto.parametros.length).toBe(1);
  });
});