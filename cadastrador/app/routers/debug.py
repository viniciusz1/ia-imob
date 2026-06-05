from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_onboarding_service, require_token
from app.schemas import DebugIdentityRequest, DebugSynthesizeRequest

router = APIRouter(prefix="/debug", dependencies=[Depends(require_token)])


@router.post("/identity")
async def debug_identity(payload: DebugIdentityRequest, service=Depends(get_onboarding_service)) -> dict:
    html = await service.fetcher.fetch(payload.url)
    identity = await service.llm.resolve_identity(payload.url, html)
    return identity.model_dump()


@router.post("/synthesize")
async def debug_synthesize(payload: DebugSynthesizeRequest, service=Depends(get_onboarding_service)) -> dict:
    html = await service.fetcher.fetch(payload.url)
    fields = [payload.field] if payload.field else ["tipo", "valor", "bairro", "cidade", "link_imovel"]
    proposal = await service.llm.synthesize(
        htmls=[html],
        fields=fields,
        prior_failures={},
        execution_model=payload.strategy,
    )
    return proposal.model_dump() if proposal else {}

