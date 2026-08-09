import 'reflect-metadata';
import { LoteRevisionResponseDto } from '../dto/lote-revision-response.dto';
import { DecisionRevision } from '../enums/decision-revision.enum';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

const API_MODEL_PROPERTIES = 'swagger/apiModelProperties';

describe('LoteRevisionResponseDto', () => {
  it('debe instanciarse correctamente y asignar todas sus propiedades', () => {
    const fechaCreacion = new Date('2026-07-31T10:00:00Z');

    const dto = new LoteRevisionResponseDto();
    dto.id = 1;
    dto.loteId = 100;
    dto.decision = DecisionRevision.APROBADO;
    dto.justificacion = 'Aprobado tras verificar parámetros dentro de norma';
    dto.usuarioId = 5;
    dto.createdAt = fechaCreacion;

    expect(dto).toBeDefined();
    expect(dto.id).toBe(1);
    expect(dto.loteId).toBe(100);
    expect(dto.decision).toBe(DecisionRevision.APROBADO);
    expect(dto.justificacion).toBe(
      'Aprobado tras verificar parámetros dentro de norma',
    );
    expect(dto.usuarioId).toBe(5);
    expect(dto.createdAt).toBe(fechaCreacion);
  });

  it('debe tener configurada la metadata de Swagger para sus propiedades', () => {
    const idMeta = Reflect.getMetadata(
      API_MODEL_PROPERTIES,
      LoteRevisionResponseDto.prototype,
      'id',
    );
    const loteIdMeta = Reflect.getMetadata(
      API_MODEL_PROPERTIES,
      LoteRevisionResponseDto.prototype,
      'loteId',
    );
    const decisionMeta = Reflect.getMetadata(
      API_MODEL_PROPERTIES,
      LoteRevisionResponseDto.prototype,
      'decision',
    );
    const justificacionMeta = Reflect.getMetadata(
      API_MODEL_PROPERTIES,
      LoteRevisionResponseDto.prototype,
      'justificacion',
    );
    const usuarioIdMeta = Reflect.getMetadata(
      API_MODEL_PROPERTIES,
      LoteRevisionResponseDto.prototype,
      'usuarioId',
    );
    const createdAtMeta = Reflect.getMetadata(
      API_MODEL_PROPERTIES,
      LoteRevisionResponseDto.prototype,
      'createdAt',
    );

    expect(idMeta).toBeDefined();
    expect(loteIdMeta).toBeDefined();
    expect(decisionMeta).toBeDefined();
    expect(decisionMeta.enum).toEqual(Object.values(DecisionRevision));
    expect(justificacionMeta).toBeDefined();
    expect(usuarioIdMeta).toBeDefined();
    expect(createdAtMeta).toBeDefined();
  });
});
