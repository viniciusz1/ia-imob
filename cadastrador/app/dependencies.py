from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import psycopg2
from fastapi import Header, HTTPException

from app.compat import IMOBSCRAPY_ROOT, SERVICE_ROOT, ensure_imobscrapy_imports

ensure_imobscrapy_imports()


def _load_env(path: Path) -> None:
    if not path.exists():
        return
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


_load_env(SERVICE_ROOT / ".env")
_load_env(IMOBSCRAPY_ROOT / ".env")


@dataclass(frozen=True)
class Settings:
    db_host: str = os.environ.get("DB_HOST", "localhost")
    db_port: str = os.environ.get("DB_PORT", "5432")
    db_name: str = os.environ.get("DB_NAME", "imobiliaria")
    db_user: str = os.environ.get("DB_USER", "postgres")
    db_password: str = os.environ.get("DB_PASSWORD", "")
    token: str | None = os.environ.get("CADASTRADOR_TOKEN") or None
    max_concurrent: int = int(os.environ.get("CADASTRADOR_MAX_CONCURRENT", "5"))
    enable_scrapy: bool = os.environ.get("CADASTRADOR_ENABLE_SCRAPY", "1") == "1"
    scrapy_cwd: str = os.environ.get("CADASTRADOR_SCRAPY_CWD", str(IMOBSCRAPY_ROOT))
    scrapy_executable: str = os.environ.get("CADASTRADOR_SCRAPY_EXECUTABLE", "")
    deepseek_api_key: str | None = os.environ.get("DEEPSEEK_API_KEY") or None
    deepseek_base_url: str = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    deepseek_model: str = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")

    @property
    def dsn(self) -> str:
        return (
            f"host={self.db_host} "
            f"port={self.db_port} "
            f"dbname={self.db_name} "
            f"user={self.db_user} "
            f"password={self.db_password}"
        )

    @property
    def resolved_scrapy_executable(self) -> str:
        if self.scrapy_executable:
            return self.scrapy_executable
        candidates = [
            Path(self.scrapy_cwd) / ".venv" / "bin" / "scrapy",
            IMOBSCRAPY_ROOT.parent / ".venv" / "bin" / "scrapy",
        ]
        for candidate in candidates:
            if candidate.exists():
                return str(candidate)
        return "scrapy"


def get_settings() -> Settings:
    return Settings()


def connect():
    settings = get_settings()
    return psycopg2.connect(
        settings.dsn,
        keepalives=1,
        keepalives_idle=20,
        keepalives_interval=5,
        keepalives_count=3,
    )


def get_db() -> Iterator:
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


def require_token(x_cadastrador_token: str | None = Header(default=None)) -> None:
    expected = get_settings().token
    if expected and x_cadastrador_token != expected:
        raise HTTPException(status_code=401, detail="invalid or missing X-Cadastrador-Token")


def get_onboarding_service():
    from app.services.onboarding import OnboardingService

    return OnboardingService.from_settings(get_settings())

