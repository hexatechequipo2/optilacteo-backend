"""Entrena el modelo de detección de anomalías por empresa.

Uso local:
    python -m app.training.train_anomalias --empresa-id 1

Alternativamente, para entrenar desde un JSON local:
    python -m app.training.train_anomalias --empresa-id 1 --from-file datos.json

Este script corre aparte del servidor FastAPI (job manual o cron periódico),
nunca durante un request de inferencia.
"""

import argparse
import json
import os
from datetime import datetime, timezone

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest

from app.config import settings
from app.training.data_client import fetch_training_data_anomalias  # nuevo cliente

FEATURES = ["valor"]  # se puede extender a más parámetros
TARGET = "es_anomalia"


class InsufficientDataError(Exception):
    def __init__(self, count: int, minimum: int):
        self.count = count
        self.minimum = minimum
        super().__init__(f"Solo {count} muestras, se necesitan al menos {minimum}")


def train(empresa_id: int, from_file: str | None = None) -> dict:
    """Entrena el modelo de anomalías para una empresa."""
    if from_file:
        df = pd.read_json(from_file)
    else:
        df = fetch_training_data_anomalias(empresa_id)

    faltantes = [c for c in FEATURES if c not in df.columns]
    if faltantes:
        raise ValueError(f"Faltan columnas en los datos de entrenamiento: {faltantes}")

    if len(df) < settings.min_training_samples:
        raise InsufficientDataError(len(df), settings.min_training_samples)

    X = df[FEATURES]

    # IsolationForest no necesita variable objetivo, detecta outliers
    model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
    model.fit(X)

    os.makedirs(settings.models_dir, exist_ok=True)

    model_path = os.path.join(settings.models_dir, f"anomalias_empresa_{empresa_id}.pkl")
    joblib.dump(model, model_path)

    meta = {
        "version": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "IsolationForest",
        "n_samples": len(df),
        "features": FEATURES,
        "origen_datos": "archivo" if from_file else "nestjs",
    }
    meta_path = os.path.join(settings.models_dir, f"anomalias_empresa_{empresa_id}.meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    return meta


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--empresa-id", type=int, required=True)
    parser.add_argument(
        "--from-file",
        type=str,
        default=None,
        help="Ruta a un JSON local con los datos de entrenamiento. "
             "Si se omite, los pide al backend NestJS.",
    )
    args = parser.parse_args()

    try:
        resultado = train(args.empresa_id, args.from_file)
        print(f"Modelo entrenado: {resultado}")
    except InsufficientDataError as e:
        print(f"No se pudo entrenar: {e}")
