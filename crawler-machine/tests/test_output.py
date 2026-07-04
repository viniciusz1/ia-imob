from pathlib import Path

from crawler_machine.output import OutputPath


def test_output_path_creates_directories(tmp_path: Path):
    output = OutputPath(base_dir=tmp_path, domain="example.com", timestamp="20260702_120000")

    assert output.root.exists()
    assert output.root == tmp_path / "example-com" / "20260702_120000"


def test_output_path_provides_artifact_paths(tmp_path: Path):
    output = OutputPath(base_dir=tmp_path, domain="example.com", timestamp="20260702_120000")

    assert output.discovered == output.root / "discovered.json"
    assert output.schema == output.root / "schema.json"
    assert output.raw == output.root / "raw.json"
    assert output.normalized == output.root / "normalized.json"
    assert output.errors == output.root / "errors.json"
