import { HttpService } from '@nestjs/axios';
import { IMlClient, LoteFeatures, RecomendacionDestinoResult } from '../interfaces/ml-client.interface';
export declare class HttpMlClient implements IMlClient {
    private readonly http;
    private readonly logger;
    private readonly baseUrl;
    constructor(http: HttpService);
    predecirDestino(features: LoteFeatures): Promise<RecomendacionDestinoResult>;
}
