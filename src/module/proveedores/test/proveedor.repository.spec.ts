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
    countBy: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    const queryBuilderMock = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
    };

    mockTypeormRepo = {
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      countBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    } as any; 

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
      // 1. Obtenemos el mock del QB que definiste en el beforeEach
      const qb = mockTypeormRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      // 2. Ejecutamos el método
      await repository.findAllPaginated(tenantEmpresaA, 20, 10);

      // 3. Verificamos la cadena de llamadas del QueryBuilder
      expect(qb.andWhere).toHaveBeenCalledWith('proveedor.empresaId = :empresaId', { empresaId: 1 });
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(qb.getManyAndCount).toHaveBeenCalled();
    });

    it('para admin NO agrega filtro de empresa pero si aplica skip/take', async () => {
      const qb = mockTypeormRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findAllPaginated(tenantAdmin, 0, 20);

      // El admin no debe tener filtro de empresaId
      expect(qb.andWhere).not.toHaveBeenCalledWith(expect.stringContaining('empresaId'), expect.anything());
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(qb.getManyAndCount).toHaveBeenCalled();
    });
  });

describe('findById', () => {
  it('para no-admin agrega empresaId al WHERE (no puede leer un id de otra empresa)', async () => {
    const qb = mockTypeormRepo.createQueryBuilder();
    qb.getOne.mockResolvedValue(null);

    await repository.findById(99, tenantEmpresaA);

    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
      'proveedor.empresa',
      'empresa',
    );

    expect(qb.where).toHaveBeenCalledWith(
      'proveedor.id = :id',
      { id: 99 },
    );

    expect(qb.andWhere).toHaveBeenCalledWith(
      'proveedor.empresaId = :empresaId',
      { empresaId: 1 },
    );

    expect(qb.getOne).toHaveBeenCalled();
  });

  it('para admin NO agrega filtro de empresa', async () => {
    const qb = mockTypeormRepo.createQueryBuilder();
    qb.getOne.mockResolvedValue(null);

    await repository.findById(99, tenantAdmin);

    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
      'proveedor.empresa',
      'empresa',
    );

    expect(qb.where).toHaveBeenCalledWith(
      'proveedor.id = :id',
      { id: 99 },
    );

    expect(qb.andWhere).not.toHaveBeenCalledWith(
      expect.stringContaining('empresaId'),
      expect.anything(),
    );

    expect(qb.getOne).toHaveBeenCalled();
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

  describe('softDelete - cambia estado a SUSPENDIDA con filtro atomico (cierre de TOCTOU)', () => {
    it('para no-admin, la query UPDATE fisica lleva empresaId en el WHERE y fija estado SUSPENDIDA', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await repository.softDelete(10, tenantEmpresaA);

      expect(mockTypeormRepo.update).toHaveBeenCalledWith(
        { id: 10, empresaId: 1 },
        { estado: EstadoProveedor.SUSPENDIDA },
      );
    });

    it('para admin, la query UPDATE fisica NO lleva filtro de empresa', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await repository.softDelete(10, tenantAdmin);

      expect(mockTypeormRepo.update).toHaveBeenCalledWith(
        { id: 10 },
        { estado: EstadoProveedor.SUSPENDIDA },
      );
    });

    it('si affected es 0 (la fila ya no pertenece a esta empresa en el instante de la query), devuelve false en vez de asumir exito', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

      const result = await repository.softDelete(10, tenantEmpresaA);

      expect(result).toBe(false);
    });
  });

  describe('setEstado - usado por softDelete y por activate, mismo filtro atomico', () => {
    it('para no-admin, fija el estado recibido y filtra por empresaId', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      const result = await repository.setEstado(10, EstadoProveedor.ACTIVA, tenantEmpresaA);

      expect(mockTypeormRepo.update).toHaveBeenCalledWith(
        { id: 10, empresaId: 1 },
        { estado: EstadoProveedor.ACTIVA },
      );
      expect(result).toBe(true);
    });

    it('para admin, NO agrega filtro de empresa', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await repository.setEstado(10, EstadoProveedor.ACTIVA, tenantAdmin);

      expect(mockTypeormRepo.update).toHaveBeenCalledWith(
        { id: 10 },
        { estado: EstadoProveedor.ACTIVA },
      );
    });

    it('si affected es 0, devuelve false en vez de asumir que actualizo algo', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

      const result = await repository.setEstado(10, EstadoProveedor.ACTIVA, tenantEmpresaA);

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

  describe('save', () => {
    it('deberia delegar directamente en el save de TypeORM', async () => {
      const proveedor = buildProveedor();
      mockTypeormRepo.save.mockResolvedValue(proveedor);

      const result = await repository.save(proveedor);

      expect(mockTypeormRepo.save).toHaveBeenCalledWith(proveedor);
      expect(result).toBe(proveedor);
    });
  });

  describe('countByEmpresa', () => {
    it('deberia contar por empresaId (usado para excluir SUSPENDIDA/TRIAL del total activo)', async () => {
      mockTypeormRepo.countBy.mockResolvedValue(3);

      const result = await repository.countByEmpresa(1);

      expect(mockTypeormRepo.countBy).toHaveBeenCalledWith({ empresaId: 1 });
      expect(result).toBe(3);
    });
  });
});