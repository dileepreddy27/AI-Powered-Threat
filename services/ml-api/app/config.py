from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    api_name: str = "Threat Shield ML API"
    api_version: str = "0.1.0"
    ml_api_host: str = Field(default="0.0.0.0", alias="ML_API_HOST")
    ml_api_port: int = Field(default=8000, alias="ML_API_PORT")


settings = Settings()

