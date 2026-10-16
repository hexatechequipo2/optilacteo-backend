import { Logger } from '@nestjs/common';
import { DemoIpThrottlerGuard } from '../guards/demo-ip-throttler.guard';

// getTracker es protected y solo usa el logger del guard: se prueba sobre
// el prototipo, sin armar el ThrottlerModule.
class GuardDePrueba extends DemoIpThrottlerGuard {
  tracker(req: Record<string, any>): Promise<string> {
    return this.getTracker(req);
  }
}

describe('DemoIpThrottlerGuard', () => {
  const guard = Object.assign(Object.create(GuardDePrueba.prototype), {
    logger: new Logger('test'),
  }) as GuardDePrueba;

  let log: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    log.mockRestore();
  });

  it('usa el último valor de X-Forwarded-For (el que agrega el proxy)', async () => {
    await expect(
      guard.tracker({
        ip: '10.0.0.1',
        headers: { 'x-forwarded-for': '1.2.3.4, 181.1.2.3 ' },
      }),
    ).resolves.toBe('181.1.2.3');
  });

  it('acepta el header como array (toma el último valor del último)', async () => {
    await expect(
      guard.tracker({
        ip: '10.0.0.1',
        headers: { 'x-forwarded-for': ['1.2.3.4', '5.6.7.8, 181.1.2.3'] },
      }),
    ).resolves.toBe('181.1.2.3');
  });

  it('sin header (o vacío) cae a req.ip', async () => {
    await expect(guard.tracker({ ip: '10.0.0.1', headers: {} })).resolves.toBe(
      '10.0.0.1',
    );
    await expect(
      guard.tracker({ ip: '10.0.0.1', headers: { 'x-forwarded-for': ' , ' } }),
    ).resolves.toBe('10.0.0.1');
  });

  it('loguea el header completo y req.ip (temporal)', async () => {
    await guard.tracker({
      ip: '10.0.0.1',
      headers: { 'x-forwarded-for': '1.2.3.4, 181.1.2.3' },
    });

    expect(log).toHaveBeenCalledWith(
      '[temporal] X-Forwarded-For="1.2.3.4, 181.1.2.3" req.ip=10.0.0.1',
    );
  });
});
