/**
 * Seed de la demo en vivo (src/module/demo/README.md). Idempotente: crea o
 * actualiza, en la base que apunta el .env, todo lo que necesita la
 * empresa demo, y al final imprime los IDs para las variables DEMO_*.
 *
 *   npm run seed:demo
 *
 * - Empresa "Demo en vivo" (plan enterprise). La alta va por
 *   EmpresaService.create(), así queda con sus módulos y la matriz de
 *   permisos por defecto igual que una empresa real.
 * - Proveedor y tambo activos.
 * - Umbral de temperatura para leche cruda: 2 a 6 °C (banda de alerta 1-7).
 * - Usuario de la tele, rol Responsable de calidad (recibe también las
 *   notificaciones de "lote no apto"). Si ya existe, no se le cambia la
 *   contraseña.
 * - Destinatarios de alertas de umbral para los 3 niveles: ese usuario.
 * - Sin horarios de silencio (se borran los de la empresa demo, igual que
 *   DELETE /notificaciones/configuracion-silencio).
 * - Sensores "Sensor 1..8 · libre", temperatura, ACTIVO. Crea solo los que
 *   faltan; los que ya existían (con cualquier visitante) vuelven a
 *   "· libre". Todos con umbral de desconexión de un año: entre visitantes
 *   pasan mucho tiempo sin lecturas y SensorDesconexionCronService no debe
 *   mandar alertas de "sensor desconectado" a la tele.
 *
 * Contraseña del usuario nuevo: DEMO_SEED_PASSWORD o "DemoTele2026!".
 */
import 'dotenv/config';
import type * as AppModuleExports from '../app.module';
import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource, IsNull, Like } from 'typeorm';
import { Empresa } from '../module/empresa/entities/empresa.entity';
import { EmpresaService } from '../module/empresa/empresa.service';
import { Plan } from '../module/empresa/enums/plan.enum';
import { PermisoService } from '../module/permiso/permiso.service';
import { Proveedor } from '../module/proveedores/entities/proveedor.entity';
import { EstadoProveedor } from '../module/proveedores/enums/estado-proveedor.enum';
import { Tambo } from '../module/tambo/entities/tambo.entity';
import { ConfiguracionParametro } from '../module/config-parametro/entities/config-parametro.entity';
import { Parametro } from '../module/config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../module/config-parametro/enums/tipo-materia-prima-enum';
import { User } from '../module/user/entities/user.entity';
import { Rol } from '../module/rol/entities/rol.entity';
import { ROLES } from '../module/rol/constants/roles.constants';
import { ConfiguracionNotificacionNivel } from '../module/notificaciones/entities/configuracion-notificacion-nivel.entity';
import { ConfiguracionSilencioAlerta } from '../module/notificaciones/entities/configuracion-silencio-alerta.entity';
import { NivelAlerta } from '../module/notificaciones/enums/nivel-alerta.enum';
import { Sensor } from '../module/sensor/entities/sensor.entity';
import { EstadoSensor } from '../module/sensor/enums/estado-sensor.enum';
import { TipoSensor } from '../module/sensor/enums/tipo-sensor.enum';
import { Ubicacion } from '../module/sensor/enums/ubicacion.enum';
import { DEMO_OCUPANTE_LIBRE } from '../module/demo/constants/demo.constants';

const DEMO = {
  empresa: {
    name: 'Demo en vivo',
    cuit: '30-99999999-0',
    email: 'demo@optilacteo.com',
  },
  proveedor: { razonSocial: 'Tambo Demo S.A.', cuit: '30-99999999-1' },
  tambo: 'Tambo Demo',
  usuario: { name: 'Tele Demo', email: 'tele@demo.optilacteo.com' },
  passwordPorDefecto: 'DemoTele2026!',
  cantidadSensores: 8,
  // Minutos (un año): pisa el umbral de desconexión de la empresa.
  umbralDesconexionMinutos: 525_600,
  umbral: { alertaMin: 1, min: 2, max: 6, alertaMax: 7 },
};

const logger = new Logger('SeedDemo');

