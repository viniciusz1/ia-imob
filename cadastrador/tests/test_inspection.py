from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.schemas import ExtractorProposal, OnboardingProposal


class _FakeSynthesizer:
    def __init__(self) -> None:
        self.prompts = [
            {"role": "system", "content": "system prompt"},
            {"role": "user", "content": "user prompt"},
        ]

    async def synthesize(self, *, htmls, fields, prior_failures, execution_model):
        return OnboardingProposal(
            strategy=execution_model,
            name="Millar",
            extractors=[
                ExtractorProposal(
                    field_name="tipo",
                    source_type="xpath",
                    selector_value="//h1/text()",
                    output_type="text",
                ),
                ExtractorProposal(
                    field_name="valor",
                    source_type="css",
                    selector_value=".valor::text",
                    output_type="number",
                ),
                ExtractorProposal(
                    field_name="imagem",
                    source_type="css",
                    selector_value=".foto::attr(src)",
                    output_type="image_url",
                    is_optional=True,
                ),
            ],
        )


class _OgPrefixedSynthesizer:
    prompts = [
        {"role": "system", "content": "system prompt"},
        {"role": "user", "content": "user prompt"},
    ]

    async def synthesize(self, *, htmls, fields, prior_failures, execution_model):
        return OnboardingProposal(
            strategy=execution_model,
            name="Itaivan",
            extractors=[
                ExtractorProposal(
                    field_name="imagem",
                    source_type="og",
                    selector_value="og:image",
                    output_type="image_url",
                    is_optional=True,
                ),
            ],
        )


class _PipelineSynthesizer:
    prompts = [
        {"role": "system", "content": "system prompt"},
        {"role": "user", "content": "user prompt"},
    ]

    async def synthesize(self, *, htmls, fields, prior_failures, execution_model):
        return OnboardingProposal(
            strategy=execution_model,
            name="Itaivan",
            extractors=[
                ExtractorProposal(
                    field_name="bairro",
                    source_type="og",
                    selector_value="title",
                    pipeline="split:, :1 | split: - :0 | strip",
                    output_type="text",
                ),
            ],
        )


class _FallbackSynthesizer:
    prompts = [
        {"role": "system", "content": "system prompt"},
        {"role": "user", "content": "user prompt"},
    ]

    async def synthesize(self, *, htmls, fields, prior_failures, execution_model):
        return OnboardingProposal(
            strategy=execution_model,
            name="Itaivan",
            extractors=[
                ExtractorProposal(
                    field_name="valor",
                    source_type="css",
                    selector_value=".preco::text",
                    output_type="number",
                    priority=2,
                ),
                ExtractorProposal(
                    field_name="valor",
                    source_type="xpath",
                    selector_value="//span[@class='missing']/text()",
                    output_type="number",
                    priority=1,
                ),
            ],
        )


class _InvalidPipelineSynthesizer:
    prompts = [
        {"role": "system", "content": "system prompt"},
        {"role": "user", "content": "user prompt"},
    ]

    async def synthesize(self, *, htmls, fields, prior_failures, execution_model):
        return OnboardingProposal(
            strategy=execution_model,
            name="Itaivan",
            extractors=[
                ExtractorProposal(
                    field_name="bairro",
                    source_type="og",
                    selector_value="title",
                    pipeline="split:",
                    output_type="text",
                ),
            ],
        )


class _RetrySynthesizer:
    prompts = [
        {"role": "system", "content": "system prompt"},
        {"role": "user", "content": "user prompt"},
    ]

    def __init__(self) -> None:
        self.prior_failures = []

    async def synthesize(self, *, htmls, fields, prior_failures, execution_model):
        self.prior_failures.append(prior_failures)
        selector = (
            ".preco::text"
            if "valor" in prior_failures
            else "//span[@class='missing']/text()"
        )
        source_type = "css" if "valor" in prior_failures else "xpath"
        return OnboardingProposal(
            strategy=execution_model,
            name="Itaivan",
            extractors=[
                ExtractorProposal(
                    field_name="valor",
                    source_type=source_type,
                    selector_value=selector,
                    output_type="number",
                ),
            ],
        )


def _write_package(root: Path) -> None:
    version = root / "packages" / "millar" / "v1"
    samples = version / "samples"
    samples.mkdir(parents=True)
    (samples / "01.html").write_text(
        """
        <html><head><link rel="canonical" href="https://millar.test/imovel-1"></head>
        <body><h1>Apartamento Centro</h1><span class="valor">R$ 500.000</span>
        <img class="foto" src="https://cdn.test/1.jpg"></body></html>
        """,
        encoding="utf-8",
    )
    (samples / "02.html").write_text(
        """
        <html><head><link rel="canonical" href="https://millar.test/imovel-2"></head>
        <body><h1>Casa Amizade</h1><span class="valor">R$ 750.000</span>
        <img class="foto" src="https://cdn.test/2.jpg"></body></html>
        """,
        encoding="utf-8",
    )
    (version / "manifest.json").write_text(
        json.dumps(
            {
                "agency": "Millar",
                "execution_model": "sitemap",
                "start_url": "https://millar.test",
                "samples": [
                    {"path": "samples/01.html", "url": "https://millar.test/imovel-1"},
                    {"path": "samples/02.html", "url": "https://millar.test/imovel-2"},
                ],
            }
        ),
        encoding="utf-8",
    )


