from __future__ import annotations

import json

import pytest

from app.services.validation import ScrapyValidator


def _fake_scrapy(tmp_path, body: str) -> str:
    """Create a fake scrapy executable that receives the real CLI args."""
    script = tmp_path / "fake-scrapy"
    script.write_text(
        "#!/usr/bin/env python3\n"
        "import json, sys, time\n"
        'out = sys.argv[sys.argv.index("-O") + 1]\n'
        + body
    )
    script.chmod(0o755)
    return str(script)


def _item(**overrides) -> dict:
    item = {
        "tipo": "Apartamento",
        "imobiliaria": "Imob",
        "valor": "500000",
        "bairro": "Centro",
        "cidade": "Joinville",
        "link_imovel": "https://x.test/imovel/1",
    }
    item.update(overrides)
    return item


def _validator(tmp_path, scrapy: str, *, timeout: float = 5.0) -> ScrapyValidator:
    return ScrapyValidator(
        scrapy_cwd=str(tmp_path), scrapy_executable=scrapy, timeout=timeout
    )


@pytest.mark.asyncio
async def test_timed_out_crawl_is_inconclusive_and_keeps_partial_items(tmp_path):
    items = json.dumps([_item(), _item(link_imovel="https://x.test/imovel/2")])
    scrapy = _fake_scrapy(
        tmp_path,
        f"open(out, 'w').write({items!r})\n"
        "time.sleep(30)\n",
    )

    report = await _validator(tmp_path, scrapy, timeout=0.5).run(1, "sitemap", "Imob")

    assert report.outcome == "saved_inactive"
    assert "scrapy_crawl_timeout" in report.issues
    assert report.sample_size == 2
    assert report.fields["valor"]["pass_rate"] == 1.0


@pytest.mark.asyncio
async def test_crawl_without_items_is_inconclusive_not_rejected(tmp_path):
    scrapy = _fake_scrapy(tmp_path, 'open(out, "w").write("[]")\n')

    report = await _validator(tmp_path, scrapy).run(1, "sitemap", "Imob")

    assert report.outcome == "saved_inactive"
    assert "no_items_extracted" in report.issues


@pytest.mark.asyncio
async def test_clean_crawl_with_passing_fields_confirms_active(tmp_path):
    items = json.dumps([_item(), _item(link_imovel="https://x.test/imovel/2")])
    scrapy = _fake_scrapy(tmp_path, f"open(out, 'w').write({items!r})\n")

    report = await _validator(tmp_path, scrapy).run(1, "sitemap", "Imob")

    assert report.outcome == "active"
    assert report.sample_size == 2
