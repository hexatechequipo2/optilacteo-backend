import { Test, TestingModule } from '@nestjs/testing';
import { NotificacionesController } from '../notificaciones.controller';
import { NotificacionesService } from '../notificaciones.service';
import { NotificacionFilterQueryDto } from '../dto/notificacion-filter-query.dto';
import { TenantContext } from '../../../common/types/tenant-context.type';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';

describe('NotificacionesController', () => {
  let controller: NotificacionesController;
  let notificacionesServiceMock: jest.Mocked<NotificacionesService>;

  const mockTenant: TenantContext = {
    empresaId: 5,
  } as TenantContext;

  const mockReq = {
    user: {
      sub: 42, // ID de usuario autenticado
    },
  };

  beforeEach(async () => {
    notificacionesServiceMock = {
      listarPorUsuario: jest.fn(),
      marcarLeida: jest.fn(),
    } as unknown as jest.Mocked<NotificacionesService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificacionesController],
      providers: [
        {
          provide: NotificacionesService,
          useValue: notificacionesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<NotificacionesController>(NotificacionesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('Configuración de Guards', () => {
    it('debe tener configurados los guards RolesGuard y PermissionsGuard', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, NotificacionesController);

      expect(guards).toBeDefined();
      expect(guards).toContain(RolesGuard);
      expect(guards).toContain(PermissionsGuard);
    });
  });

  describe('findMine', () => {
    it('debe llamar a notificacionesService.listarPorUsuario con el usuario, empresaId y query', async () => {
      const queryDto: NotificacionFilterQueryDto = {
        page: 1,
        limit: 10,
      } as any;

      const expectedResponse = {
        data: [{ id: 1, mensaje: 'Notificación 1' }],
        total: 1,
      };

      notificacionesServiceMock.listarPorUsuario.mockResolvedValue(
        expectedResponse as any,
      );

      const result = await controller.findMine(queryDto, mockTenant, mockReq);

      expect(notificacionesServiceMock.listarPorUsuario).toHaveBeenCalledWith(
        42, // req.user.sub
        5,  // tenant.empresaId
        queryDto,
      );
      expect(result).toBe(expectedResponse);
    });
  });

  describe('marcarLeida', () => {
    it('debe transformar el id a número y llamar a notificacionesService.marcarLeida', async () => {
      const notificationIdStr = '123';
      const expectedResponse = { id: 123, leida: true };

      notificacionesServiceMock.marcarLeida.mockResolvedValue(
        expectedResponse as any,
      );

      const result = await controller.marcarLeida(
        notificationIdStr,
        mockTenant,
        mockReq,
      );

      expect(notificacionesServiceMock.marcarLeida).toHaveBeenCalledWith(
        123, // ID transformado con +id
        42,  // req.user.sub
        5,   // tenant.empresaId
      );
      expect(result).toBe(expectedResponse);
    });
  });
});