def _write_og_package(root: Path) -> None:
    version = root / "packages" / "itaivan" / "v1"
    samples = version / "samples"
    samples.mkdir(parents=True)
    (samples / "01.html").write_text(
        """
        <html><head>
          <meta property="og:image" content="https://cdn.test/imovel.jpg">
        </head><body></body></html>
        """,
        encoding="utf-8",
    )
    (version / "manifest.json").write_text(
        json.dumps(
            {
                "agency": "Itaivan",
                "execution_model": "sitemap",
                "start_url": "https://itaivan.test",
                "samples": [
                    {"path": "samples/01.html", "url": "https://itaivan.test/imovel/1"}
                ],
            }
        ),
        encoding="utf-8",
    )


def _write_title_package(root: Path) -> None:
    version = root / "packages" / "itaivan" / "v1"
    samples = version / "samples"
    samples.mkdir(parents=True)
    (samples / "01.html").write_text(
        """
        <html><head>
          <meta property="og:title" content="Apartamento para alugar, Vila Baependi - Jaraguá do Sul/SC">
        </head><body></body></html>
        """,
        encoding="utf-8",
    )
    (version / "manifest.json").write_text(
        json.dumps(
            {
                "agency": "Itaivan",
                "execution_model": "sitemap",
                "start_url": "https://itaivan.test",
                "samples": [
                    {"path": "samples/01.html", "url": "https://itaivan.test/imovel/1"}
                ],
            }
        ),
        encoding="utf-8",
    )


def _write_price_package(root: Path) -> None:
    version = root / "packages" / "itaivan" / "v1"
    samples = version / "samples"
    samples.mkdir(parents=True)
    (samples / "01.html").write_text(
        '<html><body><h6 class="preco">R$ 2.400,00</h6></body></html>',
        encoding="utf-8",
    )
    (version / "manifest.json").write_text(
        json.dumps(
            {
                "agency": "Itaivan",
                "execution_model": "sitemap",
                "start_url": "https://itaivan.test",
                "samples": [
                    {"path": "samples/01.html", "url": "https://itaivan.test/imovel/1"}
                ],
            }
        ),
        encoding="utf-8",
    )


@pytest.mark.asyncio
async def test_inspection_bench_writes_review_artifacts(tmp_path):
    from app.inspection import InspectionRunner, load_sample_package

    _write_package(tmp_path)
    package = load_sample_package("millar:v1", packages_root=tmp_path / "packages")
    run_dir = await InspectionRunner(
        synthesizer=_FakeSynthesizer(),
        runs_root=tmp_path / "runs",
    ).run(package)

    result = json.loads((run_dir / "result.json").read_text(encoding="utf-8"))
    report = (run_dir / "report.html").read_text(encoding="utf-8")

    assert result["package"]["agency"] == "Millar"
    assert result["proposal"]["name"] == "Millar"
    assert result["fields"]["tipo"]["verification"]["pass_rate"] == 1.0
    assert result["fields"]["valor"]["values"][0]["value"] == "R$ 500.000"
    assert result["fields"]["imagem"]["values"][1]["value"] == "https://cdn.test/2.jpg"
    assert (run_dir / "prompt-system.txt").read_text(encoding="utf-8") == "system prompt"
    assert (run_dir / "prompt-user.txt").read_text(encoding="utf-8") == "user prompt"
    assert "Relatório de Inspeção" in report
    assert "Apartamento Centro" in report
    assert "<html><head><link rel=\"canonical\"" not in report


@pytest.mark.asyncio
async def test_inspection_bench_accepts_prefixed_og_selector_values(tmp_path):
    from app.inspection import InspectionRunner, load_sample_package

    _write_og_package(tmp_path)
    package = load_sample_package("itaivan:v1", packages_root=tmp_path / "packages")
    run_dir = await InspectionRunner(
        synthesizer=_OgPrefixedSynthesizer(),
        runs_root=tmp_path / "runs",
    ).run(package)

    result = json.loads((run_dir / "result.json").read_text(encoding="utf-8"))

    assert result["fields"]["imagem"]["verification"]["pass_rate"] == 1.0
    assert result["fields"]["imagem"]["values"][0]["value"] == "https://cdn.test/imovel.jpg"


