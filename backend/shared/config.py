from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Inside Docker Compose use pgbouncer:5432; from the host machine use localhost:6432
    database_url: str = "postgresql+psycopg2://noteorbit:noteorbit123@pgbouncer:5432/noteorbit"
    postgres_url: str | None = None

    jwt_secret_key: str = "change-this"
    jwt_algorithm: str = "HS256"
    access_token_expire_days: int = 7
    password_salt: str = "noteorbit_salt_v1"

    default_admin_email: str = "admin"
    default_admin_password: str = "admin"

    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_secure: bool = False
    minio_default_bucket: str = "noteorbit"
    s3_endpoint: str = "https://870124513608cc25c2c6c85c38078b79.r2.cloudflarestorage.com"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_region: str = "auto"
    r2_public_url: str | None = None

    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/1"

    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_pass: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False

    cors_origins: str = "https://note-orbit.vercel.app,http://localhost:5173,http://127.0.0.1:5173"
    max_upload_mb: int = 50

    openlibrary_url: str = "https://openlibrary.org/search.json"
    receipt_prefix: str = "fees/"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @property
    def effective_database_url(self) -> str:
        url = self.postgres_url or self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
