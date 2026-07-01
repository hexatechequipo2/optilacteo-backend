import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { Empresa } from '../module/empresa/entities/empresa.entity';
import { User } from '../module/user/entities/user.entity';
import { Role } from '../module/user/enums/role.enum';

async function seed() {
  await dataSource.initialize();
  console.log('Data source inicializado.');

  const empresaRepo = dataSource.getRepository(Empresa);
  const userRepo = dataSource.getRepository(User);

  // 1. Empresa de prueba (si no existe)
  let empresa = await empresaRepo.findOne({ where: { name: 'OptiLácteo Demo' } });
  if (!empresa) {
    empresa = empresaRepo.create({
      name: 'OptiLácteo Demo',
      email: 'contacto@optilacteo.demo',
    });
    empresa = await empresaRepo.save(empresa);
    console.log('Empresa de prueba creada:', empresa.name);
  } else {
    console.log('Empresa de prueba ya existía, se reutiliza.');
  }

  // 2. Usuario admin (si no existe)
  const existingAdmin = await userRepo.findOne({ where: { email: 'admin@optilacteo.com' } });
  if (existingAdmin) {
    console.log('El usuario admin ya existe, no se crea de nuevo.');
  } else {
    const hashedPassword = await bcrypt.hash('Admin2026!', 10);
    const admin = userRepo.create({
      name: 'Admin Demo',
      email: 'admin@optilacteo.com',
      password: hashedPassword,
      role: Role.ADMIN,
      empresa,
    });
    await userRepo.save(admin);
    console.log('Usuario admin creado: admin@optilacteo.com / Admin2026!');
  }

  await dataSource.destroy();
  console.log('Seed finalizado.');
}

seed().catch((err) => {
  console.error('Error corriendo el seed:', err);
  process.exit(1);
});