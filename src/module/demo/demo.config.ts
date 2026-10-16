import type { ConfigService } from '@nestjs/config';

export interface DemoConfig {
  empresaId: number;
  usuarioId: number;
  proveedorId: number;
  tamboId: number;
}

// Se lee una sola vez al levantar el módulo: con DEMO_MODE=true y una
// variable faltante, la app no arranca (mejor que fallar en plena demo).
export function leerConfigDemo(config: ConfigService): DemoConfig {
  const leer = (clave: string): number => {
    const valor = Number(config.get<string>(clave));
    if (!Number.isInteger(valor) || valor <= 0) {
      throw new Error(
        `DEMO_MODE=true requiere la variable ${clave} (entero positivo).`,
      );
    }
    return valor;
  };

  return {
    empresaId: leer('DEMO_EMPRESA_ID'),
    usuarioId: leer('DEMO_USUARIO_ID'),
    proveedorId: leer('DEMO_PROVEEDOR_ID'),
    tamboId: leer('DEMO_TAMBO_ID'),
  };
}
