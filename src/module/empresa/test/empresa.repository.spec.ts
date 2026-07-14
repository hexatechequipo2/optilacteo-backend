import { Repository } from 'typeorm';
import { EmpresaRepository } from '../repository/empresa.repository';
import { Empresa } from '../entities/empresa.entity';
import { EmpresaModulo } from '../entities/empresa-modulo.entity';
import { ModuloSistema } from '../enums/modulo-sistema.enum';
import { Plan } from '../enums/plan.enum';

// La logica de negocio de EmpresaService (limites de plan, aislamiento
// tenant, etc.) ya esta cubierta en empresa.service.spec.ts, donde este
// repository esta mockeado por completo. Ese mock oculta que syncModulos()
// tiene logica de dominio real (agregar/quitar/reactivar modulos) que vive
// exclusivamente aca -- por eso se prueba a fondo en este archivo.

describe('EmpresaRepository', () => {
  let repository: EmpresaRepository;
  let mockQueryBuilder: {
    leftJoinAndSelect: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    andWhere: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let mockRepo: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockModuloRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    mockRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockModuloRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    repository = new EmpresaRepository(
      mockRepo as unknown as Repository<Empresa>,
      mockModuloRepo as unknown as Repository<EmpresaModulo>,
    );
  });

  describe('findById', () => {
    it('deberia buscar por id trayendo las relaciones users y modulos', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue({ id: 1 });

      // Act
      const result = await repository.findById(1);

      // Assert
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { users: true, modulos: true },
      });
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findByCuit', () => {
    it('deberia buscar una empresa por cuit exacto', async () => {
      // Arrange
      mockRepo.findOneBy.mockResolvedValue({ id: 1, cuit: '30-12345678-9' });

      // Act
      const result = await repository.findByCuit('30-12345678-9');

      // Assert
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ cuit: '30-12345678-9' });
      expect(result).toEqual({ id: 1, cuit: '30-12345678-9' });
    });

    it('deberia devolver null si no hay ninguna empresa con ese cuit', async () => {
      // Arrange
      mockRepo.findOneBy.mockResolvedValue(null);

      // Act
      const result = await repository.findByCuit('99-99999999-9');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAll / findAllPaginated', () => {
    it('findAll deberia traer todas las empresas con sus relaciones', async () => {
      // Arrange
      mockRepo.find.mockResolvedValue([]);

      // Act
      await repository.findAll();

      // Assert
      expect(mockRepo.find).toHaveBeenCalledWith({ relations: { modulos: true, users: true } });
    });

    it('findAllPaginated deberia aplicar order/skip/take y devolver [items, total]', async () => {
      // Arrange
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: 1 }], 1]);

      // Act
      const result = await repository.findAllPaginated(20, 10);

      // Assert
      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('empresa');

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'empresa.modulos',
        'modulos',
      );

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'empresa.users',
        'users',
      );

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'empresa.id',
        'ASC',
      );

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);

      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();

      expect(result).toEqual([[{ id: 1 }], 1]);
    });
  });

  describe('createEmpresa', () => {
    it('deberia crear y guardar la empresa via el repository de TypeORM', async () => {
      // Arrange
      const partial = { name: 'Lacteos Norte', plan: Plan.STARTER };
      const created = { id: 1, ...partial };
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      // Act
      const result = await repository.createEmpresa(partial);

      // Assert
      expect(mockRepo.create).toHaveBeenCalledWith(partial);
      expect(mockRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('updateEmpresa', () => {
    it('deberia actualizar y devolver la empresa con los datos frescos', async () => {
      // Arrange
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue({ id: 1, name: 'Nuevo nombre' });

      // Act
      const result = await repository.updateEmpresa(1, { name: 'Nuevo nombre' });

      // Assert
      expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'Nuevo nombre' });
      expect(result).toEqual({ id: 1, name: 'Nuevo nombre' });
    });

    it('deberia lanzar Error si la empresa desaparecio entre el update y el findById posterior', async () => {
      // Arrange
      mockRepo.update.mockResolvedValue({ affected: 0 });
      mockRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.updateEmpresa(999, { name: 'X' })).rejects.toThrow(
        'Empresa with id 999 not found after update',
      );
    });
  });

  describe('deleteEmpresa', () => {
    it('deberia delegar en repository.delete con el id', async () => {
      // Arrange
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      // Act
      await repository.deleteEmpresa(1);

      // Assert
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('hasActiveUsers', () => {
    it('deberia devolver true si al menos un usuario de la empresa esta activo', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue({
        id: 1,
        users: [{ id: 1, isActive: false }, { id: 2, isActive: true }],
      });

      // Act
      const result = await repository.hasActiveUsers(1);

      // Assert
      expect(result).toBe(true);
    });

    it('deberia devolver false si ningun usuario esta activo', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue({
        id: 1,
        users: [{ id: 1, isActive: false }],
      });

      // Act
      const result = await repository.hasActiveUsers(1);

      // Assert
      expect(result).toBe(false);
    });

    it('deberia devolver false (no lanzar) si la empresa no existe', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.hasActiveUsers(999);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('createModulos', () => {
    it('deberia crear y guardar los modulos recibidos', async () => {
      // Arrange
      const modulos = [{ modulo: ModuloSistema.DASHBOARD, isActive: true }];
      mockModuloRepo.create.mockReturnValue(modulos);
      mockModuloRepo.save.mockResolvedValue(modulos);

      // Act
      const result = await repository.createModulos(modulos);

      // Assert
      expect(mockModuloRepo.create).toHaveBeenCalledWith(modulos);
      expect(mockModuloRepo.save).toHaveBeenCalledWith(modulos);
      expect(result).toEqual(modulos);
    });
  });

  describe('findModulo', () => {
    it('deberia buscar el modulo de una empresa por empresaId+modulo', async () => {
      // Arrange
      mockModuloRepo.findOne.mockResolvedValue({ id: 1, modulo: ModuloSistema.DASHBOARD });

      // Act
      await repository.findModulo(1, ModuloSistema.DASHBOARD);

      // Assert
      expect(mockModuloRepo.findOne).toHaveBeenCalledWith({
        where: { empresa: { id: 1 }, modulo: ModuloSistema.DASHBOARD },
        relations: { empresa: true },
      });
    });
  });

  describe('updateModulo', () => {
    it('deberia actualizar isActive y devolver el modulo actualizado', async () => {
      // Arrange
      mockModuloRepo.update.mockResolvedValue({ affected: 1 });
      mockModuloRepo.findOne.mockResolvedValue({ id: 10, isActive: false });

      // Act
      const result = await repository.updateModulo(10, false);

      // Assert
      expect(mockModuloRepo.update).toHaveBeenCalledWith(10, { isActive: false });
      expect(result).toEqual({ id: 10, isActive: false });
    });

    it('deberia lanzar Error si el modulo desaparecio entre el update y el findOne posterior', async () => {
      // Arrange
      mockModuloRepo.update.mockResolvedValue({ affected: 0 });
      mockModuloRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.updateModulo(999, true)).rejects.toThrow(
        'EmpresaModulo with id 999 not found after update',
      );
    });
  });

  describe('syncModulos - logica de dominio al cambiar de plan', () => {
    it('deberia agregar (crear) los modulos del nuevo plan que la empresa no tenia', async () => {
      // Arrange: empresa sin modulos previos, nuevo plan Starter (dashboard + recepcion)
      mockModuloRepo.find.mockResolvedValue([]);
      mockModuloRepo.create.mockReturnValue([
        { modulo: ModuloSistema.DASHBOARD, isActive: true, empresa: { id: 1 } },
        { modulo: ModuloSistema.RECEPCION, isActive: true, empresa: { id: 1 } },
      ]);

      // Act
      await repository.syncModulos(1, [ModuloSistema.DASHBOARD, ModuloSistema.RECEPCION]);

      // Assert
      expect(mockModuloRepo.create).toHaveBeenCalledWith([
        { modulo: ModuloSistema.DASHBOARD, isActive: true, empresa: { id: 1 } },
        { modulo: ModuloSistema.RECEPCION, isActive: true, empresa: { id: 1 } },
      ]);
      expect(mockModuloRepo.save).toHaveBeenCalled();
      expect(mockModuloRepo.update).not.toHaveBeenCalled();
    });

    it('NO deberia crear modulos si la empresa ya tiene todos los del nuevo plan', async () => {
      // Arrange
      mockModuloRepo.find.mockResolvedValue([
        { id: 1, modulo: ModuloSistema.DASHBOARD, isActive: true },
      ]);

      // Act
      await repository.syncModulos(1, [ModuloSistema.DASHBOARD]);

      // Assert
      expect(mockModuloRepo.create).not.toHaveBeenCalled();
      expect(mockModuloRepo.save).not.toHaveBeenCalled();
    });

    it('deberia desactivar los modulos que la empresa tenia pero el nuevo plan (downgrade) ya no incluye', async () => {
      // Arrange: empresa Pro con sensores_iot, hace downgrade a Starter
      mockModuloRepo.find.mockResolvedValue([
        { id: 1, modulo: ModuloSistema.DASHBOARD, isActive: true },
        { id: 2, modulo: ModuloSistema.SENSORES_IOT, isActive: true },
      ]);

      // Act
      await repository.syncModulos(1, [ModuloSistema.DASHBOARD]);

      // Assert
      expect(mockModuloRepo.update).toHaveBeenCalledWith(
        { id: expect.objectContaining({ _type: 'in', _value: [2] }) },
        { isActive: false },
      );
    });

    it('deberia reactivar un modulo que estaba desactivado manualmente pero el nuevo plan (upgrade) lo vuelve a incluir', async () => {
      // Arrange: la empresa tenia sensores_iot pero lo habia desactivado a mano;
      // ahora sube a un plan que lo incluye de nuevo
      mockModuloRepo.find.mockResolvedValue([
        { id: 2, modulo: ModuloSistema.SENSORES_IOT, isActive: false },
      ]);

      // Act
      await repository.syncModulos(1, [ModuloSistema.SENSORES_IOT]);

      // Assert
      expect(mockModuloRepo.update).toHaveBeenCalledWith(
        { id: expect.objectContaining({ _type: 'in', _value: [2] }) },
        { isActive: true },
      );
    });

    it('NO deberia tocar un modulo que ya esta activo y sigue incluido en el nuevo plan', async () => {
      // Arrange
      mockModuloRepo.find.mockResolvedValue([
        { id: 1, modulo: ModuloSistema.DASHBOARD, isActive: true },
      ]);

      // Act
      await repository.syncModulos(1, [ModuloSistema.DASHBOARD]);

      // Assert
      expect(mockModuloRepo.update).not.toHaveBeenCalled();
    });
  });
});
