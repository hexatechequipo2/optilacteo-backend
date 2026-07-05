import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerException, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

function buildLoginContext(ip: string): ExecutionContext {
  const request = { ip, headers: {} };
  const response = { header: jest.fn() };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => AuthController.prototype.login,
    getClass: () => AuthController,
  } as unknown as ExecutionContext;
}

// Este spec usa el ThrottlerGuard real (con su storage en memoria), sin
// mockearlo, para validar el comportamiento real de rate limiting descrito
// en @Throttle({ default: { limit: 5, ttl: 60_000 } }) sobre POST /login.
describe('Rate limiting real de POST /auth/login', () => {
  let module: TestingModule;
  let guard: ThrottlerGuard;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }])],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { login: jest.fn(), logout: jest.fn(), refresh: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get(ThrottlerGuard);
    // TestingModule.compile() no dispara lifecycle hooks (eso requiere
    // app.init()); ThrottlerGuard arma su config interna en onModuleInit().
    await guard.onModuleInit();
  });

  afterEach(async () => {
    // ThrottlerStorageService mantiene un interval de limpieza interno;
    // sin cerrar el modulo, Jest queda con un handle abierto.
    await module.close();
  });

  it('permite exactamente 5 intentos por IP y bloquea el 6to con ThrottlerException (429)', async () => {
    const context = buildLoginContext('10.0.0.1');

    for (let intento = 1; intento <= 5; intento++) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }

    await expect(guard.canActivate(context)).rejects.toThrow(ThrottlerException);
  });

  it('no mezcla el contador entre IPs distintas', async () => {
    const contextIpA = buildLoginContext('10.0.0.2');
    const contextIpB = buildLoginContext('10.0.0.3');

    for (let intento = 1; intento <= 5; intento++) {
      await expect(guard.canActivate(contextIpA)).resolves.toBe(true);
    }
    await expect(guard.canActivate(contextIpA)).rejects.toThrow(ThrottlerException);

    // La IP B arranca en cero pese a que la IP A ya esta bloqueada.
    await expect(guard.canActivate(contextIpB)).resolves.toBe(true);
  });
});
