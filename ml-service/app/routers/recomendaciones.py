from fastapi import APIRouter

from app.models.loader import load_destino_model
from app.schemas.lote import LoteFeaturesDTO, RecomendacionResponse

router = APIRouter(tags=["recomendaciones"])

# Mismo orden que Parametro enum del lado NestJS — el vector siempre
# se arma en este orden, rellenando con 0.0 lo que no venga.
FEATURES_ORDER = [
    "ph", "temperatura", "densidad", "grasa", "proteina", "acidez", "conductividad",
]


@router.post("/recommendations/destino", response_model=RecomendacionResponse)
def predecir_destino(payload: LoteFeaturesDTO):
    model = load_destino_model(payload.empresa_id)

    if model is None:
        return RecomendacionResponse(status="insufficient_data")

    X = [[payload.parametros.get(f, 0.0) for f in FEATURES_ORDER]]
    proba = model.predict_proba(X)[0]
    clase = model.classes_[proba.argmax()]

    return RecomendacionResponse(
        status="ok",
        destino_recomendado=str(clase),
        confianza=round(float(proba.max()) * 100, 1),
    )