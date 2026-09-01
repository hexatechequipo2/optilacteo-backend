"""Pide al backend NestJS los datos históricos necesarios para entrenar.

Mantiene al microservicio ML desacoplado del esquema de PostgreSQL: el
entrenamiento consume un endpoint interno de NestJS en vez de conectarse
directo a la base. NestJS deberá exponer algo como:

    GET /internal/ml-training-data/lotes?empresa_id=1
    Headers: X-Internal-Api-Key: <NEST_INTERNAL_API_KEY>

    Respuesta esperada (lista de objetos):
    [
      {"grasa": 3.2, "proteina": 3.1, "acidez": 16, "temperatura": 4,
       "ph": 6.6, "destino_real": "quesos"},
      ...
    ]
"""

import httpx
import pandas as pd

from app.config import settings


def fetch_training_data(empresa_id: int) -> pd.DataFrame:
    url = f"{settings.nest_internal_api_url}/internal/ml-training-data/lotes"
    headers = {"X-Internal-Api-Key": settings.nest_internal_api_key}

    response = httpx.get(url, params={"empresa_id": empresa_id}, headers=headers, timeout=30.0)
    response.raise_for_status()

    return pd.DataFrame(response.json())
