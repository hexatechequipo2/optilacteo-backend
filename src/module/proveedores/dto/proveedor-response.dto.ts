import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';
import { TrazabilidadEntidadDto } from '../../audit/dto/trazabilidad.dto';

export class ProveedorResponseDto {
  id!: number;
  razonSocial!: string;
  cuit!: string;
  telefono!: string | null;
  emailContacto!: string | null;
  tipo!: TipoProveedor;
  empresaId!: number;
  provincia!: string | null;
  localidad!: string | null;
  capacidad!: number | null;
  estado!: EstadoProveedor;
  createdAt!: Date;
  updatedAt!: Date;
  auditoria?: TrazabilidadEntidadDto;
}