async function seed() {
  // El seed no necesita el DemoModule, y con DEMO_MODE=true en el .env el
  // DemoService exige las DEMO_* que este script todavía no generó. Por
  // eso se apaga el flag y AppModule se carga recién después: el flag se
  // lee al evaluar el decorador de AppModule (el import type de arriba se
  // borra al compilar y no lo carga).
  process.env.DEMO_MODE = 'false';
  // require y no import(): con module "nodenext" un import() dinámico se
  // trata como ESM y exige extensión; el require se evalúa igual de tarde.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppModule } = require('../app.module') as typeof AppModuleExports;
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const ds = app.get(DataSource);

    const empresa = await asegurarEmpresa(
      ds,
      app.get(EmpresaService),
      app.get(PermisoService),
    );
    const proveedor = await asegurarProveedor(ds, empresa.id);
    const tambo = await asegurarTambo(ds, empresa.id, proveedor.id);
    await asegurarUmbral(ds, empresa.id);
    const { usuario, passwordNueva } = await asegurarUsuario(ds, empresa.id);
    await asegurarDestinatarios(ds, empresa.id, usuario.id);
    await quitarHorariosDeSilencio(ds, empresa.id);
    const sensores = await asegurarSensores(ds, empresa.id);

    // Bloque para copiar al .env: va por stdout sin el prefijo del Logger.
    process.stdout.write(
      [
        '',
        '# --- Demo en vivo: copiar al .env ---',
        'DEMO_MODE=true',
        `DEMO_EMPRESA_ID=${empresa.id}`,
        `DEMO_USUARIO_ID=${usuario.id}`,
        `DEMO_PROVEEDOR_ID=${proveedor.id}`,
        `DEMO_TAMBO_ID=${tambo.id}`,
        '',
        `# Usuario de la tele: ${usuario.email}` +
          (passwordNueva
            ? ` / ${passwordNueva}`
            : ' (ya existía, contraseña sin cambios)'),
        `# Sensores: ${sensores.map((s) => `${s.id} = "${s.nombre}"`).join(', ')}`,
        '',
      ].join('\n'),
    );
  } finally {
    await app.close();
  }
}

async function asegurarEmpresa(
  ds: DataSource,
  empresaService: EmpresaService,
  permisoService: PermisoService,
): Promise<Empresa> {
  const repo = ds.getRepository(Empresa);
  let empresa = await repo.findOne({ where: { cuit: DEMO.empresa.cuit } });

  if (!empresa) {
    await empresaService.create({ ...DEMO.empresa, plan: Plan.ENTERPRISE });
    empresa = await repo.findOneOrFail({ where: { cuit: DEMO.empresa.cuit } });
    logger.log(`Empresa creada (id ${empresa.id})`);
  } else {
    if (!empresa.isActive) {
      empresa.isActive = true;
      await repo.save(empresa);
    }
    // ON CONFLICT DO NOTHING: completa permisos faltantes sin pisar nada.
    await permisoService.otorgarPermisosPorDefecto(empresa.id);
    logger.log(`Empresa existente (id ${empresa.id})`);
  }
  return empresa;
}

async function asegurarProveedor(
  ds: DataSource,
  empresaId: number,
): Promise<Proveedor> {
  const repo = ds.getRepository(Proveedor);
  const existente = await repo.findOne({
    where: { empresaId, cuit: DEMO.proveedor.cuit },
  });
  return repo.save(
    repo.merge(existente ?? repo.create(), {
      ...DEMO.proveedor,
      empresaId,
      estado: EstadoProveedor.ACTIVA,
    }),
  );
}

async function asegurarTambo(
  ds: DataSource,
  empresaId: number,
  proveedorId: number,
): Promise<Tambo> {
  const repo = ds.getRepository(Tambo);
  const existente = await repo.findOne({
    where: { empresaId, proveedorId, nombre: DEMO.tambo },
  });
  return repo.save(
    repo.merge(existente ?? repo.create(), {
      nombre: DEMO.tambo,
      empresaId,
      proveedorId,
      activo: true,
    }),
  );
}

