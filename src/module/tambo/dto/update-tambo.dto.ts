import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTamboDto } from './create-tambo.dto';

// No permite editar proveedorId de un tambo ya creado: si el proveedor
// cambió, el criterio de negocio es dar de baja este tambo y crear uno
// nuevo bajo el proveedor correcto (evita romper trazabilidad histórica
// de lotes ya asociados a este tambo).
//
// Tampoco expone `activo` acá a propósito: el estado no se toca desde
// este PATCH genérico, tiene sus propios endpoints dedicados
// (DELETE /tambos/:id para dar de baja, PATCH /tambos/:id/activar para
// reactivar) para que quede auditado como una acción explícita y no
// como un efecto secundario de "actualizar cualquier campo".
export class UpdateTamboDto extends PartialType(
  OmitType(CreateTamboDto, ['proveedorId'] as const),
) {}