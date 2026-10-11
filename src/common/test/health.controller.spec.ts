import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { HealthController } from '../../health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('check devuelve { status: "ok" }', () => {
    expect(controller.check()).toEqual({ status: 'ok' });
  });

  describe('metadata de la ruta', () => {
    it('se expone como GET /health', () => {
      expect(Reflect.getMetadata(PATH_METADATA, HealthController)).toBe('health');
      expect(Reflect.getMetadata(METHOD_METADATA, controller.check)).toBe(RequestMethod.GET);
    });

    it('responde con HTTP 200', () => {
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, controller.check)).toBe(HttpStatus.OK);
    });
  });
});