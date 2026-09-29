import numpy as np
from fastapi import APIRouter

router = APIRouter(tags=["estabilidad-proveedor"])

MODELO_VERSION = "estabilidad-std-norm-v2"
UMBRAL_ESTABLE = 0.10   # desvío / ancho del rango permitido
UMBRAL_MODERADA = 0.20  # calibrar con datos reales

# Tope del desvío normalizado por parámetro. Un desvío igual al ancho
# completo del rango ya es inestabilidad máxima; sin tope, un solo parámetro
# con valores absurdos (datos sucios, unidades mezcladas) domina el promedio.
TOPE_DESVIO_NORMALIZADO = 1.0


def _clasificar(score: float) -> str:
    if score < UMBRAL_ESTABLE:
        return "estable"
    if score < UMBRAL_MODERADA:
        return "moderada"
    return "inestable"


def clasificar(payload: dict) -> dict:
    """Lógica pura, reutilizable desde scripts (exportar/generar dataset)."""
    empresa_id = payload.get("empresa_id")
    proveedor_id = payload.get("proveedor_id")
    series = payload.get("series", [])

    if empresa_id is None or proveedor_id is None:
        return {"status": "invalid_data"}

    detalle = []
    for s in series:
        valores = s.get("valores", [])
        if len(valores) < 2:
            continue

        v = np.asarray(valores, dtype=float)
        media = float(v.mean())
        desvio = float(v.std(ddof=1))

        umbral_min = s.get("umbral_min")
        umbral_max = s.get("umbral_max")
        rango = (
            umbral_max - umbral_min
            if umbral_min is not None and umbral_max is not None
            else 0.0
        )

        if rango > 0:
            norm = desvio / rango
        elif media != 0:
            norm = desvio / abs(media)  # coeficiente de variación
        else:
            continue

        norm = min(norm, TOPE_DESVIO_NORMALIZADO)

        detalle.append(
            {
                "parametro": s.get("parametro"),
                "materia_prima": s.get("materia_prima"),
                "n": len(v),
                "media": round(media, 4),
                "desvio": round(desvio, 4),
                "desvio_normalizado": round(norm, 4),
                "clasificacion": _clasificar(norm),
            }
        )

    if not detalle:
        return {"status": "insufficient_data"}

    score = float(np.mean([d["desvio_normalizado"] for d in detalle]))
    return {
        "status": "ok",
        "clasificacion": _clasificar(score),
        "score": round(score, 4),
        "detalle": detalle,
        "modelo_version": MODELO_VERSION,
    }


@router.post("/estabilidad-proveedor/clasificar")
def clasificar_endpoint(payload: dict):
    return clasificar(payload)