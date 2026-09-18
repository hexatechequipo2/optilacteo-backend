"""Generador de datasets sintéticos para el modelo de detección de
anomalías de OptiLácteo (HU-50).

Genera un dataset por (empresa, parámetro) porque train_anomalias.py
entrena un IsolationForest sobre una sola columna `valor` — mezclar
temperatura/ph/acidez/grasa sin normalizar en la misma columna invalida
la detección (las escalas no son comparables: ph ~6.6, acidez ~15,
temperatura ~4).

Cada JSON generado es compatible directo con:
    python -m app.training.train_anomalias --empresa-id <id> --parametro <p> --from-file <path>

Las columnas es_anomalia / tipo_desvio NO las usa el fit() actual
(IsolationForest es no supervisado y train_anomalias.py solo lee
"valor"), pero se incluyen para que puedas evaluar manualmente qué tan
bien separa el modelo los outliers inyectados a propósito, y para
alimentar la heurística de clasificación de tipo_desvio del router
(que compara contra la ventana reciente, no contra estas etiquetas).

Valores de tipo_desvio alineados con TipoDesvioAnomalia del backend
(pico, tendencia, varianza_atipica, nivel_atipico).

Uso:
    python generate_datasets.py --empresa-id 1 --parametro temperatura --dias 180
    python generate_datasets.py --empresa-id 1 --parametro todos --dias 180
"""

import argparse
import json
import os
import pickle
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

OUTPUT_DIR = "datasets"

# Parámetros simulables: (media, desvío estándar base)
PARAMETROS = {
    "temperatura": (4.0, 0.55),
    "ph": (6.65, 0.05),
    "acidez": (15.5, 0.6),
    "grasa": (3.5, 0.22),
}

# Etiquetas de tipo_desvio, alineadas con TipoDesvioAnomalia del backend.
TIPO_PICO = "pico"
TIPO_TENDENCIA = "tendencia"
TIPO_VARIANZA_ATIPICA = "varianza_atipica"
TIPO_NIVEL_ATIPICO = "nivel_atipico"


def generar_serie(parametro: str, dias: int, seed: int) -> pd.DataFrame:
    """Genera una serie de un solo parámetro con anomalías inyectadas."""
    media, desvio = PARAMETROS[parametro]
    rng = np.random.default_rng(seed)
    fecha_inicio = datetime(2026, 1, 1)

    valores = rng.normal(media, desvio, dias)
    tipos = [None] * dias

    # PICO: salto puntual de varios desvíos
    for idx in rng.choice(range(20, dias - 20), size=max(2, dias // 60), replace=False):
        valores[idx] += desvio * rng.uniform(4.5, 7.0) * rng.choice([-1, 1])
        tipos[idx] = TIPO_PICO

    # TENDENCIA: corrimiento gradual sostenido sobre una ventana
    inicio = int(rng.integers(30, max(31, dias - 40)))
    largo = 14
    for j in range(largo):
        if inicio + j < dias:
            valores[inicio + j] += desvio * 3.0 * (j / largo)
            tipos[inicio + j] = TIPO_TENDENCIA

    # NIVEL_ATIPICO: valor aislado fuera de rango
    for idx in rng.choice(range(dias), size=max(1, dias // 90), replace=False):
        if tipos[idx] is None:
            valores[idx] = media + desvio * rng.uniform(8, 11) * rng.choice([-1, 1])
            tipos[idx] = TIPO_NIVEL_ATIPICO

    # VARIANZA_ATIPICA: varianza que se dispara sin cambiar la media
    inicio_rp = int(rng.integers(10, max(11, dias - 25)))
    for j in range(10):
        if inicio_rp + j < dias and tipos[inicio_rp + j] is None:
            valores[inicio_rp + j] = media + rng.normal(0, desvio * 4)
            tipos[inicio_rp + j] = TIPO_VARIANZA_ATIPICA

    filas = []
    for d in range(dias):
        filas.append({
            "fecha": (fecha_inicio + timedelta(days=d)).strftime("%Y-%m-%d"),
            "parametro": parametro,
            "valor": round(float(valores[d]), 3),
            "es_anomalia": tipos[d] is not None,
            "tipo_desvio": tipos[d],
        })

    return pd.DataFrame(filas)


def _guardar(df: pd.DataFrame, nombre: str):
    """Guarda CSV, JSON y PKL. 'valor' es la única columna que
    train_anomalias.py necesita (FEATURES = ["valor"]); el resto es
    metadata que el fit() ignora pero no rompe nada al estar presente."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # CSV
    csv_path = os.path.join(OUTPUT_DIR, f"{nombre}.csv")
    df.to_csv(csv_path, index=False)

    # JSON
    json_df = df.astype(object).where(pd.notna(df), None)
    json_path = os.path.join(OUTPUT_DIR, f"{nombre}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_df.to_dict(orient="records"), f, indent=2, ensure_ascii=False)

    # PKL
    pkl_path = os.path.join(OUTPUT_DIR, f"{nombre}.pkl")
    with open(pkl_path, "wb") as f:
        pickle.dump(df, f)

    print(f"  {csv_path}  ({len(df)} filas)")
    print(f"  {json_path}")
    print(f"  {pkl_path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--empresa-id", type=int, required=True)
    parser.add_argument(
        "--parametro",
        choices=list(PARAMETROS.keys()) + ["todos"],
        default="todos",
    )
    parser.add_argument("--dias", type=int, default=180)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    parametros = list(PARAMETROS.keys()) if args.parametro == "todos" else [args.parametro]

    for parametro in parametros:
        print(f"\nHU-50 — {parametro} (empresa {args.empresa_id}):")
        df = generar_serie(parametro, args.dias, args.seed)
        _guardar(df, f"anomalias_empresa_{args.empresa_id}_{parametro}")
        print("  anomalías:", df[df["es_anomalia"]]["tipo_desvio"].value_counts().to_dict())

    print()


if __name__ == "__main__":
    main()
