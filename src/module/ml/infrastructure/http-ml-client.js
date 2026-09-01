"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var HttpMlClient_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpMlClient = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let HttpMlClient = HttpMlClient_1 = class HttpMlClient {
    http;
    logger = new common_1.Logger(HttpMlClient_1.name);
    baseUrl = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';
    constructor(http) {
        this.http = http;
    }
    async predecirDestino(features) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.post(`${this.baseUrl}/recommendations/destino`, {
                empresa_id: features.empresaId,
                grasa: features.grasa,
                proteina: features.proteina,
                acidez: features.acidez,
                temperatura: features.temperatura,
                ph: features.ph,
            }));
            const data = response.data;
            if (data.status === 'insufficient_data') {
                return { status: 'insufficient_data' };
            }
            return {
                status: 'ok',
                destinoRecomendado: data.destino_recomendado,
                confianza: data.confianza,
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error(`Error llamando al microservicio ML: ${error.message}`);
            }
            else {
                this.logger.error(`Error llamando al microservicio ML: ${JSON.stringify(error)}`);
            }
            throw error;
        }
    }
};
exports.HttpMlClient = HttpMlClient;
exports.HttpMlClient = HttpMlClient = HttpMlClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _a : Object])
], HttpMlClient);
//# sourceMappingURL=http-ml-client.js.map