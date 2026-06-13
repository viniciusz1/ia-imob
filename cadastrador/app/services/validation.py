from __future__ import annotations

import asyncio
import json
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

from app.compat import ensure_imobscrapy_imports
from app.schemas import ValidationReport
from app.services.persistence import execution_spec

ensure_imobscrapy_imports()
from imobiliarias.config.field_catalog import BEST_EFFORT_EXTRACTOR_FIELDS, REQUIRED_ITEM_FIELDS  # noqa: E402


PASS_THRESHOLD = 0.9


@dataclass
class SubprocessResult:
    returncode: int
    stdout: str
    stderr: str
    output_text: str


def _read_output(path: str) -> str:
    try:
        return Path(path).read_text(encoding="utf-8")
    except OSError:
        return ""


def _parse_items(text: str) -> list[dict]:
    if not text.strip():
        return []
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def _valid_field(field: str, value) -> tuple[bool, str | None]:
    if value in (None, ""):
        return False, f"{field}: empty"
    text = str(value).strip()
    if field == "valor":
        numbers = re.sub(r"[^\d,.-]", "", text)
        if not re.search(r"\d", numbers) or numbers in {"0", "0,00", "0.00"}:
            return False, "valor: invalid"
    if field == "link_imovel" and not text.startswith(("http://", "https://")):
        return False, "link_imovel: invalid_url"
    return True, None


def _field_report(field: str, items: list[dict], *, optional: bool) -> dict:
    filled = 0
    issues: list[str] = []
    for item in items:
        ok, issue = _valid_field(field, item.get(field))
        if ok:
            filled += 1
        elif issue and len(issues) < 5:
            issues.append(issue)
    return {
        "filled": filled,
        "pass_rate": filled / len(items),
        "issues": issues,
        "optional": optional,
    }


def _decide(items: list[dict]) -> ValidationReport:
    if not items:
        return ValidationReport(outcome="saved_inactive", issues=["no_items_extracted"])
    fields = {
        field: _field_report(field, items, optional=False) for field in REQUIRED_ITEM_FIELDS
    }
    for field in BEST_EFFORT_EXTRACTOR_FIELDS:
        if any(item.get(field) not in (None, "") for item in items):
            fields[field] = _field_report(field, items, optional=True)
    outcome = (
        "active"
        if all(fields[field]["pass_rate"] >= PASS_THRESHOLD for field in REQUIRED_ITEM_FIELDS)
        else "saved_inactive"
    )
    return ValidationReport(outcome=outcome, sample_size=len(items), fields=fields)


class ScrapyValidator:
    def __init__(
        self,
        *,
        scrapy_cwd: str,
        scrapy_executable: str,
        enabled: bool = True,
        timeout: float = 90.0,
        sitemap_sample: int = 10,
        wsm_sample: int = 30,
    ) -> None:
        self.scrapy_cwd = scrapy_cwd
        self.scrapy_executable = scrapy_executable
        self.enabled = enabled
        self.timeout = timeout
        self.sitemap_sample = sitemap_sample
        self.wsm_sample = wsm_sample
        self._current_proc: asyncio.subprocess.Process | None = None

    def cancel(self) -> None:
        if self._current_proc is not None:
            self._current_proc.terminate()

    async def run(self, agency_id: int, agency_type: str, agency_name: str) -> ValidationReport:
        if not self.enabled:
            return ValidationReport(outcome="active", sample_size=0, fields={})

        _, _, spider_name = execution_spec(agency_type)
        sample = self.sitemap_sample if agency_type == "sitemap" else self.wsm_sample
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, prefix="cadastrador-dry-") as tmp:
            output_path = tmp.name
        try:
            cmd = [
                self.scrapy_executable,
                "crawl",
                spider_name,
                "-a",
                f"imobiliarias={agency_name}",
                "-O",
                output_path,
                "-s",
                f"CLOSESPIDER_ITEMCOUNT={sample}",
                "-s",
                "LOG_LEVEL=ERROR",
            ]
            result = await self._run_subprocess(cmd, output_path)
        finally:
            Path(output_path).unlink(missing_ok=True)

        if result.returncode == -1 and "watchdog_timeout" in result.stderr:
            report = _decide(_parse_items(result.output_text))
            report.outcome = "saved_inactive"
            report.issues.append("scrapy_crawl_timeout")
            return report
        report = _decide(_parse_items(result.output_text))
        if result.returncode not in {0, None}:
            report.issues.append(f"scrapy_exit_code_{result.returncode}")
        if report.sample_size == 0 and result.stderr.strip():
            report.issues.append(f"scrapy_stderr={result.stderr.strip()[-200:]}")
        return report

    async def _run_subprocess(self, cmd: list[str], output_path: str) -> SubprocessResult:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=self.scrapy_cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        self._current_proc = proc
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=self.timeout)
            returncode = proc.returncode or 0
        except asyncio.TimeoutError:
            proc.terminate()
            try:
                await asyncio.wait_for(proc.wait(), timeout=5)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
            return SubprocessResult(-1, "", "watchdog_timeout", _read_output(output_path))
        finally:
            self._current_proc = None
        output_text = _read_output(output_path)
        return SubprocessResult(
            returncode,
            stdout.decode("utf-8", errors="replace"),
            stderr.decode("utf-8", errors="replace"),
            output_text,
        )

