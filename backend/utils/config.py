from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_ANON_KEY: str = ""
    OPENAI_API_KEY: str
    TOGETHER_API_KEY: str = ""
    MVP_USER_ID: str = "123e4567-e89b-12d3-a456-426614174000"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    model_config = {"env_file": ".env", "extra": "ignore"}


_settings = Settings()

SUPABASE_URL: str = _settings.SUPABASE_URL
SUPABASE_SERVICE_KEY: str = _settings.SUPABASE_SERVICE_KEY
SUPABASE_ANON_KEY: str = _settings.SUPABASE_ANON_KEY
OPENAI_API_KEY: str = _settings.OPENAI_API_KEY
TOGETHER_API_KEY: str = _settings.TOGETHER_API_KEY
MVP_USER_ID: str = _settings.MVP_USER_ID
ENVIRONMENT: str = _settings.ENVIRONMENT
LOG_LEVEL: str = _settings.LOG_LEVEL
