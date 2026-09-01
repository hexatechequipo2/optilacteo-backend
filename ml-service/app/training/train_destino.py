"""Entrena el modelo de recomendación de destino productivo por empresa.

Uso local:
    python -m app.training.train_destino --empresa-id 1

Este script corre aparte del servidor FastAPI (job manual o cron periódico),
nunca durante un request de inferencia.
"""

import argparse
import json
import os
from datetime import datetime, timezone

import joblib
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


def train(empresa_id: int) -> dict:
    df = fetch_training_data(empresa_id)

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
    }
    meta_path = os.path.join(settings.models_dir, f"destino_empresa_{empresa_id}.meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    return meta


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--empresa-id", type=int, required=True)
    args = parser.parse_args()

    try:
        resultado = train(args.empresa_id)
        print(f"Modelo entrenado: {resultado}")
    except InsufficientDataError as e:
        print(f"No se pudo entrenar: {e}")
