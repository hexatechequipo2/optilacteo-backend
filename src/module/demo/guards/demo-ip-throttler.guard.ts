import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// main.ts no configura `trust proxy`, así que req.ip es la del proxy de
// Railway. Solo para /demo/turno se toma el ÚLTIMO valor de
// X-Forwarded-For: es el que agrega el proxy (los anteriores los puede
// mandar el cliente). Sin header, req.ip.
@Injectable()
export class DemoIpThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(DemoIpThrottlerGuard.name);

  protected getTracker(req: Record<string, any>): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const header: unknown = req.headers?.['x-forwarded-for'];
    const valor: unknown = Array.isArray(header)
      ? (header as unknown[]).join(',')
      : header;

    // TEMPORAL (sacar después del primer deploy): verificar qué manda
    // Railway. Este guard solo existe con DEMO_MODE=true, porque DemoModule
    // no se registra sin el flag.
    const headerTexto = typeof valor === 'string' ? valor : '';
    this.logger.log(
      `[temporal] X-Forwarded-For="${headerTexto}" req.ip=${String(req.ip)}`,
    );

    const ultimo =
      typeof valor === 'string'
        ? valor
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .pop()
        : undefined;
    return ultimo ? Promise.resolve(ultimo) : super.getTracker(req);
  }
}
