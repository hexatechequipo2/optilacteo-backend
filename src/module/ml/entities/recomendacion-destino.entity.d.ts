import { Lote } from '../../lote/entities/lote.entity';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { DestinoLote } from '../../lote/enums/destino-lote.enum';
export type EstadoRecomendacion = 'pendiente' | 'aceptada' | 'rechazada';
export declare class RecomendacionDestino {
    id: number;
    lote: Lote;
    empresa: Empresa;
    destinoRecomendado: DestinoLote;
    confianza: number;
    estado: EstadoRecomendacion;
    destinoReal?: DestinoLote;
    createdAt: Date;
}
