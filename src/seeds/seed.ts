import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { Empresa } from '../module/empresa/entities/empresa.entity';
import { User } from '../module/user/entities/user.entity';
import { Rol } from '../module/rol/entities/rol.entity';

async function seed() {
  await dataSource.initialize();

  const empresaRepo = dataSource.getRepository(Empresa);
  const userRepo = dataSource.getRepository(User);
  const rolRepo = dataSource.getRepository(Rol);

  let empresa = await empresaRepo.findOne({
    where: { name: 'OptiLácteo Demo' },
  });

  if (!empresa) {
    empresa = await empresaRepo.save(
      empresaRepo.create({
        name: 'OptiLácteo Demo',
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

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});