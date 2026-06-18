# 🤖 Guía de trabajo con IA — Backend | HexaTech / OptiLácteo

> **UTN FRVM · Proyecto Final 2026 · Equipo 2**  
> Antes de tocar cualquier línea de código, leé este archivo completo y pegá el bloque de la Sección 1 en tu sesión de IA.

---

## Índice

1. [Prompt base para la IA](#1-prompt-base-para-la-ia-pegarlo-al-inicio-de-cada-sesión)
2. [Base de datos local — Sprint 1](#2-base-de-datos-local--sprint-1)
3. [Ramas del repositorio y orden de trabajo](#3-ramas-del-repositorio-y-orden-de-trabajo)
4. [Flujo completo para trabajar una historia](#4-flujo-completo-para-trabajar-una-historia)
5. [Estructura de módulos NestJS — SOLID + Repository](#5-estructura-de-módulos-nestjs--solid--repository)
6. [Enums](#6-enums)
7. [Mappers](#7-mappers)
8. [Testing con Jest](#8-testing-con-jest)
9. [Convenciones de código](#9-convenciones-de-código)
10. [Conventional Commits](#10-conventional-commits)
11. [Template de Pull Request](#11-template-de-pull-request)
12. [Definition of Done (DoD)](#12-definition-of-done-dod)
13. [Qué pedirle a la IA y cómo](#13-qué-pedirle-a-la-ia-y-cómo)

---

## 1. Prompt base para la IA (pegarlo al inicio de cada sesión)

Copiá **todo** el bloque de abajo y pegalo como **primer mensaje** cada vez que abras una sesión nueva con cualquier IA (Claude, ChatGPT, Copilot, etc.).

```
# Contexto del proyecto — OptiLácteo (Backend)

Sos un asistente de desarrollo para el equipo HexaTech (Equipo 2, UTN FRVM, Proyecto Final 2026).
El proyecto se llama OptiLácteo: una plataforma SaaS multi-tenant para industrias lácteas.
Estoy trabajando en el BACKEND.

## Stack backend
- Runtime:      Node.js
- Framework:    NestJS + TypeScript
- Base de datos: PostgreSQL 15 + TypeORM
- Auth:         JWT + bcrypt + TLS 1.2
- Documentación API: Swagger / OpenAPI
- Testing:      Jest
- Linter:       ESLint + Prettier
- CI/CD:        GitHub Actions

## Principios de código obligatorios
1. Aplicar principios SOLID en toda clase y módulo.
2. Arquitectura en capas estricta: Controller → Service → Repository.
3. Toda entidad tiene tenant_id para aislamiento multi-tenant.
4. Eliminación lógica mediante campo deleted_at (nunca DELETE físico).
5. La API es stateless: autenticación solo por JWT en cada request via guard global.
6. Usar TypeORM con migraciones controladas (nunca synchronize: true en prod ni en develop).
7. Todos los endpoints documentados con @ApiTags, @ApiOperation y @ApiResponse (Swagger).
8. Código en inglés (variables, funciones, clases). Comentarios en español.
9. Conventional Commits: feat | fix | docs | test | refactor | chore.
10. Sin console.log en código productivo — usar el Logger de NestJS.

## Base de datos local (Sprint 1)
- DB:   optilacteo_dev
- User: hexatech
- Pass: hexatech2026
- Host: localhost
- Port: 5432

## Estado actual
- Sprint activo: Sprint 1
- Sin Docker en este Sprint; todo corre local.
- Rama de trabajo: ver sección de ramas en este CONTRIBUTING.md.

Cuando generes código, seguí siempre estas convenciones.
Si algo no está claro, preguntame antes de asumir.
```

---

## 2. Base de datos local — Sprint 1

### Credenciales compartidas del equipo

| Parámetro | Valor |
|-----------|-------|
| Base de datos | `optilacteo_dev` |
| Usuario | `hexatech` |
| Contraseña | `hexatech2026` |
| Puerto | `5432` |
| Host | `localhost` |

### Paso 1 — Crear usuario y base de datos (una sola vez)

```sql
psql -U postgres

CREATE USER hexatech WITH PASSWORD 'hexatech2026';
CREATE DATABASE optilacteo_dev OWNER hexatech;
GRANT ALL PRIVILEGES ON DATABASE optilacteo_dev TO hexatech;

\q
```

### Paso 2 — Verificar la conexión

```bash
psql -U hexatech -d optilacteo_dev -h localhost
# Deberías ver: optilacteo_dev=>
```

### Paso 3 — Archivo `.env` (crearlo en la raíz, nunca subirlo a GitHub)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=hexatech
DB_PASS=hexatech2026
DB_NAME=optilacteo_dev
JWT_SECRET=hexatech_secret_local_2026
NODE_ENV=development
```

> ⚠️ El `.env` ya está en `.gitignore`. Usá `.env.example` como referencia.

### Paso 4 — Migraciones con TypeORM

```bash
# Generar migración nueva (cuando cambiás una entidad)
npx typeorm migration:generate src/migrations/NombreMigracion -d src/data-source.ts

# Correr migraciones pendientes
npx typeorm migration:run -d src/data-source.ts

# Revertir la última migración
npx typeorm migration:revert -d src/data-source.ts
```

> ⚠️ Nunca usar `synchronize: true` fuera del entorno local de prueba rápida.

---

## 3. Ramas del repositorio y orden de trabajo

### Estructura de ramas

```
main          ← baseline oficial. Solo recibe merges desde develop al cierre de cada Sprint.
│
└── develop   ← rama de integración. Todo el desarrollo converge aquí.
     │
     ├── feature/saas-gestion-empresas       (1)
     ├── feature/saas-aislamiento-datos      (2)
     ├── feature/auth-gestion-usuarios       (3)
     ├── feature/auth-roles-permisos         (4)
     ├── feature/auth-inicio-sesion          (5)
     ├── feature/auth-reset-password         (6)
     ├── feature/auth-cierre-sesion          (7)
     ├── feature/auth-cierre-inactividad     (8)
     └── feature/auth-bloqueo-intentos       (9)
```

### Orden de desarrollo recomendado — Sprint 1

Respetá este orden para evitar bloqueos por dependencias:

| # | Rama | Por qué va en este orden |
|---|------|--------------------------|
| 1 | `feature/saas-gestion-empresas` | Primero: define la entidad `Empresa` y el `tenant_id` base |
| 2 | `feature/saas-aislamiento-datos` | Depende de `Empresa` — aplica `tenant_id` a todas las tablas |
| 3 | `feature/auth-gestion-usuarios` | Depende de `Empresa` — el usuario pertenece a un tenant |
| 4 | `feature/auth-roles-permisos` | Depende de `Usuario` |
| 5 | `feature/auth-inicio-sesion` | Depende de `Usuario` + `Roles` |
| 6 | `feature/auth-reset-password` | Depende de `Usuario` |
| 7 | `feature/auth-cierre-sesion` | Depende de `auth-inicio-sesion` |
| 8 | `feature/auth-cierre-inactividad` | Depende de `auth-cierre-sesion` |
| 9 | `feature/auth-bloqueo-intentos` | Depende de `auth-inicio-sesion` |

> 💡 Las ramas sin dependencia entre sí pueden trabajarse en paralelo por distintos integrantes.

### Reglas de ramas

| Rama | Push directo | Cómo entran los cambios |
|------|-------------|------------------------|
| `main` | ❌ Nunca | Solo PR aprobado desde `develop` al cierre del Sprint |
| `develop` | ❌ Nunca | Solo PR aprobado desde `feature/*` o `fix/*` |
| `feature/*` | ✅ El integrante asignado | Push directo, luego PR hacia `develop` |
| `fix/*` | ✅ El integrante asignado | Push directo, luego PR hacia `develop` |

---

## 4. Flujo completo para trabajar una historia

```bash
# 1. Sincronizá develop antes de arrancar
git checkout develop
git pull origin develop

# 2. Posicionarte en tu rama (ya están creadas)
git checkout feature/saas-gestion-empresas   # ejemplo

# 3. Sincronizar tu rama con develop
git rebase origin/develop

# 4. Desarrollar y hacer commits frecuentes
git add .
git commit -m "feat(saas): agregar entidad Empresa con tenant_id y soft delete"

# 5. Antes del push, sincronizar nuevamente
git fetch origin
git rebase origin/develop

# 6. Push
git push origin feature/saas-gestion-empresas

# 7. Abrir Pull Request hacia develop en GitHub
# 8. Esperar aprobación de al menos 1 integrante distinto al autor
# 9. Merge aprobado → cerrar el Issue vinculado
```

> ⚠️ Nunca hacer `git push origin develop` ni `git push origin main` directo.  
> ⚠️ Nunca aprobar tu propio PR.

---

## 5. Estructura de módulos NestJS — SOLID + Repository

### Árbol de carpetas por módulo

```
src/
  modules/
    <modulo>/
      dto/
        create-<modulo>.dto.ts     ← validación de entrada (class-validator)
        update-<modulo>.dto.ts
      entities/
        <modulo>.entity.ts         ← decoradores TypeORM
      interfaces/
        i-<modulo>.repository.ts   ← contrato del repositorio (DIP)
      mappers/
        <modulo>.mapper.ts         ← conversión Entity ↔ DTO
      repositories/
        <modulo>.repository.ts     ← implementación TypeORM
      <modulo>.controller.ts       ← solo HTTP, delega al Service
      <modulo>.controller.spec.ts  ← tests del controller
      <modulo>.service.ts          ← toda la lógica de negocio
      <modulo>.service.spec.ts     ← tests del service
      <modulo>.module.ts           ← registro del módulo
```

### Responsabilidades por capa

| Capa | Hace | NO hace |
|------|------|---------|
| **Controller** | Recibe request, valida DTO, llama al Service, devuelve response HTTP | Lógica de negocio, acceso a BD |
| **Service** | Implementa reglas de negocio, orquesta repositorios | Manejar HTTP, SQL directo |
| **Repository** | Consultas a la BD via TypeORM | Reglas de negocio, HTTP |
| **Entity** | Mapeo de tabla con decoradores TypeORM | Métodos de negocio |
| **DTO** | Validar y tipar datos de entrada/salida | Persistencia, lógica |

### Campos obligatorios en TODAS las entidades

```typescript
@Column()
tenant_id: string;            // aislamiento multi-tenant — NUNCA omitir

@CreateDateColumn()
created_at: Date;

@UpdateDateColumn()
updated_at: Date;

@DeleteDateColumn()
deleted_at: Date;             // soft delete — NUNCA usar DELETE físico
```

### Principios SOLID

- **S** — cada clase tiene una sola responsabilidad.
- **O** — extender sin modificar clases existentes (usar interfaces).
- **L** — repositorios intercambiables a través de su interfaz.
- **I** — interfaces específicas por módulo.
- **D** — el Service depende de `IModuloRepository`, no de la clase concreta.

---

---

## 6. Enums

Los enums representan valores fijos del dominio (estados, roles, niveles, tipos). Van en una carpeta `enums/` dentro del módulo al que pertenecen.

### Estructura

```
src/
  modules/
    auth/
      enums/
        rol.enum.ts
        estado-usuario.enum.ts
    alertas/
      enums/
        nivel-alerta.enum.ts
```

> Si un enum es compartido por más de un módulo, va en `src/common/enums/`.

### Cómo definir un enum

```typescript
// src/modules/auth/enums/rol.enum.ts
export enum Rol {
  ADMIN         = 'ADMIN',
  JEFE_PRODUCCION = 'JEFE_PRODUCCION',
  OPERARIO      = 'OPERARIO',
}
```

```typescript
// src/modules/alertas/enums/nivel-alerta.enum.ts
export enum NivelAlerta {
  INFORMATIVA = 'INFORMATIVA',
  PREVENTIVA  = 'PREVENTIVA',
  CRITICA     = 'CRITICA',
}
```

### Reglas de uso

- Siempre usar **strings** como valor (`= 'VALOR'`), nunca numéricos — facilita la lectura en la BD y en los logs.
- El nombre del enum en **PascalCase**, los valores en **UPPER_SNAKE_CASE**.
- Usar el enum en las entidades con `@Column({ type: 'enum', enum: NombreEnum })`.
- Usar el enum en los DTOs con el decorador `@IsEnum(NombreEnum)` de class-validator.

### Ejemplo en entidad y DTO

```typescript
// en la entidad
@Column({ type: 'enum', enum: Rol, default: Rol.OPERARIO })
rol: Rol;

// en el DTO
@IsEnum(Rol, { message: 'El rol debe ser ADMIN, JEFE_PRODUCCION u OPERARIO' })
rol: Rol;
```


## 7. Mappers

Los mappers convierten entre `Entity` (lo que viene de la BD) y `DTO` (lo que se expone o recibe por la API). Toda conversión va en `mappers/` — nunca en el Service ni en el Controller.

### Estructura del mapper

```typescript
// src/modules/usuario/mappers/usuario.mapper.ts
import { UsuarioEntity } from '../entities/usuario.entity';
import { UsuarioDto } from '../dto/usuario.dto';

export class UsuarioMapper {

  // Convierte la entidad de BD al DTO que se expone en la API
  static toDto(entity: UsuarioEntity): UsuarioDto {
    return {
      id:        entity.id,
      nombre:    entity.nombre,
      email:     entity.email,
      rol:       entity.rol,
      empresaId: entity.tenant_id,
      activo:    entity.deleted_at === null,
      creadoEn:  entity.created_at,
    };
  }

  // Convierte el DTO de creación a entidad para persistir en la BD
  static toEntity(dto: CreateUsuarioDto): Partial<UsuarioEntity> {
    return {
      nombre:    dto.nombre,
      email:     dto.email,
      rol:       dto.rolId,
      tenant_id: dto.empresaId,
    };
  }
}
```

### Reglas de uso

- El **Service** llama al mapper antes de devolver datos al Controller.
- El **Controller** nunca hace conversiones directas — siempre delega al Service que usa el mapper.
- Los mappers son clases con métodos **estáticos** — no se inyectan como dependencias.
- Un mapper por módulo — nunca un mapper global que mezcle entidades de distintos dominios.

### Ejemplo de uso en el Service

```typescript
// usuario.service.ts
async findAll(): Promise<UsuarioDto[]> {
  const entities = await this.usuarioRepository.findAll();
  return entities.map(UsuarioMapper.toDto); // mapper acá
}

async create(dto: CreateUsuarioDto): Promise<UsuarioDto> {
  const entity = UsuarioMapper.toEntity(dto); // mapper acá
  const saved  = await this.usuarioRepository.save(entity);
  return UsuarioMapper.toDto(saved);
}
```

---

## 8. Testing con Jest

NestJS incluye Jest por defecto. Cada clase con lógica debe tener su `.spec.ts` al lado.

### Filosofía de testing del equipo

Los tests deben validar **comportamiento real desde la perspectiva del usuario**, no simplemente que un método existe o que devuelve algo genérico. Cada test debe responder a la pregunta: **¿qué espera el usuario que pase cuando hace X?**

❌ Test que no valida nada útil:
```
it('login debe funcionar', () => {
  expect(service).toBeDefined();
});
```

✅ Test que valida comportamiento real:
```
it('cuando el usuario ingresa credenciales correctas, debe recibir un token JWT', ...)
it('cuando el email no existe, debe lanzar UnauthorizedException', ...)
it('cuando la contraseña es incorrecta, debe lanzar UnauthorizedException', ...)
it('cuando la cuenta está bloqueada, debe lanzar ForbiddenException', ...)
```

### Archivos de test

| Archivo | Qué testea |
|---------|-----------|
| `<modulo>.service.spec.ts` | Comportamiento de negocio del Service (repositorio mockeado) |
| `<modulo>.controller.spec.ts` | Que el Controller delega correctamente al Service |

> El repositorio **siempre se mockea** — nunca se conecta a la BD real en tests unitarios.

### Ejemplo real — AuthService (inicio de sesión)

Este ejemplo está basado en la historia **HU: Como operario, quiero iniciar sesión con mi email y contraseña para acceder al sistema**.

```typescript
// src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IUsuarioRepository } from '../usuario/interfaces/i-usuario.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EstadoUsuario } from './enums/estado-usuario.enum';

const mockUsuarioRepository = {
  findByEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService — inicio de sesión', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: IUsuarioRepository, useValue: mockUsuarioRepository },
        { provide: JwtService,          useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('cuando el usuario ingresa credenciales correctas, debe recibir un token JWT', async () => {
    // Arrange — simulamos un usuario activo en la BD con contraseña hasheada
    const passwordHash = await bcrypt.hash('miPassword123', 10);
    mockUsuarioRepository.findByEmail.mockResolvedValue({
      id:            'usuario-uuid-1',
      email:         'operario@lacteo.com',
      password_hash: passwordHash,
      estado:        EstadoUsuario.ACTIVO,
      tenant_id:     'empresa-uuid-1',
      rol:           'OPERARIO',
    });
    mockJwtService.sign.mockReturnValue('jwt.token.generado');

    // Act — el usuario intenta loguearse
    const resultado = await service.login({
      email:    'operario@lacteo.com',
      password: 'miPassword123',
    });

    // Assert — debe recibir el token y sus datos básicos
    expect(resultado.access_token).toBe('jwt.token.generado');
    expect(resultado.usuario.email).toBe('operario@lacteo.com');
    expect(resultado.usuario.rol).toBe('OPERARIO');
  });

  it('cuando el email no existe en el sistema, debe lanzar UnauthorizedException', async () => {
    // Arrange — el email no está registrado
    mockUsuarioRepository.findByEmail.mockResolvedValue(null);

    // Act & Assert — no debe dar pistas de si el email existe o no (seguridad)
    await expect(
      service.login({ email: 'noexiste@lacteo.com', password: 'cualquiera' })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('cuando la contraseña es incorrecta, debe lanzar UnauthorizedException', async () => {
    // Arrange — el usuario existe pero la contraseña no coincide
    const passwordHash = await bcrypt.hash('passwordCorrecto', 10);
    mockUsuarioRepository.findByEmail.mockResolvedValue({
      id:            'usuario-uuid-1',
      email:         'operario@lacteo.com',
      password_hash: passwordHash,
      estado:        EstadoUsuario.ACTIVO,
      tenant_id:     'empresa-uuid-1',
    });

    // Act & Assert
    await expect(
      service.login({ email: 'operario@lacteo.com', password: 'passwordIncorrecto' })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('cuando la cuenta está bloqueada por intentos fallidos, debe lanzar ForbiddenException', async () => {
    // Arrange — usuario con estado BLOQUEADO
    mockUsuarioRepository.findByEmail.mockResolvedValue({
      id:            'usuario-uuid-1',
      email:         'operario@lacteo.com',
      password_hash: 'hash',
      estado:        EstadoUsuario.BLOQUEADO,
      tenant_id:     'empresa-uuid-1',
    });

    // Act & Assert — debe rechazar el acceso con mensaje claro
    await expect(
      service.login({ email: 'operario@lacteo.com', password: 'miPassword123' })
    ).rejects.toThrow(ForbiddenException);
  });

  it('cuando la cuenta está inactiva, debe lanzar ForbiddenException', async () => {
    // Arrange — usuario dado de baja lógica
    mockUsuarioRepository.findByEmail.mockResolvedValue({
      id:            'usuario-uuid-1',
      email:         'operario@lacteo.com',
      password_hash: 'hash',
      estado:        EstadoUsuario.INACTIVO,
      tenant_id:     'empresa-uuid-1',
    });

    // Act & Assert
    await expect(
      service.login({ email: 'operario@lacteo.com', password: 'miPassword123' })
    ).rejects.toThrow(ForbiddenException);
  });
});
```

### Comandos para correr tests

```bash
npm run test          # todos los tests
npm run test:watch    # modo watch (re-ejecuta al guardar)
npm run test:cov      # con cobertura
```

### Convenciones de tests

- **Nombres en español que describen el comportamiento del usuario**, no el método: `'cuando el usuario ingresa credenciales correctas, debe recibir un token JWT'` no `'login should work'`.
- Estructura **Arrange / Act / Assert** con comentarios en cada bloque.
- Cada `describe` agrupa los tests de **una historia de usuario o funcionalidad**.
- Cubrir siempre el **camino feliz** + todos los **casos de error reales** que el usuario puede provocar.
- `afterEach(() => jest.clearAllMocks())` en todos los describe.
- Repositorio siempre mockeado — nunca conectar a la BD real.
- Cobertura mínima esperada: **todas las rutas lógicas del Service** que corresponden a criterios de aceptación de la historia.

---

## 9. Convenciones de código

### Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Clases / Entidades / DTOs | `PascalCase` | `EmpresaEntity`, `CreateEmpresaDto` |
| Variables / Funciones / Métodos | `camelCase` | `tenantId`, `findAllActive()` |
| Constantes | `UPPER_SNAKE_CASE` | `MAX_LOGIN_ATTEMPTS` |
| Archivos | `kebab-case` | `empresa.service.ts` |
| Tablas en BD | `snake_case` plural | `empresas`, `usuarios` |
| Columnas en BD | `snake_case` | `tenant_id`, `deleted_at` |
| Rutas de API | `kebab-case` plural | `/api/v1/empresas`, `/api/v1/usuarios` |
| Interfaces | `I` + `PascalCase` | `IEmpresaRepository` |

### Idioma
- **Inglés**: variables, funciones, clases, rutas, columnas de BD.
- **Español**: comentarios JSDoc, mensajes de commit, descripciones Swagger.

### Linter
```bash
npx eslint . --fix   # correr antes de cada commit
```
- Indentación: 2 espacios. Sin tabs.
- Sin `console.log` → usar `Logger` de NestJS.
- Máximo 1 clase por archivo.

---

## 10. Conventional Commits

```
<tipo>(<scope>): <descripción en español>
```

| Tipo | Cuándo |
|------|--------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Documentación |
| `test` | Tests |
| `refactor` | Refactorización sin cambio de comportamiento |
| `chore` | Mantenimiento, dependencias |

### Ejemplos correctos
```bash
feat(saas): agregar entidad Empresa con tenant_id y soft delete
feat(auth): agregar endpoint POST /auth/login con validación JWT
fix(auth): corregir validación de token expirado en guard
refactor(usuarios): extraer lógica de hash a PasswordService
test(auth): agregar tests unitarios para AuthService
```

### Ejemplos incorrectos ❌
```bash
"fix cosas"
"wip"
feat: cambios    # sin scope
```

---

## 11. Template de Pull Request

```markdown
## Descripción del cambio
Qué se implementó y por qué.

## Issue relacionado
Closes #<NNN>

## Tipo de cambio
- [ ] feat  
- [ ] fix  
- [ ] refactor  
- [ ] test  
- [ ] chore

## Rama origen → destino
`feature/<modulo>-<descripcion>` → `develop`

## Cambios realizados
- `archivo1.ts`: descripción
- `archivo2.ts`: descripción

## Pruebas realizadas
- [ ] Tests unitarios pasando (`npm run test`)
- [ ] Endpoint probado en Thunder Client / Postman
- [ ] Sin defectos conocidos

## Checklist
- [ ] Estructura Controller → Service → Repository respetada
- [ ] Todas las entidades tienen `tenant_id` y `deleted_at`
- [ ] Sin DELETE físico (soft delete con `deleted_at`)
- [ ] Endpoints documentados en Swagger
- [ ] `.env` NO incluido en el commit
- [ ] Conventional Commits en todos los commits
- [ ] ESLint sin errores (`npx eslint . --fix`)
- [ ] Migraciones generadas y corriendo sin errores
```

> ⚠️ PR sin checklist completo no se aprueba.  
> ⚠️ El autor NO puede aprobar su propio PR.

---

## 12. Definition of Done (DoD)

Una historia se considera **TERMINADA** cuando cumple **TODO**:

- [ ] Estructura de capas respetada (Controller → Service → Repository).
- [ ] PR aprobado por al menos 1 integrante distinto al autor.
- [ ] Tests ejecutados y resultados registrados.
- [ ] Sin defectos críticos sin resolver.
- [ ] Integración con módulos existentes sin romper funcionalidades previas.
- [ ] Criterios de aceptación validados por el Product Owner.
- [ ] Endpoints documentados en Swagger.
- [ ] Conventional Commits en todos los commits.
- [ ] `.env` no subido al repositorio.
- [ ] Migraciones generadas y corriendo sin errores.
- [ ] ESLint sin errores.
- [ ] Issue de GitHub cerrado con referencia al PR.

---

## 13. Qué pedirle a la IA y cómo

### ✅ Prompts efectivos

```
Generame el módulo de Empresa en NestJS siguiendo la estructura
Controller → Service → Repository. La entidad debe tener tenant_id
y deleted_at. Necesito el endpoint GET /api/v1/empresas que filtre
por el tenant autenticado via JWT guard.

---

Necesito el DTO de creación de usuario con class-validator.
Campos: email (email único), password (min 8 chars), nombre (string),
rolId (UUID), empresaId (UUID).

---

Generame la migración TypeORM para crear la tabla usuarios con
los campos: id (uuid), email, password_hash, nombre, tenant_id,
rol_id, created_at, updated_at, deleted_at.
```

### ❌ Evitar
```
"Haceme un CRUD de usuarios"         ← sin contexto del proyecto
"Cómo hago login en Node"            ← sin mencionar NestJS ni JWT
```

### ✅ La IA siempre debe incluir
- Dónde va cada archivo.
- Imports explícitos.
- Decoradores TypeORM y NestJS correctos.
- `tenant_id` y `deleted_at` en entidades.
- Si hay que registrar el módulo en `app.module.ts`.

---

*HexaTech — Equipo 2 | UTN FRVM | Proyecto Final 2026 | OptiLácteo*  
*Cignetti · Milanesio · Romero · Toranzo · Torres | PO: Ing. Villafañe / Ing. Cassani*
