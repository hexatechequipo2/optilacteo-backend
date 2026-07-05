import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsHandler');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      // Mismo shape que ya devuelven hoy nuestras HttpException
      // (NotFoundException, ForbiddenException, etc.) -- sin cambios.
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    // Cualquier otra cosa (bug, error de driver, excepcion no controlada):
    // mensaje generico fijo, siempre, sin importar NODE_ENV.
    this.logger.error(
      `Excepcion no controlada en ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
