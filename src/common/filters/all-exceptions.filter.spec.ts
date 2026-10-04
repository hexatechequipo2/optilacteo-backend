import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', url: '/x' }),
      }),
    } as unknown as ArgumentsHost;
  });

  it.each([
    'Recurso sin permiso configurado.',
    'Usuario no identificado.',
    'El usuario no tiene un rol activo asignado.',
    'Mensaje cualquiera',
  ])('ForbiddenException("%s") llega como 403 con su mensaje', (mensaje) => {
    filter.catch(new ForbiddenException(mensaje), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: mensaje }),
    );
  });

  it('las demás HttpException conservan su status y cuerpo', () => {
    filter.catch(new BadRequestException('dato inválido'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: 'dato inválido' }),
    );
  });

  it('un error no controlado responde 500 genérico', () => {
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
