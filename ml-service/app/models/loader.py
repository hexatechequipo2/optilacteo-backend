import json
import os
from functools import lru_cache

import joblib

from app.config import settings


def _model_path(empresa_id: int) -> str:
    return os.path.join(settings.models_dir, f"destino_empresa_{empresa_id}.pkl")


def _meta_path(empresa_id: int) -> str:
    return os.path.join(settings.models_dir, f"destino_empresa_{empresa_id}.meta.json")


@lru_cache(maxsize=None)
def load_destino_model(empresa_id: int):
    """Carga el modelo de una empresa desde disco y lo cachea en memoria.
    Devuelve None si todavía no existe un modelo entrenado para esa empresa
    (caso "insufficient_data" del criterio 5 de la HU-49).
    """
    path = _model_path(empresa_id)
    if not os.path.exists(path):
        return None
    return joblib.load(path)


def load_destino_model_meta(empresa_id: int) -> dict | None:
    path = _meta_path(empresa_id)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def clear_model_cache():
    """Llamar después de reentrenar, para que el próximo request cargue
    el .pkl nuevo en vez de seguir usando el que quedó en memoria."""
    load_destino_model.cache_clear()