async function asegurarUmbral(ds: DataSource, empresaId: number) {
  const repo = ds.getRepository(ConfiguracionParametro);
  const clave = {
    empresaId,
    parametro: Parametro.TEMPERATURA,
    tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
  };
  const existente = await repo.findOne({ where: clave });
  await repo.save(
    repo.merge(existente ?? repo.create(), {
      ...clave,
      umbralAlertaMin: DEMO.umbral.alertaMin,
      umbralMin: DEMO.umbral.min,
      umbralMax: DEMO.umbral.max,
      umbralAlertaMax: DEMO.umbral.alertaMax,
    }),
  );
}

async function asegurarUsuario(
  ds: DataSource,
  empresaId: number,
): Promise<{ usuario: User; passwordNueva: string | null }> {
  const rol = await ds.getRepository(Rol).findOne({
    where: { nombre: ROLES.RESPONSABLE_CALIDAD, empresa: IsNull() },
  });
  if (!rol) {
    throw new Error(
      `No existe el rol de catálogo "${ROLES.RESPONSABLE_CALIDAD}". ¿Corriste las migraciones?`,
    );
  }

  const repo = ds.getRepository(User);
  const existente = await repo.findOne({
    where: { email: DEMO.usuario.email },
    relations: { empresa: true },
  });

  if (existente) {
    if (existente.empresa && existente.empresa.id !== empresaId) {
      throw new Error(
        `${DEMO.usuario.email} ya existe en otra empresa (id ${existente.empresa.id}).`,
      );
    }
    existente.empresa = { id: empresaId } as Empresa;
    existente.rolId = rol.id;
    existente.isActive = true;
    existente.failedLoginAttempts = 0;
    existente.lockedUntil = null;
    return { usuario: await repo.save(existente), passwordNueva: null };
  }

  const password = process.env.DEMO_SEED_PASSWORD || DEMO.passwordPorDefecto;
  const usuario = await repo.save(
    repo.create({
      ...DEMO.usuario,
      password: await bcrypt.hash(password, 10),
      empresa: { id: empresaId } as Empresa,
      rolId: rol.id,
      isActive: true,
    }),
  );
  return { usuario, passwordNueva: password };
}

async function asegurarDestinatarios(
  ds: DataSource,
  empresaId: number,
  usuarioId: number,
) {
  const repo = ds.getRepository(ConfiguracionNotificacionNivel);
  for (const nivelAlerta of Object.values(NivelAlerta)) {
    // El @Unique incluye rolId NULL, que en Postgres no choca: se busca a mano.
    const existe = await repo.findOne({
      where: { empresaId, nivelAlerta, usuarioId, rolId: IsNull() },
    });
    if (!existe) {
      await repo.save(
        repo.create({ empresaId, nivelAlerta, usuarioId, rolId: null }),
      );
    }
  }
}

async function quitarHorariosDeSilencio(ds: DataSource, empresaId: number) {
  const { affected } = await ds
    .getRepository(ConfiguracionSilencioAlerta)
    .delete({ empresaId });
  if (affected) {
    logger.warn(`Se borraron ${affected} horario(s) de silencio de la demo`);
  }
}

async function asegurarSensores(
  ds: DataSource,
  empresaId: number,
): Promise<Sensor[]> {
  const repo = ds.getRepository(Sensor);
  const sensores: Sensor[] = [];

  for (let n = 1; n <= DEMO.cantidadSensores; n++) {
    const existente = await repo.findOne({
      where: { empresaId, nombre: Like(`Sensor ${n} · %`) },
    });
    sensores.push(
      await repo.save(
        repo.merge(existente ?? repo.create(), {
          nombre: `Sensor ${n} · ${DEMO_OCUPANTE_LIBRE}`,
          tipo: existente?.tipo ?? TipoSensor.DIGITAL,
          marca: existente?.marca ?? 'Celular',
          parametro: Parametro.TEMPERATURA,
          rangoMinFavor: DEMO.umbral.min,
          rangoMaxFavor: DEMO.umbral.max,
          estado: EstadoSensor.ACTIVO,
          umbralDesconexionMinutos: DEMO.umbralDesconexionMinutos,
          ubicacion: existente?.ubicacion ?? Ubicacion.CAMARA_FRIGORIFICA_1,
          empresaId,
        }),
      ),
    );
  }
  return sensores;
}

seed().catch((err) => {
  logger.error(err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
