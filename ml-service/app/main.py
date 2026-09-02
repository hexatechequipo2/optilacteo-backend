import joblib
import math
from fastapi import FastAPI

app = FastAPI()

@app.post("/anomalias/detectar")
def detectar(payload: dict):
    empresa_id = payload.get("empresa_id")
    valor = payload.get("valor")

    # Cargar modelo entrenado
    try:
        model = joblib.load(f"models/anomalias_empresa_{empresa_id}.pkl")
    except FileNotFoundError:
        return {"status": "insufficient_data"}

    # Ignorar valores NaN
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        return {"status": "invalid_data"}

    # Predicción
    pred = model.predict([[valor]])[0]
    prob = max(model.predict_proba([[valor]])[0])

    return {
        "status": "ok",
        "es_anomalia": bool(pred),
        "confianza": prob
    }
