from typing import Optional, Dict

from pydantic import BaseModel, Field


class LoteFeaturesDTO(BaseModel):
    empresa_id: int
    parametros: Dict[str, float] = Field(default_factory=dict)


class RecomendacionResponse(BaseModel):
    status: str
    destino_recomendado: Optional[str] = None
    confianza: Optional[float] = None