from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://healthuser:healthpass@localhost:5432/healthapp"
    SECRET_KEY: str = "change-me"
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
