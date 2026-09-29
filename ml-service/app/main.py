from fastapi import FastAPI

from app.routers import (
    anomalias,
    entrenamiento,
    estabilidad_proveedor,
    health,
    recomendaciones,
    volumen,
)

app = FastAPI(title="OptiLacteo ML Service", version="0.1.0")

app.include_router(health.router)
app.include_router(recomendaciones.router)
app.include_router(anomalias.router)
app.include_router(entrenamiento.router)
app.include_router(volumen.router)
app.include_router(estabilidad_proveedor.router)