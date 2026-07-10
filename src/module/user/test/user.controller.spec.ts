import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import { ROLES } from '../../rol/constants/roles.constants';

// Los metadatos de @Roles (GERENTE/ADMINISTRADOR) no se testean aqui por
// reflexion; este archivo se enfoca en que cada metodo del controller
// delegue en UserService con los parametros correctos, incluida la
// conversion manual de id (string -> number via '+id', no ParseIntPipe).

const tenantGerente: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    activate: jest.Mock;
    deactivate: jest.Mock;
  };

  beforeEach(async () => {
    mockUserService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  describe('create', () => {
    it('deberia delegar en userService.create con el DTO y el tenant del usuario autenticado', async () => {
      const dto = {
        name: 'Juan Pérez',
        email: 'juan@lacteosnorte.com',
        password: 'plainPassword123',
        rolId: 2,
        empresaId: 1,
      };
      mockUserService.create.mockResolvedValue({ id: 1, ...dto });

      await controller.create(dto as never, tenantGerente);

      expect(mockUserService.create).toHaveBeenCalledWith(dto, tenantGerente);
    });
  });

  describe('findAll', () => {
    it('deberia delegar en userService.findAll con el tenant y la query de paginacion', async () => {
      const query = {
        page: 1,
        limit: 20,
      };

      mockUserService.findAll.mockResolvedValue([]);

      await controller.findAll(
        tenantGerente,
        query as never,
      );

      expect(mockUserService.findAll).toHaveBeenCalledWith(
        tenantGerente,
        query,
      );
    });
  });

  describe('findOne', () => {
    it('deberia convertir el id de string a number antes de delegar en userService.findOne', async () => {
      mockUserService.findOne.mockResolvedValue({ id: 7 });

      await controller.findOne('7', tenantGerente);

      expect(mockUserService.findOne).toHaveBeenCalledWith(7, tenantGerente);
    });
  });

  describe('update', () => {
    it('deberia convertir el id a number y delegar en userService.update con el body y el tenant', async () => {
      const dto = { name: 'Nuevo nombre' };
      mockUserService.update.mockResolvedValue({ id: 3, ...dto });

      await controller.update('3', dto as never, tenantGerente);

      expect(mockUserService.update).toHaveBeenCalledWith(3, dto, tenantGerente);
    });
  });

  describe('activate', () => {
    it('deberia convertir el id a number y delegar en userService.activate', async () => {
      mockUserService.activate.mockResolvedValue({ id: 4, isActive: true });

      await controller.activate('4', tenantGerente);

      expect(mockUserService.activate).toHaveBeenCalledWith(4, tenantGerente);
    });
  });

  describe('deactivate', () => {
    it('deberia convertir el id a number y delegar en userService.deactivate', async () => {
      mockUserService.deactivate.mockResolvedValue({ id: 4, isActive: false });

      await controller.deactivate('4', tenantGerente);

      expect(mockUserService.deactivate).toHaveBeenCalledWith(4, tenantGerente);
    });
  });

});
