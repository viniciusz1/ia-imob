from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import require_token
from app.schemas import RefinementPreviewRequest
from app.services.refinement import preview_refinement

router = APIRouter(prefix="/refinement", dependencies=[Depends(require_token)])


@router.post("/preview")
async def preview(payload: RefinementPreviewRequest) -> dict:
    return {"results": preview_refinement(payload)}
