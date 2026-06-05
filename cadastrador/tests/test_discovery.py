from __future__ import annotations

import pytest

from app.services.discovery import HttpFetcher, sample_urls


def test_sample_urls_clamps_floor_to_20():
    urls = [f"u{i}" for i in range(50)]  # 30% = 15, raised to floor

    assert len(sample_urls(urls)) == 20


def test_sample_urls_clamps_ceiling_to_60():
    urls = [f"u{i}" for i in range(1000)]  # 30% = 300, capped

    assert len(sample_urls(urls)) == 60


def test_sample_urls_uses_all_when_below_floor():
    urls = [f"u{i}" for i in range(12)]

    assert sample_urls(urls) == urls


def test_sample_urls_spreads_across_the_list_not_a_prefix():
    urls = [f"u{i}" for i in range(300)]  # 30% = 90, capped to 60

    sampled = sample_urls(urls)
    indices = [int(value[1:]) for value in sampled]

    assert len(sampled) == 60
    assert indices[0] == 0
    assert indices == sorted(indices)
    assert len(set(indices)) == 60
    assert indices[-1] >= 250  # reaches deep into the list, not just the top


@pytest.mark.asyncio
async def test_fetch_pairs_returns_aligned_pairs_skipping_failures():
    class _Fetcher(HttpFetcher):
        async def fetch(self, url):
            if "bad" in url:
                raise RuntimeError("boom")
            return f"<html>{url}</html>"

    pairs = await _Fetcher().fetch_pairs(["http://a", "http://bad", "http://c"])

    assert pairs == [
        ("http://a", "<html>http://a</html>"),
        ("http://c", "<html>http://c</html>"),
    ]
