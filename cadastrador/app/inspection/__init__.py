from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import re
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from typing import Any, Protocol
from urllib.parse import urljoin, urlparse

from app.compat import SERVICE_ROOT, ensure_imobscrapy_imports
from app.dependencies import get_settings
from app.schemas import ExtractorProposal, OnboardingProposal
from app.services.extraction import extract_field_value, loader_treatment
from app.services.llm import LlmClient
from app.services.verification import SelectorVerifier

ensure_imobscrapy_imports()
from imobiliarias.config.field_catalog import (  # noqa: E402
    BEST_EFFORT_EXTRACTOR_FIELDS,
    MANDATORY_EXTRACTOR_FIELDS,
    loader_output_type,
)


class InspectionError(RuntimeError):
    pass


class Synthesizer(Protocol):
    async def synthesize(
        self,
        *,
        htmls: list[str],
        fields: list[str],
        prior_failures: dict[str, list[str]],
        execution_model: str,
    ) -> OnboardingProposal | None: ...


@dataclass(frozen=True)
class SampleHtml:
    path: Path
    relative_path: str
    url: str | None
    html: str
    expected: dict[str, Any] | None = None


@dataclass(frozen=True)
class SamplePackage:
    key: str
    version: str
    agency: str
    execution_model: str
    start_url: str
    root: Path
    samples: tuple[SampleHtml, ...]

    @property
    def htmls(self) -> list[str]:
        return [sample.html for sample in self.samples]


def load_sample_package(
    reference: str,
    *,
    packages_root: Path | str | None = None,
) -> SamplePackage:
    key, version = _parse_reference(reference)
    root = Path(packages_root or SERVICE_ROOT / "app" / "inspection" / "packages")
    package_root = root / key / version
    manifest_path = package_root / "manifest.json"
    if not manifest_path.exists():
        raise InspectionError(f"manifest not found for sample package {reference!r}")

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise InspectionError(f"invalid manifest JSON for {reference!r}: {exc}") from exc

    agency = _required_string(manifest, "agency", reference)
    execution_model = _required_string(manifest, "execution_model", reference)
    if execution_model not in {"sitemap", "wsm"}:
        raise InspectionError(
            f"unsupported execution_model {execution_model!r} for {reference!r}"
        )
    start_url = _required_string(manifest, "start_url", reference)

    raw_samples = manifest.get("samples")
    if not isinstance(raw_samples, list) or not raw_samples:
        raise InspectionError(f"manifest for {reference!r} must define samples")

    samples: list[SampleHtml] = []
    missing: list[str] = []
    for item in raw_samples:
        sample_path, sample_url = _sample_entry(item, reference)
        absolute = package_root / sample_path
        if not absolute.exists():
            missing.append(sample_path)
            continue
        samples.append(
            SampleHtml(
                path=absolute,
                relative_path=sample_path,
                url=sample_url,
                html=absolute.read_text(encoding="utf-8-sig"),
                expected=item.get("expected") if isinstance(item.get("expected"), dict) else None,
            )
        )

    if missing:
        raise InspectionError(
            f"sample package {reference!r} is missing files: {', '.join(missing)}"
        )

    return SamplePackage(
        key=key,
        version=version,
        agency=agency,
        execution_model=execution_model,
        start_url=start_url,
        root=package_root,
        samples=tuple(samples),
    )


