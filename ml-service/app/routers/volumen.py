"""HU-51: predicción de volumen de producción semanal.

A diferencia de HU-49/50, este endpoint NO usa un modelo persistido en
disco. NestJS ya arma y envía la serie histórica completa en el body de
cada request (PrediccionVolumenService.generarYPersistir), así que el
forecast se calcula al vuelo sobre esos datos: promedio y desvío por día
de la semana (naive seasonal), sobre los últimos N días recibidos.

Se recalcula en cada corrida del cron diario -- no hay necesidad de
persistir el "modelo" en sí, la única fecha de "última actualización"
relevante para HU-51 (criterio 3) es la del propio cron, no la de un
archivo de modelo entrenado.
"""

from datetime import datetime, timedelta, timezone

import numpy as np
from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["volumen"])

MODELO_VERSION_PREFIX = "seasonal-naive-v1"


def _agrupar_por_dia_semana(serie: list[dict]) -> dict[int, list[float]]:
    """Agrupa los valores históricos por día de la semana (0=lunes .. 6=domingo)."""
    grupos: dict[int, list[float]] = {i: [] for i in range(7)}

    for punto in serie:
        fecha = datetime.strptime(punto["fecha"], "%Y-%m-%d")
        dia_semana = fecha.weekday()
        grupos[dia_semana].append(float(punto["valor"]))

    return grupos


@router.post("/volumen/predecir")
def predecir(payload: dict):
    empresa_id = payload.get("empresa_id")
    tipo_materia_prima = payload.get("tipo_materia_prima")
    serie_historica = payload.get("serie_historica", [])

    if empresa_id is None or tipo_materia_prima is None:
        return {"status": "invalid_data"}

    # El umbral real de "datos insuficientes" (21 días) ya lo valida Nest
    # antes de llamar acá -- esto es una segunda barrera de seguridad por
    # si algún día alguien llama al endpoint sin pasar por ese chequeo.
    if len(serie_historica) < settings.min_training_samples:
        return {"status": "insufficient_data"}

    grupos = _agrupar_por_dia_semana(serie_historica)

    # Si algún día de la semana no tiene NINGUNA muestra histórica, no se
    # puede proyectar ese día con confianza -- también insufficient_data.
    dias_sin_muestras = [dia for dia, valores in grupos.items() if len(valores) == 0]
    if dias_sin_muestras:
        return {"status": "insufficient_data"}

    ultima_fecha = max(
        datetime.strptime(p["fecha"], "%Y-%m-%d") for p in serie_historica
    )

    dias_prediccion = []
    for i in range(1, 8):
        fecha_futura = ultima_fecha + timedelta(days=i)
        dia_semana = fecha_futura.weekday()
        valores_dia = np.array(grupos[dia_semana])

        media = float(np.mean(valores_dia))
        desvio = float(np.std(valores_dia)) if len(valores_dia) > 1 else media * 0.1

        # Intervalo de confianza ~80% (± 1.28 desvíos), acotado a no bajar
        # de 0 -- un volumen negativo no tiene sentido físico.
        minimo = max(0.0, media - 1.28 * desvio)
        maximo = media + 1.28 * desvio

        dias_prediccion.append({
            "fecha": fecha_futura.strftime("%Y-%m-%d"),
            "minimo": round(minimo, 1),
            "esperado": round(media, 1),
            "maximo": round(maximo, 1),
        })

    modelo_version = f"{MODELO_VERSION_PREFIX}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    return {
        "status": "ok",
        "dias": dias_prediccion,
        "modelo_version": modelo_version,
    }