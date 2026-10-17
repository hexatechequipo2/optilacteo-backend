import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// En la demo varios celulares comparten la IP del wifi: el límite de
// /demo/lecturas se cuenta por lote (un lote = un visitante) y no por IP.
// Corre antes del ValidationPipe, así que el body llega sin validar; si no
// trae loteId se cae al tracker por IP.
@Injectable()
export class DemoLoteThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const loteId: unknown = req.body?.loteId;
    if (typeof loteId === 'number' || typeof loteId === 'string') {
      return Promise.resolve(`demo-lote:${loteId}`);
    }
    return super.getTracker(req);
  }
}
