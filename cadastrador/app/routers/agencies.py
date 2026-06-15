from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.dependencies import connect, get_db, get_onboarding_service, get_settings, require_token
from app.schemas import OnboardRequest, derive_domain
from app.services.persistence import (
    deactivate_agency,
    execution_spec,
    find_agency_source,
    lookup_by_domain,
)

router = APIRouter(prefix="/agencies", dependencies=[Depends(require_token)])
_semaphore = asyncio.Semaphore(get_settings().max_concurrent)


@router.post("/onboard")
async def onboard(
    payload: OnboardRequest,
    request: Request,
    service=Depends(get_onboarding_service),
) -> StreamingResponse:
    domain = derive_domain(payload.url)
    lookup_conn = connect()
    try:
        existing = lookup_by_domain(lookup_conn, domain)
    finally:
        lookup_conn.close()

    if existing and existing.is_active:
        raise HTTPException(
            status_code=409,
            detail={
                "existing_agency_id": existing.agency_id,
                "existing_agency_type": existing.agency_type,
                "name": existing.name,
                "domain": domain,
                "message": (
                    f"Agency for domain {domain!r} is already active "
                    f"(id={existing.agency_id}). Use POST /agencies/{existing.agency_id}/reonboard to refresh."
                ),
            },
        )
    if _semaphore.locked() and _semaphore._value == 0:  # type: ignore[attr-defined]
        raise HTTPException(
            status_code=503,
            detail=f"max {get_settings().max_concurrent} concurrent onboardings; retry shortly",
            headers={"Retry-After": "30"},
        )

    async def stream():
        async with _semaphore:
            conn = connect()
            try:
                async for chunk in service.stream_onboarding(url=payload.url, name=payload.name, conn=conn, request=request):
                    yield chunk
            except BaseException:
                conn.rollback()
                raise
            else:
                conn.commit()
            finally:
                conn.close()

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.post("/{agency_id}/reonboard")
async def reonboard(
    agency_id: int,
    request: Request,
    service=Depends(get_onboarding_service),
) -> StreamingResponse:
    lookup_conn = connect()
    try:
        found = find_agency_source(lookup_conn, agency_id)
        if not found:
            raise HTTPException(status_code=404, detail=f"agency {agency_id} not found")
        agency_type, _, target_url = found
        deactivate_agency(lookup_conn, agency_type, agency_id)
        lookup_conn.commit()
    finally:
        lookup_conn.close()

    async def stream():
        conn = connect()
        try:
            async for chunk in service.stream_onboarding(url=target_url, conn=conn, request=request):
                yield chunk
        except BaseException:
            conn.rollback()
            raise
        else:
            conn.commit()
        finally:
            conn.close()

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.get("/{agency_id}/attempts/latest")
async def latest_attempt(
    agency_id: int,
    agency_type: str,
    conn=Depends(get_db),
) -> dict:
    if agency_type not in {"sitemap", "wsm"}:
        raise HTTPException(status_code=400, detail="agency_type must be 'sitemap' or 'wsm'")
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT outcome, report, submitted_url, derived_domain,
                   duration_ms, llm_rounds, created_at
            FROM agency_onboarding_attempts
            WHERE agency_id = %s AND agency_type = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (agency_id, agency_type),
        )
        row = cur.fetchone()
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"no attempts found for {agency_type} agency {agency_id}",
        )
    return {
        "outcome": row[0],
        "report": row[1],
        "submitted_url": row[2],
        "derived_domain": row[3],
        "duration_ms": row[4],
        "llm_rounds": row[5],
        "created_at": row[6].isoformat() if row[6] else None,
    }

