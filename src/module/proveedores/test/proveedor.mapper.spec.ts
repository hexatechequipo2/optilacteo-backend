import { ProveedorMapper } from '../mappers/proveedor.mapper';
import { Proveedor } from '../entities/proveedor.entity';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';
import { UpdateProveedorDto } from '../dto/update-proveedor.dto';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';

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

function buildCreateDto(overrides: Partial<CreateProveedorDto> = {}): CreateProveedorDto {
  return {
    razonSocial: 'Tambo El Sol',
    cuit: '20-12345678-9',
    tipo: TipoProveedor.TAMBO,
    ...overrides,
  };
}

describe('ProveedorMapper', () => {
  let mapper: ProveedorMapper;

  beforeEach(() => {
    mapper = new ProveedorMapper();
  });

  describe('toEntity - alta (HU-57)', () => {
    it('deberia mapear todos los campos del DTO: tipo, razon social, CUIT, contacto, provincia, localidad y capacidad', () => {
      const dto = buildCreateDto({
        telefono: '+54 353 4567890',
        emailContacto: 'compras@tambo.com',
        tipo: TipoProveedor.TRANSPORTE,
        provincia: 'Córdoba',
        localidad: 'Villa María',
        capacidad: 500,
      });

      const entity = mapper.toEntity(dto, 1);

      expect(entity.razonSocial).toBe('Tambo El Sol');
      expect(entity.cuit).toBe('20-12345678-9');
      expect(entity.telefono).toBe('+54 353 4567890');
      expect(entity.emailContacto).toBe('compras@tambo.com');
      expect(entity.tipo).toBe(TipoProveedor.TRANSPORTE);
      expect(entity.provincia).toBe('Córdoba');
      expect(entity.localidad).toBe('Villa María');
      expect(entity.capacidad).toBe(500);
    });

    it.each([
      TipoProveedor.TAMBO,
      TipoProveedor.TRANSPORTE,
      TipoProveedor.INSUMOS,
      TipoProveedor.LABORATORIO,
    ])('deberia aceptar el tipo %s', (tipo) => {
      const dto = buildCreateDto({ tipo });

      const entity = mapper.toEntity(dto, 1);

      expect(entity.tipo).toBe(tipo);
    });

    it('la empresa asignada viene resuelta por el service (empresaId), no del DTO: se asigna automaticamente por sesion', () => {
      const dto = buildCreateDto({ empresaId: 999 });

      const entity = mapper.toEntity(dto, 1);

      expect(entity.empresaId).toBe(1);
    });

    it('deberia dejar telefono/emailContacto/provincia/localidad/capacidad en null cuando el DTO no los trae', () => {
      const dto = buildCreateDto();

      const entity = mapper.toEntity(dto, 1);

      expect(entity.telefono).toBeNull();
      expect(entity.emailContacto).toBeNull();
      expect(entity.provincia).toBeNull();
      expect(entity.localidad).toBeNull();
      expect(entity.capacidad).toBeNull();
    });

    it('deberia usar ACTIVA como estado por defecto cuando el DTO no trae estado', () => {
      const dto = buildCreateDto();

      const entity = mapper.toEntity(dto, 1);

      expect(entity.estado).toBe(EstadoProveedor.ACTIVA);
    });

    it('deberia respetar el estado del DTO si viene explicito', () => {
      const dto = buildCreateDto({ estado: EstadoProveedor.TRIAL });

      const entity = mapper.toEntity(dto, 1);

      expect(entity.estado).toBe(EstadoProveedor.TRIAL);
    });
  });

  describe('applyUpdate - edicion', () => {
    it('deberia actualizar solo los campos presentes en el DTO y dejar el resto intacto', () => {
      const entity = buildProveedor();
      const dto: UpdateProveedorDto = { razonSocial: 'Tambo El Sol (renombrado)' };

      const result = mapper.applyUpdate(entity, dto);

      expect(result.razonSocial).toBe('Tambo El Sol (renombrado)');
      expect(result.cuit).toBe('20-12345678-9');
      expect(result.tipo).toBe(TipoProveedor.TAMBO);
    });

    it('deberia actualizar contacto (telefono/emailContacto), provincia, localidad y capacidad (volumen de entrega)', () => {
      const entity = buildProveedor();
      const dto: UpdateProveedorDto = {
        telefono: '+54 351 1112233',
        emailContacto: 'nuevo@contacto.com',
        provincia: 'Santa Fe',
        localidad: 'Rafaela',
        capacidad: 1200,
      };

      const result = mapper.applyUpdate(entity, dto);

      expect(result.telefono).toBe('+54 351 1112233');
      expect(result.emailContacto).toBe('nuevo@contacto.com');
      expect(result.provincia).toBe('Santa Fe');
      expect(result.localidad).toBe('Rafaela');
      expect(result.capacidad).toBe(1200);
    });

    it('deberia reasignar la empresa solo cuando se pasa un empresaId explicito (resuelto por el service)', () => {
      const entity = buildProveedor({ empresaId: 1 });

      const result = mapper.applyUpdate(entity, {}, 5);

      expect(result.empresaId).toBe(5);
    });

    it('no deberia tocar empresaId si no se pasa el segundo argumento', () => {
      const entity = buildProveedor({ empresaId: 1 });

      const result = mapper.applyUpdate(entity, { razonSocial: 'x' });

      expect(result.empresaId).toBe(1);
    });

    it('deberia limpiar telefono/emailContacto/provincia/localidad/capacidad a null cuando el DTO los manda explicitamente en null', () => {
      const entity = buildProveedor({
        telefono: '+54 351 1112233',
        emailContacto: 'contacto@tambo.com',
        provincia: 'Córdoba',
        localidad: 'Villa María',
        capacidad: 500,
      });
      const dto: UpdateProveedorDto = {
        telefono: null,
        emailContacto: null,
        provincia: null,
        localidad: null,
        capacidad: null as unknown as number,
      };

      const result = mapper.applyUpdate(entity, dto);

      expect(result.telefono).toBeNull();
      expect(result.emailContacto).toBeNull();
      expect(result.provincia).toBeNull();
      expect(result.localidad).toBeNull();
      expect(result.capacidad).toBeNull();
    });

    it('deberia actualizar el CUIT cuando el DTO lo trae', () => {
      const entity = buildProveedor();

      const result = mapper.applyUpdate(entity, { cuit: '27-11111111-1' });

      expect(result.cuit).toBe('27-11111111-1');
    });

    it('deberia actualizar el tipo cuando el DTO lo trae', () => {
      const entity = buildProveedor({ tipo: TipoProveedor.TAMBO });

      const result = mapper.applyUpdate(entity, { tipo: TipoProveedor.INSUMOS });

      expect(result.tipo).toBe(TipoProveedor.INSUMOS);
    });

    it('deberia permitir cambiar el estado (activar/desactivar) via applyUpdate', () => {
      const entity = buildProveedor({ estado: EstadoProveedor.ACTIVA });

      const result = mapper.applyUpdate(entity, { estado: EstadoProveedor.SUSPENDIDA });

      expect(result.estado).toBe(EstadoProveedor.SUSPENDIDA);
    });
  });

  describe('toResponseDto', () => {
    it('deberia mapear todos los campos de la entidad, incluyendo estado y timestamps', () => {
      const entity = buildProveedor({
        telefono: '+54 353 4567890',
        emailContacto: 'compras@tambo.com',
        provincia: 'Córdoba',
        localidad: 'Villa María',
        capacidad: 500,
        estado: EstadoProveedor.SUSPENDIDA,
      });

      const result = mapper.toResponseDto(entity);

      expect(result).toEqual({
        id: 10,
        razonSocial: 'Tambo El Sol',
        cuit: '20-12345678-9',
        telefono: '+54 353 4567890',
        emailContacto: 'compras@tambo.com',
        tipo: TipoProveedor.TAMBO,
        empresaId: 1,
        provincia: 'Córdoba',
        localidad: 'Villa María',
        capacidad: 500,
        estado: EstadoProveedor.SUSPENDIDA,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      });
    });

    it('no deberia filtrar campos extra de la entidad (por ejemplo la relacion empresa)', () => {
      const entity = buildProveedor();

      const result = mapper.toResponseDto(entity);

      expect(result).not.toHaveProperty('empresa');
    });
  });

  describe('toResponseDtoList', () => {
    it('deberia mapear cada proveedor de la lista preservando el orden', () => {
      const proveedores = [
        buildProveedor({ id: 1, razonSocial: 'Tambo El Sol' }),
        buildProveedor({ id: 2, razonSocial: 'Transporte Rapido', tipo: TipoProveedor.TRANSPORTE }),
      ];

      const result = mapper.toResponseDtoList(proveedores);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 1, razonSocial: 'Tambo El Sol' });
      expect(result[1]).toMatchObject({ id: 2, razonSocial: 'Transporte Rapido' });
    });

    it('deberia devolver un array vacio cuando no hay proveedores', () => {
      const result = mapper.toResponseDtoList([]);

      expect(result).toEqual([]);
    });
  });
});
