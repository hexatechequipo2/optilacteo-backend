import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { Empresa } from '../module/empresa/entities/empresa.entity';
import { User } from '../module/user/entities/user.entity';
import { Rol } from '../module/rol/entities/rol.entity';
import { PermisoModulo } from '../module/permiso/entities/permiso-modulo.entity';
import { PERMISOS_POR_ROL } from '../module/rol/config/roles-permisos.config';
import { ROLES } from '../module/rol/constants/roles.constants';

async function seed() {
  await dataSource.initialize();

  const empresaRepo = dataSource.getRepository(Empresa);
  const userRepo = dataSource.getRepository(User);
  const rolRepo = dataSource.getRepository(Rol);
  const permisoRepo = dataSource.getRepository(PermisoModulo);

  let empresa = await empresaRepo.findOne({
    where: { name: 'OptiLácteo Demo' },
  });

  if (!empresa) {
    empresa = await empresaRepo.save(
      empresaRepo.create({
        name: 'OptiLácteo Demo',
        cuit: '20000000001',
        email: 'contacto@demo.com',
      }),
    );
  }

  let adminRole = await rolRepo.findOne({
    where: { nombre: 'Administrador' },
  });

  if (!adminRole) {
    adminRole = await rolRepo.save(
      rolRepo.create({
        nombre: 'Administrador',
        descripcion: 'Rol administrador sistema',
        empresa,
      }),
    );
  }

  const existingAdmin = await userRepo.findOne({
    where: { email: 'admin@optilacteo.com' },
  });

  if (!existingAdmin) {
    const hashed = await bcrypt.hash('Admin2026!', 10);

    await userRepo.save(
      userRepo.create({
        name: 'Admin Demo',
        email: 'admin@optilacteo.com',
        password: hashed,
        empresa,
        rol: adminRole,
      }),
    );
  }

  // HU-65: usuario Gerente de prueba (el rol solo existía para Administrador
  // en este seed; se necesita uno real para probar manualmente el
  // inventario de sensores, restringido a ese rol).
  let gerenteRole = await rolRepo.findOne({
    where: { nombre: ROLES.GERENTE },
  });

  if (!gerenteRole) {
    gerenteRole = await rolRepo.save(
      rolRepo.create({
        nombre: ROLES.GERENTE,
        descripcion: 'Rol gerente sistema',
        empresa,
      }),
    );

    const permisosDefault = PERMISOS_POR_ROL[ROLES.GERENTE];
    await permisoRepo.save(
      permisosDefault.map((p) => permisoRepo.create({ ...p, rol: gerenteRole! })),
    );
  }

  const existingGerente = await userRepo.findOne({
    where: { email: 'gerente@optilacteo.com' },
  });

  if (!existingGerente) {
    const hashed = await bcrypt.hash('Gerente2026!', 10);

    await userRepo.save(
      userRepo.create({
        name: 'Gerente Demo',
        email: 'gerente@optilacteo.com',
        password: hashed,
        empresa,
        rol: gerenteRole,
      }),
    );
  }

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});