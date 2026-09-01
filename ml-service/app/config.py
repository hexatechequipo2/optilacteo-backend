from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    models_dir: str = "models_store"
    min_training_samples: int = 30

    # Usados si el script de entrenamiento pide los datos históricos
    # al backend NestJS en vez de conectarse directo a Postgres.
    nest_internal_api_url: str = "http://localhost:3000"
    nest_internal_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
