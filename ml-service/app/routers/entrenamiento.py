from fastapi import APIRouter

from app.models.loader import clear_model_cache
from app.training.train_destino import InsufficientDataError, train

router = APIRouter(tags=["entrenamiento"])


@router.post("/train/destino/{empresa_id}")
def entrenar_destino(empresa_id: int):
    try:
        meta = train(empresa_id)
    except InsufficientDataError as e:
        # Condición esperable (todavía no hay suficiente historial), no un
        # error del servidor: 200 con status descriptivo.
        return {
            "status": "insufficient_data",
            "empresa_id": empresa_id,
            "detail": str(e),
        }

    # Sin este clear, load_destino_model (cacheada con lru_cache) sigue
    # sirviendo el .pkl viejo hasta que se reinicia uvicorn.
    clear_model_cache()

    return {"status": "ok", "empresa_id": empresa_id, **meta}
