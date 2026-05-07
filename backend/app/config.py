from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    anthropic_api_key: str
    model_name: str = "claude-sonnet-4-6"
    qdrant_location: str = ":memory:"
    collection_name: str = "finsight_docs"
    edgar_user_agent: str = "FinSight research@finsight.ai"
    max_filing_chunks: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
