from typing import Any

import pytest

from crawler_machine.config import CrawlerConfig, FieldConfig
from crawler_machine.crawler import CrawlResult, ImovelCrawler


class FakeCrawlerRunner:
    def __init__(self, responses: dict[str, dict[str, Any]]):
        self.responses = responses
        self.calls: list[str] = []

    async def run(self, url: str) -> CrawlResult:
        self.calls.append(url)
        response = self.responses.get(url, {"success": False, "error": "not found"})
        return CrawlResult(
            url=url,
            success=response["success"],
            data=response.get("data", []),
            error=response.get("error"),
            images=response.get("images", []),
        )


@pytest.fixture
def fields():
    return [
        FieldConfig(name="url", description="URL da página do imóvel", coerce="string"),
        FieldConfig(name="imagem", description="URL da imagem principal do imóvel", coerce="string"),
        FieldConfig(name="quartos", description="Número de quartos", coerce="int"),
        FieldConfig(name="valor", description="Valor do imóvel", coerce="currency"),
    ]


@pytest.fixture
def crawler_config():
    return CrawlerConfig(
        page_timeout=30000,
        max_concurrent=5,
        chunk_size=50,
        chunk_delay=2.0,
        headless=True,
    )


@pytest.mark.anyio
async def test_crawler_injects_page_url_and_preserves_image(fields, crawler_config):
    runner = FakeCrawlerRunner({
        "https://example.com/imovel/1": {
            "success": True,
            "data": [{"quartos": "3 (sendo 1 suíte)", "valor": "R$ 450.000,00", "imagem": "https://example.com/img/1.jpg"}],
        },
        "https://example.com/imovel/2": {
            "success": True,
            "data": [{"quartos": "2", "valor": "R$ 200.000,00"}],
            "images": ["https://example.com/img/2.jpg", "https://example.com/img/3.jpg"],
        },
    })

    crawler = ImovelCrawler(config=crawler_config, fields=fields, crawler_runner=runner.run)
    results, errors = await crawler.crawl([
        "https://example.com/imovel/1",
        "https://example.com/imovel/2",
    ])

    assert len(results) == 2
    assert results[0] == {
        "url": "https://example.com/imovel/1",
        "imagem": "https://example.com/img/1.jpg",
        "quartos": 3,
        "valor": 450_000.0,
    }
    assert results[1] == {
        "url": "https://example.com/imovel/2",
        "imagem": "https://example.com/img/2.jpg",
        "quartos": 2,
        "valor": 200_000.0,
    }
    assert errors == []


@pytest.mark.anyio
async def test_crawler_collects_errors_without_stopping(fields, crawler_config):
    runner = FakeCrawlerRunner({
        "https://example.com/imovel/1": {
            "success": True,
            "data": [{"quartos": "3", "valor": "R$ 300.000,00"}],
        },
        "https://example.com/imovel/2": {
            "success": False,
            "error": "timeout",
        },
    })

    crawler = ImovelCrawler(config=crawler_config, fields=fields, crawler_runner=runner.run)
    results, errors = await crawler.crawl([
        "https://example.com/imovel/1",
        "https://example.com/imovel/2",
    ])

    assert len(results) == 1
    assert results[0] == {
        "url": "https://example.com/imovel/1",
        "quartos": 3,
        "valor": 300_000.0,
    }
    assert len(errors) == 1
    assert errors[0]["url"] == "https://example.com/imovel/2"
    assert errors[0]["error"] == "timeout"
