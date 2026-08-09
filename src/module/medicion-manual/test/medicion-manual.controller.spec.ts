import { Test, TestingModule } from '@nestjs/testing';
import { MedicionManualController } from '../medicion-manual.controller';
import { MedicionManualService } from '../medicion-manual.service';
import { CreateMedicionManualLoteDto } from '../dto/create-medicion-manual-lote.dto';
import { HistorialMedicionManualFilterQueryDto } from '../dto/historial-medicion-manual-filter-query.dto';
import { TenantContext } from '../../../common/types/tenant-context.type';
import { ROLES } from '../../rol/constants/roles.constants';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import { AUDIT_KEY } from '../../audit/decorators/audit-log.decorator';

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

describe('MedicionManualController', () => {
  let controller: MedicionManualController;
  let serviceMock: jest.Mocked<MedicionManualService>;

  const mockTenant: TenantContext = {
    empresaId: 1,
  } as TenantContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicionManualController],
      providers: [
        {
          provide: MedicionManualService,
          useValue: {
            registrar: jest.fn(),
            historial: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MedicionManualController>(MedicionManualController);
    serviceMock = module.get(MedicionManualService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('registrar', () => {
    it('debe llamar a medicionManualService.registrar con los argumentos convertidos correctamente', async () => {
      const loteIdStr = '10';
      const usuarioId = 5;
      const dto: CreateMedicionManualLoteDto = {
        mediciones: [],
      } as unknown as CreateMedicionManualLoteDto;

      const reqMock = {
        user: { sub: usuarioId },
      };

      const mockResponse = { id: 100, loteId: 10, mediciones: [] };
      serviceMock.registrar.mockResolvedValue(mockResponse as any);

      const resultado = await controller.registrar(
        loteIdStr,
        dto,
        mockTenant,
        reqMock,
      );

      expect(serviceMock.registrar).toHaveBeenCalledWith(
        10, // +id
        dto,
        usuarioId,
        mockTenant,
      );
      expect(resultado).toBe(mockResponse);
    });

    it('debe tener configurados los decoradores de seguridad y auditoría requeridos', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        MedicionManualController.prototype.registrar,
      );
      expect(roles).toEqual([ROLES.OPERARIO_LINEA]);

      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        MedicionManualController.prototype.registrar,
      );
      expect(permissions).toEqual({
        modulo: [ModuloSistema.RECEPCION, ModuloSistema.MONITOREO_ALERTAS],
        action: 'canWrite',
      });

      // Auditoría (Corregido: 'entidad' en lugar de 'recurso')
      const auditLog = Reflect.getMetadata(
        AUDIT_KEY,
        MedicionManualController.prototype.registrar,
      );
      expect(auditLog).toEqual({
        accion: 'MEDICION_MANUAL_LOTE_REGISTRAR',
        entidad: 'MedicionManualLote',
      });
    });
  });

  describe('historial', () => {
    it('debe llamar a medicionManualService.historial con los parámetros correctos', async () => {
      const loteIdStr = '10';
      const queryDto: HistorialMedicionManualFilterQueryDto = {
        page: 1,
        limit: 10,
      };

      const mockResponse = { data: [], total: 0 };
      serviceMock.historial.mockResolvedValue(mockResponse as any);

      const resultado = await controller.historial(
        loteIdStr,
        queryDto,
        mockTenant,
      );

      expect(serviceMock.historial).toHaveBeenCalledWith(
        10, // +id
        queryDto,
        mockTenant,
      );
      expect(resultado).toBe(mockResponse);
    });

    it('debe tener configurados los decoradores de roles y permisos requeridos', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        MedicionManualController.prototype.historial,
      );
      expect(roles).toEqual([
        ROLES.OPERARIO_LINEA,
        ROLES.RESPONSABLE_PRODUCCION,
        ROLES.GERENTE,
        ROLES.ADMINISTRADOR,
      ]);

      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        MedicionManualController.prototype.historial,
      );
      // CAMBIAR 'modulos' POR 'modulo'
      expect(permissions).toEqual({
        modulo: [ModuloSistema.MONITOREO_ALERTAS, ModuloSistema.TRAZABILIDAD],
        action: 'canRead',
      });
    });
  });
});