@pytest.mark.asyncio
async def test_inspection_bench_applies_dsl_pipeline_to_extracted_values(tmp_path):
    from app.inspection import InspectionRunner, load_sample_package

    _write_title_package(tmp_path)
    package = load_sample_package("itaivan:v1", packages_root=tmp_path / "packages")
    run_dir = await InspectionRunner(
        synthesizer=_PipelineSynthesizer(),
        runs_root=tmp_path / "runs",
    ).run(package)

    result = json.loads((run_dir / "result.json").read_text(encoding="utf-8"))

    assert result["fields"]["bairro"]["verification"]["pass_rate"] == 1.0
    assert result["fields"]["bairro"]["values"][0]["value"] == "Vila Baependi"


@pytest.mark.asyncio
async def test_inspection_bench_uses_priority_fallback_chains(tmp_path):
    from app.inspection import InspectionRunner, load_sample_package

    _write_price_package(tmp_path)
    package = load_sample_package("itaivan:v1", packages_root=tmp_path / "packages")
    run_dir = await InspectionRunner(
        synthesizer=_FallbackSynthesizer(),
        runs_root=tmp_path / "runs",
    ).run(package)

    result = json.loads((run_dir / "result.json").read_text(encoding="utf-8"))

    assert result["fields"]["valor"]["verification"]["pass_rate"] == 1.0
    assert result["fields"]["valor"]["values"][0]["value"] == "R$ 2.400,00"


@pytest.mark.asyncio
async def test_inspection_bench_reports_invalid_pipelines_without_crashing(tmp_path):
    from app.inspection import InspectionRunner, load_sample_package

    _write_title_package(tmp_path)
    package = load_sample_package("itaivan:v1", packages_root=tmp_path / "packages")
    run_dir = await InspectionRunner(
        synthesizer=_InvalidPipelineSynthesizer(),
        runs_root=tmp_path / "runs",
    ).run(package)

    result = json.loads((run_dir / "result.json").read_text(encoding="utf-8"))

    assert result["fields"]["bairro"]["verification"]["pass_rate"] == 0.0
    assert result["fields"]["bairro"]["values"][0]["value"] is None
    assert "ValueError" in result["fields"]["bairro"]["verification"]["sample_issues"][0]


@pytest.mark.asyncio
async def test_inspection_bench_retries_mandatory_field_failures(tmp_path):
    from app.inspection import InspectionRunner, load_sample_package

    _write_price_package(tmp_path)
    package = load_sample_package("itaivan:v1", packages_root=tmp_path / "packages")
    synthesizer = _RetrySynthesizer()
    run_dir = await InspectionRunner(
        synthesizer=synthesizer,
        runs_root=tmp_path / "runs",
    ).run(package)

    result = json.loads((run_dir / "result.json").read_text(encoding="utf-8"))

    assert len(synthesizer.prior_failures) == 2
    assert synthesizer.prior_failures[0] == {}
    assert "valor" in synthesizer.prior_failures[1]
    assert result["fields"]["valor"]["verification"]["pass_rate"] == 1.0
    assert result["fields"]["valor"]["values"][0]["value"] == "R$ 2.400,00"


def test_inspection_cli_runs_package_with_injected_synthesizer(tmp_path):
    from app.inspection import main

    _write_package(tmp_path)

    exit_code = main(
        [
            "run",
            "millar:v1",
            "--packages-root",
            str(tmp_path / "packages"),
            "--runs-root",
            str(tmp_path / "runs"),
        ],
        synthesizer=_FakeSynthesizer(),
    )

    assert exit_code == 0
    run_dirs = list((tmp_path / "runs").iterdir())
    assert len(run_dirs) == 1
    assert (run_dirs[0] / "result.json").exists()
    assert (run_dirs[0] / "report.html").exists()


