from __future__ import annotations

import sys
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.dependencies import get_onboarding_service  # noqa: E402
from app.main import app  # noqa: E402
from app.schemas import OnboardRequest, normalize_http_url  # noqa: E402


class _Cursor:
    def __init__(self, row=None):
        self.row = row

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params=None):
        return None

    def fetchone(self):
        return self.row


class _Conn:
    def __init__(self, row=None):
        self.row = row
        self.commits = 0
        self.rollbacks = 0
        self.closed = False

    def cursor(self):
        return _Cursor(self.row)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def close(self):
        self.closed = True


class _Service:
    async def stream_onboarding(self, *, url, name=None, conn, request=None):
        yield b'event: progress\ndata: {"step":"fetching"}\n\n'
        yield b'event: result\ndata: {"outcome":"active","agency_id":1}\n\n'


def test_normalize_http_url_defaults_https():
    assert normalize_http_url(" example.com/imoveis ") == "https://example.com/imoveis"
    assert OnboardRequest(url="//example.com", name="Example").url == "https://example.com"


@pytest.mark.asyncio
async def test_health_returns_ok():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_onboard_stream_contract(monkeypatch):
    from app.routers import agencies

    monkeypatch.setattr(agencies, "connect", lambda: _Conn())

    async def receive():
        return {"type": "http.request"}

    request = agencies.Request({"type": "http", "headers": []}, receive)
    response = await agencies.onboard(
        OnboardRequest(url="example.com", name="Example Imóveis"),
        request,
        _Service(),
    )
    body = b""
    async for chunk in response.body_iterator:
        body += chunk

    assert response.media_type == "text/event-stream"
    assert b"event: progress" in body
    assert b"event: result" in body
