import { Test, TestingModule } from '@nestjs/testing';

import { LecturaSensorController } from '../lectura-sensor.controller';
import { LecturaSensorService } from '../lectura-sensor.service';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
describe('LecturaSensorController', () => {
  let controller: LecturaSensorController;

  const lecturaSensorServiceMock = {
    ingresar: jest.fn(),
    ingresarManual: jest.fn(),
    consultarHistorial: jest.fn(),
    exportarHistorial: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LecturaSensorController],
      providers: [
        {
          provide: LecturaSensorService,
          useValue: lecturaSensorServiceMock,
        },
      ],
    }).compile();

    controller = module.get<LecturaSensorController>(LecturaSensorController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ingresar', () => {
    it('cuando se recibe una lectura válida, debe delegar el ingreso al servicio', async () => {
      const dto = {
        sensor_id: 'SEN-001',
        lote_id: 'LOTE-001',
        valor: 12.5,
        timestamp: new Date().toISOString(),
      } as any;

      const tenant = {
        empresaId: 1,
      } as any;

      const response = {
        id: 1,
      };

      lecturaSensorServiceMock.ingresar.mockResolvedValue(response);

      const result = await controller.ingresar(dto, tenant);

      expect(lecturaSensorServiceMock.ingresar).toHaveBeenCalledWith(
        dto,
        tenant,
      );

      expect(result).toBe(response);
    });
  });

  describe('ingresarManual', () => {
    it('cuando se recibe una lectura manual válida, debe delegar el ingreso al servicio', async () => {
      const dto = {
        sensorId: 10,
        valor: 8,
      } as any;

      const tenant = {
        empresaId: 2,
      } as any;

      const req = {
        user: {
          sub: 99,
        },
      };

      const response = {
        id: 5,
      };

      lecturaSensorServiceMock.ingresarManual.mockResolvedValue(response);

      const result = await controller.ingresarManual(dto, tenant, req);

      expect(lecturaSensorServiceMock.ingresarManual).toHaveBeenCalledWith(
        dto,
        99,
        tenant,
      );

      expect(result).toBe(response);
    });
  });

  describe('consultarHistorial', () => {
    it('cuando existen lecturas, debe devolver el historial filtrado', async () => {
      const query = {
        page: 1,
        limit: 20,
      } as any;

      const tenant = {
        empresaId: 3,
      } as any;

      const response = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        rangoAmplio: false,
      };

      lecturaSensorServiceMock.consultarHistorial.mockResolvedValue(response);

      const result = await controller.consultarHistorial(query, tenant);

      expect(lecturaSensorServiceMock.consultarHistorial).toHaveBeenCalledWith(
        query,
        tenant,
      );

      expect(result).toBe(response);
    });
  });

  describe('exportarHistorial', () => {
    it('cuando se exporta el historial, debe devolver un archivo CSV', async () => {
      const query = {
        page: 1,
        limit: 20,
      } as any;

      const tenant = {
        empresaId: 1,
      } as any;

      const csv = 'id,valor\n1,25';

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as any;

      lecturaSensorServiceMock.exportarHistorial.mockResolvedValue(csv);

      await controller.exportarHistorial(query, tenant, res);

      expect(lecturaSensorServiceMock.exportarHistorial).toHaveBeenCalledWith(
        query,
        tenant,
      );

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8',
      );

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename="historial-mediciones-'),
      );

      expect(res.send).toHaveBeenCalledWith(csv);
    });
  });
});