def test_sample_package_validation_errors_are_clear(tmp_path):
    from app.inspection import InspectionError, load_sample_package

    with pytest.raises(InspectionError, match="expected '<package>:<version>'"):
        load_sample_package("millar", packages_root=tmp_path / "packages")

    version = tmp_path / "packages" / "millar" / "v1"
    version.mkdir(parents=True)
    (version / "manifest.json").write_text(
        json.dumps(
            {
                "agency": "Millar",
                "execution_model": "api",
                "start_url": "https://millar.test",
                "samples": ["samples/01.html"],
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(InspectionError, match="unsupported execution_model"):
        load_sample_package("millar:v1", packages_root=tmp_path / "packages")

    (version / "manifest.json").write_text(
        json.dumps(
            {
                "agency": "Millar",
                "execution_model": "sitemap",
                "start_url": "https://millar.test",
                "samples": ["samples/01.html"],
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(InspectionError, match="missing files: samples/01.html"):
        load_sample_package("millar:v1", packages_root=tmp_path / "packages")


def test_expected_boolean_false_matches_missing_optional_value():
    from app.inspection import _matches_expected

    assert _matches_expected(field_name="piscina", actual=None, expected=False) is True
    assert _matches_expected(field_name="piscina", actual="", expected=False) is True
    assert _matches_expected(field_name="piscina", actual="Não", expected=False) is True
    assert _matches_expected(field_name="piscina", actual="", expected=True) is False


def test_versioned_millar_package_is_available():
    from app.inspection import load_sample_package

    package = load_sample_package("millar:v1")

    assert package.agency == "Millar"
    assert package.execution_model == "sitemap"
    assert len(package.samples) == 5


def test_create_sample_package_from_sitemap_writes_five_html_examples(tmp_path):
    from app.inspection import create_sample_package_from_sitemap

    sitemap_url = "https://example.test/sitemap.xml"
    responses = {
        sitemap_url: """
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://example.test/imovel/1</loc></url>
          <url><loc>https://example.test/imovel/2</loc></url>
          <url><loc>https://example.test/imovel/3</loc></url>
          <url><loc>https://example.test/imovel/4</loc></url>
          <url><loc>https://example.test/imovel/5</loc></url>
          <url><loc>https://example.test/imovel/6</loc></url>
        </urlset>
        """,
    }
    for index in range(1, 7):
        responses[f"https://example.test/imovel/{index}"] = (
            f"<html><body><h1>Imovel {index}</h1></body></html>"
        )

    package = create_sample_package_from_sitemap(
        sitemap_url=sitemap_url,
        package_reference="example:v1",
        agency="Example",
        packages_root=tmp_path / "packages",
        fetch_text=responses.__getitem__,
    )

    manifest = json.loads((package.root / "manifest.json").read_text(encoding="utf-8"))

    assert package.key == "example"
    assert package.version == "v1"
    assert package.agency == "Example"
    assert package.start_url == "https://example.test/"
    assert manifest["sitemap_url"] == sitemap_url
    assert len(package.samples) == 5
    assert [sample.relative_path for sample in package.samples] == [
        "samples/01.html",
        "samples/02.html",
        "samples/03.html",
        "samples/04.html",
        "samples/05.html",
    ]
    assert package.samples[4].url == "https://example.test/imovel/5"
    assert (package.root / "samples" / "05.html").read_text(encoding="utf-8") == (
        "<html><body><h1>Imovel 5</h1></body></html>"
    )


def test_create_sample_package_from_sitemap_skips_initial_urls(tmp_path):
    from app.inspection import create_sample_package_from_sitemap

    sitemap_url = "https://example.test/sitemap.xml"
    responses = {
        sitemap_url: """
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://example.test/imovel/1</loc></url>
          <url><loc>https://example.test/imovel/2</loc></url>
          <url><loc>https://example.test/imovel/3</loc></url>
          <url><loc>https://example.test/imovel/4</loc></url>
          <url><loc>https://example.test/imovel/5</loc></url>
          <url><loc>https://example.test/imovel/6</loc></url>
        </urlset>
        """,
    }
    for index in range(1, 7):
        responses[f"https://example.test/imovel/{index}"] = (
            f"<html><body><h1>Imovel {index}</h1></body></html>"
        )

    package = create_sample_package_from_sitemap(
        sitemap_url=sitemap_url,
        package_reference="example:v2",
        packages_root=tmp_path / "packages",
        sample_size=2,
        init_url=3,
        fetch_text=responses.__getitem__,
    )
    manifest = json.loads((package.root / "manifest.json").read_text(encoding="utf-8"))

    assert manifest["init_url"] == 3
    assert [sample.url for sample in package.samples] == [
        "https://example.test/imovel/4",
        "https://example.test/imovel/5",
    ]
    assert (package.root / "samples" / "01.html").read_text(encoding="utf-8") == (
        "<html><body><h1>Imovel 4</h1></body></html>"
    )


def test_create_sample_package_from_sitemap_supports_sitemap_index(tmp_path):
    from app.inspection import create_sample_package_from_sitemap

    index_url = "https://nested.test/sitemap_index.xml"
    nested_url = "https://nested.test/properties.xml"
    responses = {
        index_url: f"""
        <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap><loc>{nested_url}</loc></sitemap>
        </sitemapindex>
        """,
        nested_url: """
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>/imovel/a</loc></url>
        </urlset>
        """,
        "https://nested.test/imovel/a": "<html><body>A</body></html>",
    }

    package = create_sample_package_from_sitemap(
        sitemap_url=index_url,
        packages_root=tmp_path / "packages",
        sample_size=1,
        fetch_text=responses.__getitem__,
    )

    assert package.key == "nested"
    assert package.version == "v1"
    assert package.agency == "Nested"
    assert package.samples[0].url == "https://nested.test/imovel/a"
