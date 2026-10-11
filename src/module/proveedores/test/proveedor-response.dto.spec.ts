import { ProveedorResponseDto } from '../dto/proveedor-response.dto';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';
import { TrazabilidadEntidadDto } from '../../audit/dto/trazabilidad.dto';
import { EstabilidadProveedorResponseDto } from '../../estabilidad-proveedor/dto/estabilidad-proveedor-response.dto';

describe('ProveedorResponseDto', () => {
  const tipoValido = Object.values(TipoProveedor).find(
    (valor) => typeof valor === 'string',
  ) as TipoProveedor;

  const estadoValido = Object.values(EstadoProveedor).find(
    (valor) => typeof valor === 'string',
  ) as EstadoProveedor;

  const proveedorBase: ProveedorResponseDto = {
    id: 1,
    razonSocial: 'Lácteos del Valle S.A.',
    cuit: '30-71234567-8',
    telefono: '+54 353 4567890',
    emailContacto: 'compras@lacteos.com',
    tipo: tipoValido,
    empresaId: 2,
    provincia: 'Córdoba',
    localidad: 'Villa María',
    capacidad: 500,
    estado: estadoValido,
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: new Date('2026-01-02T10:00:00.000Z'),
  };

  it('debería crear un DTO con todas las propiedades obligatorias', () => {
    const dto = Object.assign(new ProveedorResponseDto(), proveedorBase);

    expect(dto).toBeInstanceOf(ProveedorResponseDto);
    expect(dto).toEqual(proveedorBase);
  });

  it('debería conservar correctamente el identificador y la empresa', () => {
    const dto = Object.assign(new ProveedorResponseDto(), proveedorBase);

    expect(dto.id).toBe(1);
    expect(dto.empresaId).toBe(2);
  });

  it('debería conservar los datos principales del proveedor', () => {
    const dto = Object.assign(new ProveedorResponseDto(), proveedorBase);

    expect(dto.razonSocial).toBe('Lácteos del Valle S.A.');
    expect(dto.cuit).toBe('30-71234567-8');
    expect(dto.tipo).toBe(tipoValido);
    expect(dto.estado).toBe(estadoValido);
  });

  it('debería permitir teléfono y email en null', () => {
    const dto = Object.assign(new ProveedorResponseDto(), {
      ...proveedorBase,
      telefono: null,
      emailContacto: null,
    });

    expect(dto.telefono).toBeNull();
    expect(dto.emailContacto).toBeNull();
  });

  it('debería permitir provincia y localidad en null', () => {
    const dto = Object.assign(new ProveedorResponseDto(), {
      ...proveedorBase,
      provincia: null,
      localidad: null,
    });

    expect(dto.provincia).toBeNull();
    expect(dto.localidad).toBeNull();
  });

  it('debería permitir capacidad en null', () => {
    const dto = Object.assign(new ProveedorResponseDto(), {
      ...proveedorBase,
      capacidad: null,
    });

    expect(dto.capacidad).toBeNull();
  });

  it('debería conservar las fechas de creación y actualización', () => {
    const dto = Object.assign(new ProveedorResponseDto(), proveedorBase);

    expect(dto.createdAt).toEqual(
      new Date('2026-01-01T10:00:00.000Z'),
    );
    expect(dto.updatedAt).toEqual(
      new Date('2026-01-02T10:00:00.000Z'),
    );
    expect(dto.createdAt).toBeInstanceOf(Date);
    expect(dto.updatedAt).toBeInstanceOf(Date);
  });

  it('debería permitir auditoria como propiedad opcional', () => {
    const auditoria = {} as TrazabilidadEntidadDto;

    const dto = Object.assign(new ProveedorResponseDto(), {
      ...proveedorBase,
      auditoria,
    });

    expect(dto.auditoria).toBe(auditoria);
  });

  it('debería permitir estabilidad como propiedad opcional', () => {
    const estabilidad = {} as EstabilidadProveedorResponseDto;

    const dto = Object.assign(new ProveedorResponseDto(), {
      ...proveedorBase,
      estabilidad,
    });

    expect(dto.estabilidad).toBe(estabilidad);
  });

  it('debería permitir omitir auditoria y estabilidad', () => {
    const dto = Object.assign(new ProveedorResponseDto(), proveedorBase);

    expect(dto.auditoria).toBeUndefined();
    expect(dto.estabilidad).toBeUndefined();
  });

  it('debería contener las propiedades esperadas del DTO', () => {
  const dto = Object.assign(new ProveedorResponseDto(), proveedorBase);

  expect(Object.keys(dto).sort()).toEqual(
    [
      'id',
      'razonSocial',
      'cuit',
      'telefono',
      'emailContacto',
      'tipo',
      'empresaId',
      'provincia',
      'localidad',
      'capacidad',
      'estado',
      'createdAt',
      'updatedAt',
      'auditoria',
      'estabilidad',
    ].sort(),
  );
});
});