import { Lote } from '../entities/lote.entity';
import { ComparacionHistoricaResponseDto, ParametroComparacionDto } from '../dto/comparacion-historica-response.dto';
import { ConfiguracionComparacionHistoricaDto } from '../../config-parametro/configuracion-comparacion-historica.service';

export class ComparacionHistoricaMapper {
  static build(
    lote: Lote,
    historicos: Lote[],
    config: ConfiguracionComparacionHistoricaDto,
  ): ComparacionHistoricaResponseDto {
    const sumasPorParametro = new Map<string, { suma: number; cantidad: number }>();
    for (const historico of historicos) {
      for (const p of historico.parametros) {
        const actual = sumasPorParametro.get(p.parametro) ?? { suma: 0, cantidad: 0 };
        actual.suma += Number(p.valor);
        actual.cantidad += 1;
        sumasPorParametro.set(p.parametro, actual);
      }
    }

    const parametros: ParametroComparacionDto[] = lote.parametros.map((p) => {
      const stats = sumasPorParametro.get(p.parametro);
      const promedioHistorico = stats && stats.cantidad > 0 ? stats.suma / stats.cantidad : null;
      const valorLote = Number(p.valor);

      const desviacionPorcentual =
        promedioHistorico && promedioHistorico !== 0
          ? ((valorLote - promedioHistorico) / promedioHistorico) * 100
          : 0;

      return {
        parametro: p.parametro,
        valorLote,
        promedioHistorico: promedioHistorico ?? 0,
        desviacionPorcentual: Number(desviacionPorcentual.toFixed(2)),
        superaDesvioSignificativo:
          promedioHistorico !== null &&
          Math.abs(desviacionPorcentual) > config.desvioSignificativoPorcentaje,
      };
    });

    return {
      loteId: lote.id,
      cantidadLotesHistoricosUtilizados: historicos.length,
      cantidadLotesHistoricosConfigurada: config.cantidadRegistrosHistoricos,
      desvioSignificativoPorcentaje: config.desvioSignificativoPorcentaje,
      parametros,
    };
  }
}