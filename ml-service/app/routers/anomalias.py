import math

import joblib
from fastapi import APIRouter

router = APIRouter(tags=["anomalias"])


@router.post("/anomalias/detectar")
def detectar(payload: dict):
    empresa_id = payload.get("empresa_id")
    valor = payload.get("valor")

    try:
        model = joblib.load(f"models/anomalias_empresa_{empresa_id}.pkl")
    except FileNotFoundError:
        return {"status": "insufficient_data"}

    if valor is None:
        return {"status": "invalid_data"}

    pred = model.predict([[valor]])[0]  # -1 = anómalo, 1 = normal
    es_anomalia = pred == -1

    return {
        "status": "ok",
        "es_anomalia": es_anomalia,
    }
