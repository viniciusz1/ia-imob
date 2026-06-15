from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_preview_uses_fallback_priority_and_reports_selected_evidence():
    payload = {
        "field_name": "tipo",
        "extractors": [
            {
                "field_name": "tipo",
                "source_type": "css",
                "selector_value": ".missing::text",
                "output_type": "text",
                "priority": 1,
            },
            {
                "field_name": "tipo",
                "source_type": "css",
                "selector_value": "h1::text",
                "output_type": "text",
                "priority": 2,
            },
        ],
        "evidence": [
            {
                "id": 10,
                "sample_index": 0,
                "url": "https://x.test/imovel/1",
                "html": "<html><body><h1>Casa</h1></body></html>",
            }
        ],
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/refinement/preview", json=payload)

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["status"] == "extraiu valor"
    assert result["value"] == "Casa"
    assert result["used_priority"] == 2
    assert result["selected_evidence"]["source_type"] == "css"
    assert result["selected_evidence"]["selector_value"] == "h1::text"
    assert result["selected_evidence"]["selected_indexes"] == [0]


@pytest.mark.asyncio
async def test_preview_reports_selector_index_and_join_selection():
    payload = {
        "field_name": "descricao",
        "extractors": [
            {
                "field_name": "descricao",
                "source_type": "css",
                "selector_value": ".feature::text",
                "selector_index": 1,
                "output_type": "text",
                "priority": 1,
            },
            {
                "field_name": "descricao",
                "source_type": "css",
                "selector_value": ".fallback::text",
                "selector_join": True,
                "output_type": "text",
                "priority": 2,
            },
        ],
        "evidence": [
            {
                "id": 11,
                "sample_index": 0,
                "url": "https://x.test/imovel/2",
                "html": (
                    '<html><body><span class="feature">Piscina</span>'
                    '<span class="feature">Churrasqueira</span></body></html>'
                ),
            },
            {
                "id": 12,
                "sample_index": 1,
                "url": "https://x.test/imovel/3",
                "html": (
                    '<html><body><span class="fallback">Casa</span>'
                    '<span class="fallback">mobiliada</span></body></html>'
                ),
            },
        ],
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/refinement/preview", json=payload)

    assert response.status_code == 200
    indexed, joined = response.json()["results"]
    assert indexed["value"] == "Churrasqueira"
    assert indexed["selected_evidence"]["selected_indexes"] == [1]
    assert indexed["selected_evidence"]["matches_count"] == 2
    assert joined["value"] == "Casa mobiliada"
    assert joined["used_priority"] == 2
    assert joined["selected_evidence"]["selected_indexes"] == [0, 1]


@pytest.mark.asyncio
async def test_preview_reports_structured_and_literal_sources():
    payload = {
        "field_name": "valor",
        "extractors": [
            {
                "field_name": "valor",
                "source_type": "og",
                "selector_value": "price",
                "output_type": "text",
                "priority": 1,
            },
            {
                "field_name": "valor",
                "source_type": "jsonld",
                "selector_value": "offers.price",
                "output_type": "text",
                "priority": 2,
            },
            {
                "field_name": "valor",
                "source_type": "literal",
                "selector_value": "Consulte",
                "output_type": "text",
                "priority": 3,
            },
        ],
        "evidence": [
            {
                "id": 13,
                "sample_index": 0,
                "url": "https://x.test/imovel/4",
                "html": '<html><head><meta property="og:price" content="R$ 500.000"></head></html>',
            },
            {
                "id": 14,
                "sample_index": 1,
                "url": "https://x.test/imovel/5",
                "html": (
                    '<html><head><script type="application/ld+json">'
                    '{"offers":{"price":"600000"}}'
                    "</script></head></html>"
                ),
            },
            {
                "id": 15,
                "sample_index": 2,
                "url": "https://x.test/imovel/6",
                "html": "<html><body>Sem preço</body></html>",
            },
        ],
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/refinement/preview", json=payload)

    assert response.status_code == 200
    og, jsonld, literal = response.json()["results"]
    assert og["selected_evidence"]["kind"] == "og"
    assert og["selected_evidence"]["fragments"][0].startswith("<meta")
    assert jsonld["selected_evidence"]["kind"] == "jsonld"
    assert jsonld["selected_evidence"]["json_path"] == "offers.price"
    assert literal["selected_evidence"]["kind"] == "literal"
    assert literal["selected_evidence"]["fragments"] == []


@pytest.mark.asyncio
async def test_preview_returns_errors_per_evidence_without_failing_whole_request():
    payload = {
        "field_name": "tipo",
        "extractors": [
            {
                "field_name": "tipo",
                "source_type": "xpath",
                "selector_value": "//*invalid",
                "output_type": "text",
                "priority": 1,
            }
        ],
        "evidence": [
            {
                "id": 16,
                "sample_index": 0,
                "url": "https://x.test/imovel/7",
                "html": "<html><body>Casa</body></html>",
            }
        ],
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/refinement/preview", json=payload)

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["status"] == "erro"
    assert result["error"]
