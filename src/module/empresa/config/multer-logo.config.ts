import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export const multerLogoOptions = {
  // MODIFICADO: memoryStorage en vez de diskStorage — el archivo queda en
  // file.buffer y se sube a R2 desde el service, nunca toca el disco del
  // contenedor (necesario para que sobreviva a redeploys en Railway).
  storage: memoryStorage(),
  fileFilter: (
    req: unknown,
    file: Express.Multer.File,
    callback: Function,
  ) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException('El logo debe ser formato PNG o JPG'),
        false,
      );
    }
    callback(null, true);
  },
  limits: { fileSize: MAX_SIZE_BYTES },
};