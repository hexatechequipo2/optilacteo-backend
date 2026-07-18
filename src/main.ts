import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

async function bootstrap() {
  // MODIFICADO: ya no hace falta NestExpressApplication ni useStaticAssets,
  // el logo vive en R2, no en el filesystem del backend.
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      // Necesario para que el navegador cargue la imagen del logo desde
      // el dominio de R2 (otro origen) sin bloquearla.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const allowedOrigins = (process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Optilacteo API')
    .setDescription('Documentación de la API de Optilacteo Backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();