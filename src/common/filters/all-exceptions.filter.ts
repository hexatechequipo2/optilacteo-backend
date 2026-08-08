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
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Enmascarar Forbidden (403) a Not Found (404) para evitar Information Disclosure
      // Esto previene que un atacante identifique la existencia de recursos ajenos.
      if (status === HttpStatus.FORBIDDEN) {
        // Si el mensaje viene del PermissionsGuard o RolesGuard, devolvemos 403 explícito
        const exceptionMessage =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message;

        if (exceptionMessage?.includes('permiso') || exceptionMessage?.includes('Rol')) {
          response.status(HttpStatus.FORBIDDEN).json({
            statusCode: HttpStatus.FORBIDDEN,
            message: exceptionMessage || 'Acceso denegado',
          });
          return;
        }

        // Caso genérico: enmascarar como 404
        response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Recurso no encontrado',
        });
        return;
      }

      response.status(status).json(exceptionResponse);
      return;
    }

    // Cualquier error no controlado (bugs, fallos de conexión, etc.)
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