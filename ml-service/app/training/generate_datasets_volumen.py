"""Generador de datasets sintéticos para probar el endpoint de predicción
de volumen (HU-51) sin depender de que haya suficiente histórico real
cargado en la base.

Genera una serie diaria de volumen con tendencia leve, estacionalidad
semanal (domingo bajo) y estacionalidad anual (pico primavera-verano),
en el shape EXACTO que espera POST /volumen/predecir vía
serie_historica: [{"fecha": "YYYY-MM-DD", "valor": <float>}, ...]

Uso:
    python generate_datasets_volumen.py --empresa-id 2 --tipo-materia-prima leche_cruda --dias 60

Salida en ./datasets/ como CSV (inspección) y JSON (para pegar directo
en el body de POST /volumen/predecir en Postman/Swagger).
"""

import argparse
import json
import os
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

OUTPUT_DIR = "datasets"


def generar_serie_volumen(base: float, dias: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    fecha_inicio = datetime(2026, 1, 1)

    filas = []
    for d in range(dias):
        fecha = fecha_inicio + timedelta(days=d)

        tendencia = base + d * 4.5
        factor_semanal = {6: 0.62, 5: 0.88}.get(fecha.weekday(), 1.0)
        factor_anual = 1 + 0.11 * np.sin(2 * np.pi * (d - 60) / 365)
        ruido = rng.normal(0, base * 0.04)

        valor = max(0, tendencia * factor_semanal * factor_anual + ruido)

        filas.append({
            "fecha": fecha.strftime("%Y-%m-%d"),
            "valor": round(valor, 1),
        })

    return pd.DataFrame(filas)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--empresa-id", type=int, default=2)
    parser.add_argument(
        "--tipo-materia-prima",
        choices=["leche_cruda", "crema_de_leche", "masa_hilada"],
        default="leche_cruda",
    )
    parser.add_argument("--dias", type=int, default=60)
    parser.add_argument(
        "--base",
        type=float,
        default=None,
        help="Volumen base diario. Default: 5000 (leche_cruda/crema, litros) o 800 (masa_hilada, kg).",
    )
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    base = args.base
    if base is None:
        base = 800.0 if args.tipo_materia_prima == "masa_hilada" else 5000.0

    df = generar_serie_volumen(base, args.dias, args.seed)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    nombre = f"volumen_empresa_{args.empresa_id}_{args.tipo_materia_prima}"

    csv_path = os.path.join(OUTPUT_DIR, f"{nombre}.csv")
    df.to_csv(csv_path, index=False)

    json_path = os.path.join(OUTPUT_DIR, f"{nombre}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(df.to_dict(orient="records"), f, indent=2, ensure_ascii=False)

    # Body listo para pegar directo en POST /volumen/predecir
    body_path = os.path.join(OUTPUT_DIR, f"{nombre}_body_predecir.json")
    body = {
        "empresa_id": args.empresa_id,
        "tipo_materia_prima": args.tipo_materia_prima,
        "serie_historica": df.to_dict(orient="records"),
    }
    with open(body_path, "w", encoding="utf-8") as f:
        json.dump(body, f, indent=2, ensure_ascii=False)

    print(f"  {csv_path}  ({len(df)} filas)")
    print(f"  {json_path}")
    print(f"  {body_path}  (listo para POST /volumen/predecir)")


if __name__ == "__main__":
    main()