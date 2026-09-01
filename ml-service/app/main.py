from fastapi import FastAPI

from app.routers import health, recomendaciones

app = FastAPI(title="OptiLacteo ML Service", version="0.1.0")

app.include_router(health.router)
app.include_router(recomendaciones.router)
