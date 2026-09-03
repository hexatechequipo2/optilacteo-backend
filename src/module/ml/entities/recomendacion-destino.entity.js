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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecomendacionDestino = void 0;
const typeorm_1 = require("typeorm");
const lote_entity_1 = require("../../lote/entities/lote.entity");
const empresa_entity_1 = require("../../empresa/entities/empresa.entity");
const destino_lote_enum_1 = require("../../lote/enums/destino-lote.enum");
let RecomendacionDestino = class RecomendacionDestino {
    id;
    lote;
    empresa;
    destinoRecomendado;
    confianza;
    estado;
    destinoReal;
    createdAt;
};
exports.RecomendacionDestino = RecomendacionDestino;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], RecomendacionDestino.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => lote_entity_1.Lote),
    __metadata("design:type", typeof (_a = typeof lote_entity_1.Lote !== "undefined" && lote_entity_1.Lote) === "function" ? _a : Object)
], RecomendacionDestino.prototype, "lote", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => empresa_entity_1.Empresa),
    __metadata("design:type", typeof (_b = typeof empresa_entity_1.Empresa !== "undefined" && empresa_entity_1.Empresa) === "function" ? _b : Object)
], RecomendacionDestino.prototype, "empresa", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: destino_lote_enum_1.DestinoLote }),
    __metadata("design:type", typeof (_c = typeof destino_lote_enum_1.DestinoLote !== "undefined" && destino_lote_enum_1.DestinoLote) === "function" ? _c : Object)
], RecomendacionDestino.prototype, "destinoRecomendado", void 0);
__decorate([
    (0, typeorm_1.Column)('float'),
    __metadata("design:type", Number)
], RecomendacionDestino.prototype, "confianza", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'pendiente' }),
    __metadata("design:type", String)
], RecomendacionDestino.prototype, "estado", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: destino_lote_enum_1.DestinoLote, nullable: true }),
    __metadata("design:type", typeof (_d = typeof destino_lote_enum_1.DestinoLote !== "undefined" && destino_lote_enum_1.DestinoLote) === "function" ? _d : Object)
], RecomendacionDestino.prototype, "destinoReal", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RecomendacionDestino.prototype, "createdAt", void 0);
exports.RecomendacionDestino = RecomendacionDestino = __decorate([
    (0, typeorm_1.Entity)('recomendaciones_destino')
], RecomendacionDestino);
//# sourceMappingURL=recomendacion-destino.entity.js.map