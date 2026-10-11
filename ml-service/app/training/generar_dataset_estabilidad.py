"""Genera un dataset sintético para probar la clasificación de estabilidad
de proveedores (HU-64). Solo sirve para verificar el código, no para
fijar umbrales definitivos.

Uso:
    python -m app.training.generar_dataset_estabilidad --empresa-id 2
"""

import argparse
import json
import os

import numpy as np

from app.routers.estabilidad_proveedor import (
    UMBRAL_ESTABLE,
    UMBRAL_MODERADA,
    clasificar,
)

# Rangos de ejemplo (leche cruda). Ajustar a lo que haya en config-parametro.
PARAMETROS = {
    "ph": {"min": 6.4, "max": 6.9, "centro": 6.65},
    "temperatura": {"min": 2.0, "max": 6.0, "centro": 4.0},
    "grasa": {"min": 3.0, "max": 4.2, "centro": 3.6},
    "acidez": {"min": 14.0, "max": 18.0, "centro": 16.0},
}

# Desvío objetivo como fracción del ancho del rango.
PERFILES = {"estable": 0.05, "moderada": 0.15, "inestable": 0.30}

MATERIA_PRIMA = "leche_cruda"


def _serie(rng, cfg, fraccion, n):
    rango = cfg["max"] - cfg["min"]
    valores = rng.normal(cfg["centro"], fraccion * rango, n)
    return [round(float(v), 2) for v in valores]


def generar(empresa_id: int, n_lotes: int, seed: int) -> list[dict]:
    rng = np.random.default_rng(seed)
    casos = []
    proveedor_id = 1

    for perfil, fraccion in PERFILES.items():
        series = [
            {
                "parametro": nombre,
                "materia_prima": MATERIA_PRIMA,
                "valores": _serie(rng, cfg, fraccion, n_lotes),
                "umbral_min": cfg["min"],
                "umbral_max": cfg["max"],
            }
            for nombre, cfg in PARAMETROS.items()
        ]
        casos.append(
            {
                "perfil_esperado": perfil,
                "payload": {
                    "empresa_id": empresa_id,
                    "proveedor_id": proveedor_id,
                    "series": series,
                },
            }
        )
        proveedor_id += 1

    # AC4: proveedor con pocos lotes.
    casos.append(
        {
            "perfil_esperado": "sin_datos_suficientes",
            "payload": {
                "empresa_id": empresa_id,
                "proveedor_id": proveedor_id,
                "series": [
                    {
                        "parametro": "ph",
                        "materia_prima": MATERIA_PRIMA,
                        "valores": [6.6, 6.7],
                        "umbral_min": 6.4,
                        "umbral_max": 6.9,
                    }
                ],
            },
        }
    )
    return casos


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--empresa-id", type=int, required=True)
    parser.add_argument("--n-lotes", type=int, default=20)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    casos = generar(args.empresa_id, args.n_lotes, args.seed)

    os.makedirs("datasets", exist_ok=True)
    salida = os.path.join(
        "datasets", f"estabilidad_empresa_{args.empresa_id}_ejemplo.json"
    )
    with open(salida, "w") as f:
        json.dump(casos, f, indent=2)
    print(f"Dataset generado: {salida}")

    print(
        f"\nUmbrales actuales: estable < {UMBRAL_ESTABLE}, "
        f"moderada < {UMBRAL_MODERADA}"
    )
    for caso in casos:
        r = clasificar(caso["payload"])
        print(
            f"  esperado={caso['perfil_esperado']:<22} "
            f"resultado={r.get('clasificacion')} score={r.get('score')}"
        )