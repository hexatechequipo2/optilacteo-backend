"""Exporta el histórico real de lotes por proveedor y calcula el score de
estabilidad de cada uno con los umbrales actuales, para calibrarlos.

Uso:
    python -m app.training.exportar_dataset_estabilidad --empresa-id 2
    python -m app.training.exportar_dataset_estabilidad --empresa-id 2 --min-lotes 5
"""

import argparse
import json
import os

from app.routers.estabilidad_proveedor import (
    UMBRAL_ESTABLE,
    UMBRAL_MODERADA,
    clasificar,
)
from app.training.data_client import fetch_dataset_estabilidad


def exportar(empresa_id: int, min_lotes: int) -> list[dict]:
    proveedores = fetch_dataset_estabilidad(empresa_id)

    os.makedirs("datasets", exist_ok=True)
    salida = os.path.join("datasets", f"estabilidad_empresa_{empresa_id}.json")
    with open(salida, "w") as f:
        json.dump(proveedores, f, indent=2, default=str)
    print(f"Dataset exportado: {salida} ({len(proveedores)} proveedores)")

    resultados = []
    for p in proveedores:
        if p["cantidadLotes"] < min_lotes:
            resultados.append({**p, "resultado": None})
            continue

        payload = {
            "empresa_id": empresa_id,
            "proveedor_id": p["proveedorId"],
            "series": [
                {
                    "parametro": s["parametro"],
                    "materia_prima": s["materiaPrima"],
                    "valores": s["valores"],
                    "umbral_min": s["umbralMin"],
                    "umbral_max": s["umbralMax"],
                }
                for s in p["series"]
            ],
        }
        resultados.append({**p, "resultado": clasificar(payload)})

    return resultados


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--empresa-id", type=int, required=True)
    parser.add_argument("--min-lotes", type=int, default=5)
    args = parser.parse_args()

    resultados = exportar(args.empresa_id, args.min_lotes)

    print(
        f"\nUmbrales actuales: estable < {UMBRAL_ESTABLE}, "
        f"moderada < {UMBRAL_MODERADA}"
    )
    print(f"{'Proveedor':<30} {'Lotes':>5}  {'Clasificación':<12} {'Score':>7}")
    for r in sorted(
        resultados,
        key=lambda x: (x["resultado"] or {}).get("score") or 999,
    ):
        res = r["resultado"]
        if res is None:
            print(
                f"{r['proveedorNombre'][:30]:<30} {r['cantidadLotes']:>5}  "
                f"{'sin datos':<12}"
            )
        else:
            print(
                f"{r['proveedorNombre'][:30]:<30} {r['cantidadLotes']:>5}  "
                f"{res.get('clasificacion', '-'):<12} {res.get('score', '-'):>7}"
            )