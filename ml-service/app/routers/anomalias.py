import json
import os

import joblib
import numpy as np
from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["anomalias"])

VENTANA_RECIENTE = 10  # cantidad de valores previos usados para clasificar el tipo de desvío


def _cargar_meta(empresa_id: int, parametro: str) -> dict | None:
    meta_path = os.path.join(
        settings.models_dir, f"anomalias_empresa_{empresa_id}_{parametro}.meta.json"
    )
    if not os.path.exists(meta_path):
        return None

    with open(meta_path) as f:
        return json.load(f)


def _clasificar_tipo_desvio(valor: float, historico_reciente: list[float]) -> str:
    """Heurística simple sobre la ventana reciente para clasificar el tipo
    de desvío una vez que IsolationForest ya marcó es_anomalia=True.
    No es un segundo modelo, son reglas sobre media/std locales.
    """
    if not historico_reciente:
        return "nivel_atipico"

    media = float(np.mean(historico_reciente))
    std = float(np.std(historico_reciente)) or 1e-6
    desvio_normalizado = abs(valor - media) / std

    # Tendencia: los últimos valores vienen corriéndose en una dirección
    # sostenida hacia donde cae el valor actual.
    if len(historico_reciente) >= 3:
        diffs = np.diff(historico_reciente[-3:])
        mismo_signo = np.all(diffs > 0) or np.all(diffs < 0)
        if mismo_signo and desvio_normalizado < 6:
            return "tendencia"

    # Varianza atípica: la ventana reciente ya venía con dispersión alta,
    # no es un salto puntual contra una serie estable.
    if std > 0 and (std / (abs(media) or 1)) > 0.15:
        return "varianza_atipica"

    # Salto grande y puntual contra una serie estable -> pico
    if desvio_normalizado >= 4:
        return "pico"

    return "nivel_atipico"


def _normalizar_confianza(score: float, scores_min: float, scores_max: float) -> float:
    """Normaliza el score de IsolationForest a 0-100 usando el rango de
    scores persistido en el .meta.json al momento del entrenamiento.
    Score más negativo = más anómalo = mayor confianza."""
    if scores_max == scores_min:
        return 50.0

    normalizado = (scores_max - score) / (scores_max - scores_min)
    return round(float(np.clip(normalizado * 100, 0, 100)), 1)


@router.post("/anomalias/detectar")
def detectar(payload: dict):
    empresa_id = payload.get("empresa_id")
    parametro = payload.get("parametro")
    valor = payload.get("valor")
    historico_reciente = payload.get("historico_reciente", [])  # últimos N valores del mismo lote+parámetro

    if valor is None or parametro is None or empresa_id is None:
        return {"status": "invalid_data"}

    model_path = os.path.join(settings.models_dir, f"anomalias_empresa_{empresa_id}_{parametro}.pkl")

    try:
        model = joblib.load(model_path)
    except FileNotFoundError:
        return {"status": "insufficient_data"}

    pred = model.predict([[valor]])[0]  # -1 = anómalo, 1 = normal
    es_anomalia = pred == -1

    if not es_anomalia:
        return {"status": "ok", "es_anomalia": False}

    meta = _cargar_meta(empresa_id, parametro)
    score = model.score_samples([[valor]])[0]

    if meta and "scores_min" in meta and "scores_max" in meta:
        confianza = _normalizar_confianza(score, meta["scores_min"], meta["scores_max"])
        modelo_version = meta.get("version", "desconocida")
    else:
        # Modelo entrenado antes de que train_anomalias.py guardara
        # scores_min/scores_max en el meta — degrada a un valor fijo en
        # vez de romper, pero conviene reentrenar para tener confianza real.
        confianza = 70.0
        modelo_version = "desconocida"

    tipo_desvio = _clasificar_tipo_desvio(valor, historico_reciente)

    return {
        "status": "ok",
        "es_anomalia": True,
        "parametro": parametro,
        "tipo_desvio": tipo_desvio,
        "confianza": confianza,
        "modelo_version": modelo_version,
    }