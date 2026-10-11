import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { RetencionArchivadoService } from '../src/module/retencion/retencion-archivado.service';

// Uso: ts-node -r tsconfig-paths/register src/scripts/probar-archivado-retencion.ts <empresaId>
// Ejemplo: ts-node -r tsconfig-paths/register src/scripts/probar-archivado-retencion.ts 1
async function main() {
  const empresaId = Number(process.argv[2]);
  if (!empresaId) {
    console.error('Uso: probar-archivado-retencion.ts <empresaId>');
    process.exit(1);
  }

  console.log(`Iniciando contexto de Nest...`);
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const archivadoService = app.get(RetencionArchivadoService);

  console.log(`Corriendo archivarVencidos(${empresaId})...`);
  await archivadoService.archivarVencidos(empresaId);
  console.log('Listo. Revisar logs arriba para ver qué se archivó (o si algo falló al subir a S3).');

  await app.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('Error corriendo el script:', error);
  process.exit(1);
});