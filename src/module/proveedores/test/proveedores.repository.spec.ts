import { Repository } from 'typeorm';
import { ProveedorRepository } from '../repository/proveedor.repository';
import { Proveedor } from '../entities/proveedor.entity';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const tenantEmpresaA: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };
const tenantAdmin: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

function buildProveedor(overrides: Partial<Proveedor> = {}): Proveedor {
  return {
    id: 10,
    razonSocial: 'Tambo El Sol',
    cuit: '20-12345678-9',
    telefono: null,
    emailContacto: null,
    tipo: TipoProveedor.TAMBO,
    provincia: null,
    localidad: null,
    capacidad: null,
    estado: EstadoProveedor.ACTIVA,
    empresaId: 1,
    empresa: undefined as never,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('ProveedorRepository - filtro fisico por empresa_id', () => {
  let repository: ProveedorRepository;
  let mockTypeormRepo: {
    find: jest.Mock;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    countBy: jest.Mock;
  };

  beforeEach(() => {
    mockTypeormRepo = {
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countBy: jest.fn(),
    };
    repository = new ProveedorRepository(mockTypeormRepo as unknown as Repository<Proveedor>);
  });

  describe('findAll', () => {
    it('para no-admin agrega empresaId al WHERE', async () => {
      mockTypeormRepo.find.mockResolvedValue([]);

      await repository.findAll(tenantEmpresaA);

      expect(mockTypeormRepo.find).toHaveBeenCalledWith({
        order: { razonSocial: 'ASC' },
        where: { empresaId: 1 },
      });
    });

    it('para admin NO agrega ningun filtro de empresa', async () => {
      mockTypeormRepo.find.mockResolvedValue([]);

      await repository.findAll(tenantAdmin);

      expect(mockTypeormRepo.find).toHaveBeenCalledWith({
        order: { razonSocial: 'ASC' },
        where: {},
      });
    });
  });

  describe('findAllPaginated', () => {
    it('para no-admin agrega empresaId al WHERE y aplica skip/take', async () => {
      mockTypeormRepo.findAndCount.mockResolvedValue([[], 0]);

      await repository.findAllPaginated(tenantEmpresaA, 20, 10);

      expect(mockTypeormRepo.findAndCount).toHaveBeenCalledWith({
        order: { razonSocial: 'ASC' },
        where: { empresaId: 1 },
        skip: 20,
        take: 10,
      });
    });

    it('para admin NO agrega filtro de empresa pero si aplica skip/take', async () => {
      mockTypeormRepo.findAndCount.mockResolvedValue([[], 0]);

      await repository.findAllPaginated(tenantAdmin, 0, 20);

      expect(mockTypeormRepo.findAndCount).toHaveBeenCalledWith({
        order: { razonSocial: 'ASC' },
        where: {},
        skip: 0,
        take: 20,
      });
    });
  });

  describe('findById', () => {
    it('para no-admin agrega empresaId al WHERE (no puede leer un id de otra empresa)', async () => {
      mockTypeormRepo.findOne.mockResolvedValue(null);

      await repository.findById(99, tenantEmpresaA);

      expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 99, empresaId: 1 },
      });
    });

    it('para admin NO agrega filtro de empresa', async () => {
      mockTypeormRepo.findOne.mockResolvedValue(null);

      await repository.findById(99, tenantAdmin);

      expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { id: 99 } });
    });
  });

  describe('update - filtro atomico en la sentencia UPDATE (cierre de TOCTOU)', () => {
    it('para no-admin, la query UPDATE fisica lleva empresaId en el WHERE', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      mockTypeormRepo.findOneBy.mockResolvedValue(buildProveedor());

      await repository.update(buildProveedor(), tenantEmpresaA);

      expect(mockTypeormRepo.update).toHaveBeenCalledWith(
        { id: 10, empresaId: 1 },
        expect.objectContaining({ razonSocial: 'Tambo El Sol', empresaId: 1 }),
      );
    });

    it('para admin, la query UPDATE fisica NO lleva filtro de empresa', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      mockTypeormRepo.findOneBy.mockResolvedValue(buildProveedor());

      await repository.update(buildProveedor(), tenantAdmin);

      expect(mockTypeormRepo.update).toHaveBeenCalledWith(
        { id: 10 },
        expect.any(Object),
      );
    });

    it('si affected es 0 (la fila ya no pertenece a esta empresa en el instante de la query), devuelve null en vez de asumir exito', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

      const result = await repository.update(buildProveedor(), tenantEmpresaA);

      expect(result).toBeNull();
      expect(mockTypeormRepo.findOneBy).not.toHaveBeenCalled();
    });
  });

  describe('delete - filtro atomico en la sentencia DELETE (cierre de TOCTOU)', () => {
    it('para no-admin, la query DELETE fisica lleva empresaId en el WHERE', async () => {
      mockTypeormRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await repository.delete(10, tenantEmpresaA);

      expect(mockTypeormRepo.delete).toHaveBeenCalledWith({ id: 10, empresaId: 1 });
    });

    it('para admin, la query DELETE fisica NO lleva filtro de empresa', async () => {
      mockTypeormRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await repository.delete(10, tenantAdmin);

      expect(mockTypeormRepo.delete).toHaveBeenCalledWith({ id: 10 });
    });

    it('si affected es 0, devuelve false en vez de asumir que borro algo', async () => {
      mockTypeormRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

      const result = await repository.delete(10, tenantEmpresaA);

      expect(result).toBe(false);
    });
  });

  describe('findByCuit', () => {
    it('no filtra por empresa -- el CUIT es UNIQUE global en la tabla', async () => {
      mockTypeormRepo.findOneBy.mockResolvedValue(null);

      await repository.findByCuit('20-12345678-9');

      expect(mockTypeormRepo.findOneBy).toHaveBeenCalledWith({ cuit: '20-12345678-9' });
    });
  });
});