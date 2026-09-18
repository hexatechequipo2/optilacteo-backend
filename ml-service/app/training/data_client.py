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

HU-50: además pide la serie histórica de un parámetro puntual, contra
GET /internal/series-historicas (dataset-ml.controller.ts), con el mismo
esquema de autenticación por header.
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


def fetch_training_data_anomalias(
    empresa_id: int,
    parametro: str,
    desde: str | None = None,
    hasta: str | None = None,
) -> pd.DataFrame:
    """HU-50: trae la serie histórica de un parámetro para entrenar el
    modelo de detección de anomalías. `desde`/`hasta` en formato ISO
    (YYYY-MM-DD); si se omiten, se usa un rango amplio por default para
    cubrir todo el histórico disponible.
    """
    url = f"{settings.nest_internal_api_url}/internal/series-historicas"
    headers = {"X-Internal-Api-Key": settings.nest_internal_api_key}

    params = {
        "empresaId": empresa_id,
        "parametro": parametro,
        "desde": desde or "2020-01-01",
        "hasta": hasta or "2030-01-01",
    }

    response = httpx.get(url, params=params, headers=headers, timeout=30.0)
    response.raise_for_status()

    puntos = response.json()  # shape PuntoSerieResponseDto[]: [{loteId, valor, timestamp, origen}, ...]

    df = pd.DataFrame(puntos)

    if df.empty:
        return pd.DataFrame(columns=["valor"])

    # train_anomalias.py solo necesita la columna "valor" (FEATURES).
    # Se conservan loteId/timestamp/origen por si en el futuro se quiere
    # filtrar por origen (ej. excluir manual_sin_sensor del entrenamiento).
    return df[["valor", "loteId", "timestamp", "origen"]]