"""Entrena el modelo de recomendación de destino productivo por empresa.

Uso local:
    python -m app.training.train_destino --empresa-id 1

Alternativamente, para entrenar desde un JSON local sin depender del backend
NestJS (útil para pruebas offline o mientras el endpoint interno no está
disponible):

    python -m app.training.train_destino --empresa-id 1 --from-file datos.json

Este script corre aparte del servidor FastAPI (job manual o cron periódico),
nunca durante un request de inferencia.
"""

import argparse
import json
import os
from datetime import datetime, timezone

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

from app.config import settings
from app.training.data_client import fetch_training_data

FEATURES = ["ph", "temperatura", "densidad", "grasa", "proteina", "acidez", "conductividad"]
TARGET = "destino_real"


class InsufficientDataError(Exception):
    def __init__(self, count: int, minimum: int):
        self.count = count
        self.minimum = minimum
        super().__init__(f"Solo {count} muestras, se necesitan al menos {minimum}")


def train(empresa_id: int, from_file: str | None = None) -> dict:
    """Entrena el modelo de destino para una empresa.

    Por defecto pide los datos históricos al endpoint interno de NestJS
    (fetch_training_data). Si se pasa from_file, los toma de ese JSON local
    en su lugar — debe tener el mismo formato que devuelve el endpoint
    interno: una lista de objetos con las claves de FEATURES más destino_real.
    """
    if from_file:
        df = pd.read_json(from_file)
    else:
        df = fetch_training_data(empresa_id)

    faltantes = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if faltantes:
        raise ValueError(f"Faltan columnas en los datos de entrenamiento: {faltantes}")

    if len(df) < settings.min_training_samples:
        raise InsufficientDataError(len(df), settings.min_training_samples)

    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(n_estimators=200, max_depth=8, random_state=42)
    model.fit(X_train, y_train)
    accuracy = model.score(X_test, y_test)

    os.makedirs(settings.models_dir, exist_ok=True)

    model_path = os.path.join(settings.models_dir, f"destino_empresa_{empresa_id}.pkl")
    joblib.dump(model, model_path)

    meta = {
        "version": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "RandomForestClassifier",
        "n_samples": len(df),
        "accuracy": round(float(accuracy), 4),
        "features": FEATURES,
        "clases": sorted(y.unique().tolist()),
        "origen_datos": "archivo" if from_file else "nestjs",
    }
    meta_path = os.path.join(settings.models_dir, f"destino_empresa_{empresa_id}.meta.json")
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
