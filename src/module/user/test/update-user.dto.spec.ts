import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from '../dto/update-user.dto';

// Mismas opciones que el ValidationPipe global (main.ts).
const validar = (body: object) =>
  validate(plainToInstance(UpdateUserDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('UpdateUserDto', () => {
  it('rechaza rolId: el rol se cambia solo por PUT /roles/usuarios/:usuarioId', async () => {
    const errores = await validar({ name: 'x', rolId: 3 });
    expect(errores.map((e) => e.property)).toEqual(['rolId']);
  });

  it('acepta los campos editables y empresaId', async () => {
    await expect(
      validar({
        name: 'x',
        email: 'x@y.com',
        password: '123456',
        empresaId: 1,
      }),
    ).resolves.toEqual([]);
  });
});