class InspectionRunner:
    def __init__(
        self,
        *,
        synthesizer: Synthesizer,
        runs_root: Path | str | None = None,
        verifier: SelectorVerifier | None = None,
        max_attempts: int = 2,
    ) -> None:
        self._synthesizer = synthesizer
        self._runs_root = Path(runs_root or SERVICE_ROOT / "app" / "inspection" / "runs")
        self._verifier = verifier or SelectorVerifier()
        self._max_attempts = max(1, max_attempts)

    async def run(self, package: SamplePackage) -> Path:
        run_dir = self._create_run_dir(package)
        prior_failures: dict[str, list[str]] = {}
        result: dict[str, Any] | None = None
        for _attempt in range(self._max_attempts):
            proposal = await self._synthesizer.synthesize(
                htmls=package.htmls,
                fields=[*MANDATORY_EXTRACTOR_FIELDS, *BEST_EFFORT_EXTRACTOR_FIELDS],
                prior_failures=prior_failures,
                execution_model=package.execution_model,
            )
            if proposal is None:
                raise InspectionError("LLM synthesis returned no proposal")
            result = _build_result(
                package=package,
                proposal=proposal,
                verifier=self._verifier,
                run_dir=run_dir,
            )
            prior_failures = _mandatory_failures(result)
            if not prior_failures:
                break

        prompts = _extract_prompts(self._synthesizer)
        (run_dir / "prompt-system.txt").write_text(prompts["system"], encoding="utf-8")
        (run_dir / "prompt-user.txt").write_text(prompts["user"], encoding="utf-8")

        if result is None:
            raise InspectionError("inspection produced no result")
        (run_dir / "result.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        (run_dir / "report.html").write_text(render_report_html(result), encoding="utf-8")
        return run_dir

    def _create_run_dir(self, package: SamplePackage) -> Path:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        run_dir = self._runs_root / f"{package.key}-{package.version}-{timestamp}"
        run_dir.mkdir(parents=True, exist_ok=False)
        return run_dir


def create_sample_package_from_sitemap(
    *,
    sitemap_url: str,
    package_reference: str | None = None,
    agency: str | None = None,
    sample_size: int = 5,
    init_url: int = 0,
    packages_root: Path | str | None = None,
    force: bool = False,
    fetch_text=None,
) -> SamplePackage:
    if sample_size < 1:
        raise InspectionError("sample_size must be greater than zero")
    if init_url < 0:
        raise InspectionError("init_url must be zero or greater")

    fetch = fetch_text or _fetch_text
    key, version = (
        _parse_reference(package_reference)
        if package_reference
        else (_package_key_from_url(sitemap_url), "v1")
    )
    root = Path(packages_root or SERVICE_ROOT / "app" / "inspection" / "packages")
    package_root = root / key / version
    if package_root.exists() and not force:
        raise InspectionError(
            f"sample package {key}:{version} already exists; pass --force to replace it"
        )

    sitemap_text = fetch(sitemap_url)
    candidate_urls = _extract_sitemap_page_urls(
        sitemap_text,
        sitemap_url=sitemap_url,
        fetch_text=fetch,
    )
    if not candidate_urls:
        raise InspectionError(f"sitemap {sitemap_url!r} did not contain page URLs")
    selected_urls = candidate_urls[init_url:]

    package_root.mkdir(parents=True, exist_ok=True)
    samples_root = package_root / "samples"
    if force and samples_root.exists():
        for sample in samples_root.glob("*.html"):
            sample.unlink()
    samples_root.mkdir(parents=True, exist_ok=True)

    samples: list[dict[str, str]] = []
    failures: list[str] = []
    for url in selected_urls:
        if len(samples) >= sample_size:
            break
        try:
            html = fetch(url)
        except Exception as exc:
            failures.append(f"{url}: {type(exc).__name__}: {exc}")
            continue
        sample_path = f"samples/{len(samples) + 1:02d}.html"
        (package_root / sample_path).write_text(html, encoding="utf-8")
        samples.append({"path": sample_path, "url": url})

    if len(samples) < sample_size:
        detail = "; ".join(failures[:5])
        raise InspectionError(
            f"only collected {len(samples)} of {sample_size} requested samples"
            + (f" after skipping {init_url} sitemap URLs" if init_url else "")
            + (f": {detail}" if detail else "")
        )

    manifest = {
        "agency": agency or fallback_agency_name_from_url(sitemap_url),
        "execution_model": "sitemap",
        "start_url": _site_root(sitemap_url),
        "sitemap_url": sitemap_url,
        "init_url": init_url,
        "samples": samples,
    }
    (package_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return load_sample_package(f"{key}:{version}", packages_root=root)


def create_sample_package_from_database(
    *,
    package_reference: str,
    agency: str | None = None,
    sample_size: int = 5,
    packages_root: Path | str | None = None,
    force: bool = False,
    env_paths: Sequence[Path] | None = None,
    fetch_text=None,
) -> SamplePackage:
    if sample_size < 1:
        raise InspectionError("sample_size must be greater than zero")
    key, version = _parse_reference(package_reference)
    root = Path(packages_root or SERVICE_ROOT / "app" / "inspection" / "packages")
    package_root = root / key / version
    if package_root.exists() and not force:
        raise InspectionError(
            f"sample package {key}:{version} already exists; pass --force to replace it"
        )

    rows = _select_database_samples(
        agency=agency,
        sample_size=sample_size,
        env_paths=env_paths,
    )
    if len(rows) < sample_size:
        raise InspectionError(f"only found {len(rows)} database samples")

    fetch = fetch_text or _fetch_text
    package_root.mkdir(parents=True, exist_ok=True)
    samples_root = package_root / "samples"
    if force and samples_root.exists():
        for sample in samples_root.glob("*.html"):
            sample.unlink()
    samples_root.mkdir(parents=True, exist_ok=True)

    samples: list[dict[str, Any]] = []
    failures: list[str] = []
    for row in rows:
        if len(samples) >= sample_size:
            break
        url = str(row["link_imovel"])
        try:
            html = fetch(url)
        except Exception as exc:
            failures.append(f"{url}: {type(exc).__name__}: {exc}")
            continue
        sample_path = f"samples/{len(samples) + 1:02d}.html"
        (package_root / sample_path).write_text(html, encoding="utf-8")
        expected = {field: row.get(field) for field in _expected_fields()}
        samples.append(
            {
                "path": sample_path,
                "url": url,
                "db_id": row.get("id"),
                "expected": expected,
            }
        )

    if len(samples) < sample_size:
        detail = "; ".join(failures[:5])
        raise InspectionError(
            f"only collected {len(samples)} of {sample_size} requested samples"
            + (f": {detail}" if detail else "")
        )

    selected_agency = str(rows[0]["imobiliaria"])
    manifest = {
        "agency": selected_agency,
        "execution_model": "sitemap",
        "start_url": _site_root(str(rows[0]["link_imovel"])),
        "source": "scrapy-properties",
        "samples": samples,
    }
    (package_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, default=str) + "\n",
        encoding="utf-8",
    )
    return load_sample_package(f"{key}:{version}", packages_root=root)

def render_report_html(result: dict[str, Any]) -> str:
    package = result["package"]
    fields = result["fields"]
    mandatory = [field for field in MANDATORY_EXTRACTOR_FIELDS if field in fields]
    best_effort = [field for field in BEST_EFFORT_EXTRACTOR_FIELDS if field in fields]
    unknown = [
        field
        for field in fields
        if field not in MANDATORY_EXTRACTOR_FIELDS
        and field not in BEST_EFFORT_EXTRACTOR_FIELDS
    ]
    return "\n".join(
        [
            "<!doctype html>",
            '<html lang="pt-BR">',
            "<head>",
            '<meta charset="utf-8">',
            "<title>Relatório de Inspeção</title>",
            "<style>",
            "body{font-family:Arial,sans-serif;margin:24px;line-height:1.4;color:#202124}",
            "table{border-collapse:collapse;width:100%;margin:12px 0 28px}",
            "th,td{border:1px solid #d0d7de;padding:8px;text-align:left;vertical-align:top}",
            "th{background:#f6f8fa}.ok{color:#116329}.fail{color:#a40e26}",
            "code{background:#f6f8fa;padding:2px 4px;border-radius:4px}",
            "</style>",
            "</head>",
            "<body>",
            "<h1>Relatório de Inspeção</h1>",
            "<h2>Pacote de Amostras</h2>",
            "<dl>",
            f"<dt>Agency</dt><dd>{escape(package['agency'])}</dd>",
            f"<dt>Version</dt><dd>{escape(package['version'])}</dd>",
            f"<dt>Execution model</dt><dd>{escape(package['execution_model'])}</dd>",
            f"<dt>Start URL</dt><dd>{escape(package['start_url'])}</dd>",
            "</dl>",
            _render_samples(package["samples"]),
            _render_field_section("Mandatory fields", mandatory, fields),
            _render_field_section("Best-effort fields", best_effort, fields),
            _render_field_section("Other fields", unknown, fields) if unknown else "",
            "</body>",
            "</html>",
        ]
    )


def main(argv: list[str] | None = None, *, synthesizer: Synthesizer | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m app.inspection",
        description="Run the Cadastrador Bancada de Inspeção.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    run_parser = subparsers.add_parser("run", help="Run Sintese de Extractors inspection")
    run_parser.add_argument("package", help="Sample package reference, e.g. millar:v1")
    run_parser.add_argument("--llm", action="store_true", help="Call the real LLM")
    run_parser.add_argument("--packages-root", type=Path, default=None)
    run_parser.add_argument("--runs-root", type=Path, default=None)
    create_parser = subparsers.add_parser(
        "create-package",
        help="Create a versioned sample package from a sitemap URL",
    )
    create_parser.add_argument("--sitemap-url", required=True)
    create_parser.add_argument("--package", dest="package_reference", default=None)
    create_parser.add_argument("--agency", default=None)
    create_parser.add_argument("--sample-size", type=int, default=5)
    create_parser.add_argument(
        "--init-url",
        type=int,
        default=0,
        help="Skip the first N URLs found in the sitemap before collecting samples",
    )
    create_parser.add_argument("--packages-root", type=Path, default=None)
    create_parser.add_argument("--force", action="store_true")
    db_parser = subparsers.add_parser(
        "create-db-package",
        help="Create a sample package from rows in scrapy-properties",
    )
    db_parser.add_argument("--package", dest="package_reference", required=True)
    db_parser.add_argument("--agency", default=None)
    db_parser.add_argument("--sample-size", type=int, default=5)
    db_parser.add_argument("--packages-root", type=Path, default=None)
    db_parser.add_argument("--force", action="store_true")
    db_parser.add_argument(
        "--env",
        dest="env_paths",
        action="append",
        type=Path,
        default=None,
        help="Env file with DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD",
    )

    args = parser.parse_args(argv)
    if args.command == "create-package":
        try:
            package = create_sample_package_from_sitemap(
                sitemap_url=args.sitemap_url,
                package_reference=args.package_reference,
                agency=args.agency,
                sample_size=args.sample_size,
                init_url=args.init_url,
                packages_root=args.packages_root,
                force=args.force,
            )
        except InspectionError as exc:
            print(f"inspection error: {exc}", file=sys.stderr)
            return 2

        print(f"{package.key}:{package.version} {package.root}")
        return 0

    if args.command == "create-db-package":
        try:
            package = create_sample_package_from_database(
                package_reference=args.package_reference,
                agency=args.agency,
                sample_size=args.sample_size,
                packages_root=args.packages_root,
                force=args.force,
                env_paths=args.env_paths,
            )
        except InspectionError as exc:
            print(f"inspection error: {exc}", file=sys.stderr)
            return 2

        print(f"{package.key}:{package.version} {package.root}")
        return 0

    if not args.llm and synthesizer is None:
        parser.error("only run --llm is supported")

    try:
        package = load_sample_package(args.package, packages_root=args.packages_root)
        runner = InspectionRunner(
            synthesizer=synthesizer or _RecordingLlmSynthesizer(),
            runs_root=args.runs_root,
        )
        run_dir = asyncio.run(runner.run(package))
    except (InspectionError, RuntimeError) as exc:
        print(f"inspection error: {exc}", file=sys.stderr)
        return 2

    print(run_dir)
    return 0


def _build_result(
    *,
    package: SamplePackage,
    proposal: OnboardingProposal,
    verifier: SelectorVerifier,
    run_dir: Path,
) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    for field_name, extractors in _extractor_chains(proposal.extractors).items():
        sorted_extractors = _sort_extractors(extractors)
        report = verifier.verify_chain(field_name, sorted_extractors, package.htmls)
        output_type = sorted_extractors[0].output_type
        values: list[dict[str, Any]] = []
        for sample in package.samples:
            raw = _safe_extract_value(sorted_extractors, sample.html)
            final = loader_treatment(field_name, output_type, raw)
            expected = _expected_value(sample.expected, field_name)
            values.append(
                {
                    "sample": sample.relative_path,
                    "url": sample.url,
                    "value": raw,
                    "final": final,
                    "expected": expected,
                    "matches_expected": _matches_expected(
                        field_name=field_name,
                        actual=final,
                        expected=expected,
                    ),
                }
            )
        expected_values = [item for item in values if item["expected"] is not None]
        expected_matches = [
            item for item in expected_values if item["matches_expected"] is True
        ]
        fields[field_name] = {
            "extractor": sorted_extractors[0].model_dump(mode="json"),
            "extractors": [
                extractor.model_dump(mode="json") for extractor in sorted_extractors
            ],
            "verification": report.model_dump(mode="json"),
            "loader_output_type": loader_output_type(field_name, output_type),
            "values": values,
            "expected": {
                "matched": len(expected_matches),
                "sample_size": len(expected_values),
                "match_rate": (
                    len(expected_matches) / len(expected_values)
                    if expected_values
                    else None
                ),
            },
        }

    return {
        "run": {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "run_dir": str(run_dir),
        },
        "package": {
            "key": package.key,
            "version": package.version,
            "agency": package.agency,
            "execution_model": package.execution_model,
            "start_url": package.start_url,
            "root": str(package.root),
            "samples": [
                {"path": sample.relative_path, "url": sample.url}
                for sample in package.samples
            ],
        },
        "proposal": proposal.model_dump(mode="json"),
        "fields": fields,
        "artifacts": {
            "result_json": "result.json",
            "report_html": "report.html",
            "prompt_system": "prompt-system.txt",
            "prompt_user": "prompt-user.txt",
        },
    }


def _mandatory_failures(result: dict[str, Any]) -> dict[str, list[str]]:
    failures: dict[str, list[str]] = {}
    fields = result["fields"]
    for field_name in MANDATORY_EXTRACTOR_FIELDS:
        field = fields.get(field_name)
        if field is None:
            failures[field_name] = ["missing extractor"]
            continue
        verification = field["verification"]
        if verification["pass_rate"] < 1:
            failures[field_name] = verification.get("sample_issues") or [
                f"pass_rate={verification['pass_rate']:.2f}"
            ]
    return failures


def _render_samples(samples: list[dict[str, Any]]) -> str:
    rows = [
        "<h2>Amostras HTML</h2>",
        "<table><thead><tr><th>Path</th><th>URL</th></tr></thead><tbody>",
    ]
    for sample in samples:
        rows.append(
            "<tr>"
            f"<td><code>{escape(str(sample.get('path') or ''))}</code></td>"
            f"<td>{escape(str(sample.get('url') or ''))}</td>"
            "</tr>"
        )
    rows.append("</tbody></table>")
    return "\n".join(rows)


def _render_field_section(
    title: str,
    field_names: list[str],
    fields: dict[str, Any],
) -> str:
    if not field_names:
        return f"<h2>{escape(title)}</h2><p>No fields returned.</p>"
    rows = [
        f"<h2>{escape(title)}</h2>",
        "<table><thead><tr>"
        "<th>Field</th><th>Extractor</th><th>Status</th><th>Resultado Extraído</th>"
        "<th>Tratamento Final (loader)</th><th>Esperado DB</th><th>Match</th><th>Issues</th>"
        "</tr></thead><tbody>",
    ]
    for field_name in field_names:
        field = fields[field_name]
        verification = field["verification"]
        status_class = "ok" if verification["pass_rate"] >= 1 else "fail"
        values = "<br>".join(
            f"<code>{escape(str(item['sample']))}</code>: {escape(str(item.get('value') or ''))}"
            for item in field["values"]
        )
        finals = "<br>".join(
            f"<code>{escape(str(item['sample']))}</code>: {escape(str(item.get('final') or ''))}"
            for item in field["values"]
        )
        expected = "<br>".join(
            f"<code>{escape(str(item['sample']))}</code>: {escape(str(item.get('expected') if item.get('expected') is not None else ''))}"
            for item in field["values"]
        )
        matches = "<br>".join(
            f"<code>{escape(str(item['sample']))}</code>: {_render_match(item.get('matches_expected'))}"
            for item in field["values"]
        )
        loader_type = field.get("loader_output_type")
        final_header = (
            f"<div><small>output_type=<code>{escape(str(loader_type))}</code></small></div>"
            if loader_type
            else ""
        )
        issues = "<br>".join(
            escape(str(issue)) for issue in verification.get("sample_issues", [])
        )
        rows.append(
            "<tr>"
            f"<td>{escape(field_name)}</td>"
            f"<td>{_render_extractor_chain(field)}</td>"
            f"<td class=\"{status_class}\">"
            f"{verification['filled']}/{verification['sample_size']} "
            f"({verification['pass_rate']:.2f})"
            "</td>"
            f"<td>{values}</td>"
            f"<td>{final_header}{finals}</td>"
            f"<td>{expected}</td>"
            f"<td>{matches}</td>"
            f"<td>{issues}</td>"
            "</tr>"
        )
    rows.append("</tbody></table>")
    return "\n".join(rows)


def _render_match(value: Any) -> str:
    if value is True:
        return '<span class="ok">ok</span>'
    if value is False:
        return '<span class="fail">diff</span>'
    return ""


def _render_extractor_chain(field: dict[str, Any]) -> str:
    extractors = field.get("extractors") or [field["extractor"]]
    rendered: list[str] = []
    for extractor in extractors:
        pipeline = extractor.get("pipeline")
        rendered.append(
            f"priority=<code>{escape(str(extractor.get('priority')))}</code><br>"
            f"source_type=<code>{escape(str(extractor.get('source_type')))}</code><br>"
            f"selector=<code>{escape(str(extractor.get('selector_value')))}</code><br>"
            f"output_type=<code>{escape(str(extractor.get('output_type')))}</code><br>"
            f"optional=<code>{escape(str(extractor.get('is_optional')))}</code>"
            + (
                f"<br>pipeline=<code>{escape(str(pipeline))}</code>"
                if pipeline
                else ""
            )
        )
    return "<hr>".join(rendered)


def _extractor_chains(
    extractors: Sequence[ExtractorProposal],
) -> dict[str, list[ExtractorProposal]]:
    chains: dict[str, list[ExtractorProposal]] = {}
    for extractor in extractors:
        chains.setdefault(extractor.field_name, []).append(extractor)
    return chains


def _sort_extractors(
    extractors: Sequence[ExtractorProposal],
) -> list[ExtractorProposal]:
    return sorted(extractors, key=lambda extractor: extractor.priority)


def _safe_extract_value(
    extractors: Sequence[ExtractorProposal],
    html: str,
) -> str | None:
    try:
        return extract_field_value(extractors, html)
    except Exception:
        return None


def _parse_reference(reference: str) -> tuple[str, str]:
    if ":" not in reference:
        raise InspectionError(
            f"invalid sample package reference {reference!r}; expected '<package>:<version>'"
        )
    key, version = reference.split(":", 1)
    if not key or not version:
        raise InspectionError(
            f"invalid sample package reference {reference!r}; expected '<package>:<version>'"
        )
    return key, version


def _sample_entry(item: Any, reference: str) -> tuple[str, str | None]:
    if isinstance(item, str):
        return item, None
    if isinstance(item, dict):
        sample_path = item.get("path")
        sample_url = item.get("url")
        if isinstance(sample_path, str) and sample_path:
            return sample_path, sample_url if isinstance(sample_url, str) else None
    raise InspectionError(f"invalid sample entry in {reference!r}: {item!r}")


def _required_string(manifest: dict[str, Any], key: str, reference: str) -> str:
    value = manifest.get(key)
    if not isinstance(value, str) or not value:
        raise InspectionError(f"manifest for {reference!r} must define {key}")
    return value


def _fetch_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "IAImobInspectionBot/0.1",
            "Accept": "text/html,application/xml,text/xml;q=0.9,*/*;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            return response.read().decode(charset, errors="replace")
    except urllib.error.HTTPError as exc:
        raise InspectionError(f"failed to fetch {url!r}: HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise InspectionError(f"failed to fetch {url!r}: {exc.reason}") from exc


def _extract_sitemap_page_urls(
    sitemap_text: str,
    *,
    sitemap_url: str,
    fetch_text,
    visited: set[str] | None = None,
) -> list[str]:
    seen = visited or set()
    if sitemap_url in seen:
        return []
    seen.add(sitemap_url)

    try:
        root = ET.fromstring(sitemap_text.encode("utf-8"))
    except ET.ParseError as exc:
        raise InspectionError(f"invalid sitemap XML at {sitemap_url!r}: {exc}") from exc

    root_name = _xml_name(root.tag)
    if root_name == "sitemapindex":
        urls: list[str] = []
        for loc in _child_locs(root, "sitemap"):
            nested_url = urljoin(sitemap_url, loc)
            try:
                nested_text = fetch_text(nested_url)
            except Exception:
                continue
            urls.extend(
                _extract_sitemap_page_urls(
                    nested_text,
                    sitemap_url=nested_url,
                    fetch_text=fetch_text,
                    visited=seen,
                )
            )
        return _unique(urls)

    if root_name == "urlset":
        return _unique(urljoin(sitemap_url, loc) for loc in _child_locs(root, "url"))

    return _unique(
        urljoin(sitemap_url, element.text.strip())
        for element in root.iter()
        if _xml_name(element.tag) == "loc" and element.text and element.text.strip()
    )


def _child_locs(root: ET.Element, child_name: str) -> list[str]:
    locs: list[str] = []
    for child in root:
        if _xml_name(child.tag) != child_name:
            continue
        for element in child:
            if _xml_name(element.tag) == "loc" and element.text and element.text.strip():
                locs.append(element.text.strip())
                break
    return locs


def _xml_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _unique(urls) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for url in urls:
        if url in seen:
            continue
        seen.add(url)
        result.append(url)
    return result


def _expected_fields() -> tuple[str, ...]:
    return (*MANDATORY_EXTRACTOR_FIELDS, *BEST_EFFORT_EXTRACTOR_FIELDS)


def _select_database_samples(
    *,
    agency: str | None,
    sample_size: int,
    env_paths: Sequence[Path] | None,
) -> list[dict[str, Any]]:
    try:
        import psycopg2
        import psycopg2.extras
    except ModuleNotFoundError as exc:
        raise InspectionError("psycopg2 is required to create DB sample packages") from exc

    _load_db_env(env_paths)
    conn_kwargs = _db_connection_kwargs()
    score_expr = _db_filled_score_expression()
    try:
        conn = psycopg2.connect(**conn_kwargs)
    except Exception as exc:
        raise InspectionError(f"failed to connect to database: {type(exc).__name__}: {exc}") from exc

    try:
        with conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            selected_agency = agency or _top_sample_agency(cur, score_expr, sample_size)
            fields_sql = ", ".join(f'"{field}"' for field in _expected_fields())
            cur.execute(
                f"""
                SELECT id, imobiliaria, {fields_sql}
                FROM "scrapy-properties"
                WHERE imobiliaria = %s
                  AND link_imovel IS NOT NULL
                  AND trim(link_imovel) <> ''
                ORDER BY ({score_expr}) DESC, id ASC
                LIMIT %s
                """,
                (selected_agency, max(sample_size * 4, sample_size)),
            )
            return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def _load_db_env(env_paths: Sequence[Path] | None) -> None:
    paths = list(env_paths or [])
    paths.extend(
        [
            Path(".envb"),
            Path("imobscrapy/.env"),
            Path("ai-backendd-imobiliaria/.env"),
        ]
    )
    for path in paths:
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, _, value = stripped.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def _db_connection_kwargs() -> dict[str, str]:
    dbname = os.environ.get("DB_NAME") or os.environ.get("DB_DATABASE")
    user = os.environ.get("DB_USER") or os.environ.get("DB_USERNAME")
    host = os.environ.get("DB_HOST", "localhost")
    port = os.environ.get("DB_PORT", "5432")
    password = os.environ.get("DB_PASSWORD", "")
    missing = [
        name
        for name, value in {
            "DB_HOST": host,
            "DB_PORT": port,
            "DB_NAME/DB_DATABASE": dbname,
            "DB_USER/DB_USERNAME": user,
        }.items()
        if not value
    ]
    if missing:
        raise InspectionError(f"missing database env vars: {', '.join(missing)}")
    return {
        "host": host,
        "port": port,
        "dbname": str(dbname),
        "user": str(user),
        "password": password,
    }


def _db_filled_score_expression() -> str:
    scored_fields = (
        "valor",
        "bairro",
        "cidade",
        "imagem",
        "descricao",
        *BEST_EFFORT_EXTRACTOR_FIELDS,
    )
    return " + ".join(
        f"(CASE WHEN \"{field}\" IS NOT NULL THEN 1 ELSE 0 END)"
        for field in dict.fromkeys(scored_fields)
    )


def _top_sample_agency(cur, score_expr: str, sample_size: int) -> str:
    cur.execute(
        f"""
        SELECT imobiliaria, avg({score_expr}) AS avg_score, max({score_expr}) AS max_score
        FROM "scrapy-properties"
        WHERE link_imovel IS NOT NULL
          AND trim(link_imovel) <> ''
          AND imobiliaria IS NOT NULL
          AND trim(imobiliaria) <> ''
        GROUP BY imobiliaria
        HAVING count(*) >= %s
        ORDER BY avg_score DESC, max_score DESC, count(*) DESC
        LIMIT 1
        """,
        (sample_size,),
    )
    row = cur.fetchone()
    if not row:
        raise InspectionError("no agency with enough scrapy-properties rows was found")
    return str(row["imobiliaria"])


def _expected_value(expected: dict[str, Any] | None, field_name: str) -> Any:
    if not expected:
        return None
    return expected.get(field_name)


def _matches_expected(*, field_name: str, actual: Any, expected: Any) -> bool | None:
    if expected is None:
        return None
    output_type = loader_output_type(field_name, None)
    if output_type == "bool":
        actual_bool = False if actual is None or actual == "" else _to_bool(actual)
        expected_bool = _to_bool(expected)
        return actual_bool == expected_bool if expected_bool is not None else None
    if actual is None or actual == "":
        return False
    if output_type in {"float", "optional_float"}:
        return _to_float(actual) == _to_float(expected)
    if output_type == "url":
        return str(actual).strip() == str(expected).strip()
    return _normalize_compare_text(str(actual)) == _normalize_compare_text(str(expected))


def _to_float(value: Any) -> float | None:
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None


def _to_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"1", "true", "t", "yes", "sim"}:
        return True
    if text in {"0", "false", "f", "no", "nao", "não", ""}:
        return False
    return None


def _normalize_compare_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().casefold()


def _package_key_from_url(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    key = host.split(".", 1)[0]
    return re.sub(r"[^a-z0-9]+", "-", key).strip("-") or "sample"


def fallback_agency_name_from_url(url: str) -> str:
    key = _package_key_from_url(url)
    return re.sub(r"[-_]+", " ", key).strip().title() or "Sample"


def _site_root(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}/"


def _extract_prompts(synthesizer: Any) -> dict[str, str]:
    messages = getattr(synthesizer, "prompts", None)
    if messages is None:
        messages = getattr(synthesizer, "last_messages", None)
    if not messages:
        return {"system": "", "user": ""}
    return {
        "system": _first_message_content(messages, "system"),
        "user": _first_message_content(messages, "user"),
    }


def _first_message_content(messages: list[dict[str, Any]], role: str) -> str:
    for message in messages:
        if message.get("role") == role:
            return str(message.get("content", ""))
    return ""


class _RecordingLlmSynthesizer:
    def __init__(self) -> None:
        settings = get_settings()
        self._llm = LlmClient(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            model=settings.deepseek_model,
        )
        self.last_messages: list[dict[str, str]] = []

    async def synthesize(
        self,
        *,
        htmls: list[str],
        fields: list[str],
        prior_failures: dict[str, list[str]],
        execution_model: str,
    ) -> OnboardingProposal | None:
        self.last_messages = _llm_messages(htmls, fields, prior_failures, execution_model)
        return await self._llm.synthesize(
            htmls=htmls,
            fields=fields,
            prior_failures=prior_failures,
            execution_model=execution_model,
        )


def _llm_messages(
    htmls: list[str],
    fields: list[str],
    prior_failures: dict[str, list[str]],
    execution_model: str,
) -> list[dict[str, str]]:
    from app.services.llm import build_synthesis_messages

    return build_synthesis_messages(
        htmls=htmls,
        fields=fields,
        prior_failures=prior_failures,
        execution_model=execution_model,
    )
