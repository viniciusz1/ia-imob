from __future__ import annotations

import sys
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_ROOT.parent
IMOBSCRAPY_ROOT = REPO_ROOT / "imobscrapy"


def ensure_imobscrapy_imports() -> None:
    """Expose imobscrapy's top-level packages, such as `imobiliarias`."""
    path = str(IMOBSCRAPY_ROOT)
    if path not in sys.path:
        sys.path.insert(0, path)


ensure_imobscrapy_imports()

