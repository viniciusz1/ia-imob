/**
 * Cadastrador API client.
 *
 * The cadastrador is a FastAPI server (default http://localhost:8000)
 * that exposes SSE streaming endpoints for onboarding and plain JSON
 * endpoints for debug/history.
 *
 * In development, set NEXT_PUBLIC_CADASTRADOR_URL in .env.local so
 * the browser talks directly to the Python server.  The Next.js proxy
 * (/cadastrador/*) may buffer SSE streams, so direct access is
 * preferred when CORS is acceptable (localhost dev).
 *
 * In production, deploy the cadastrador behind a reverse proxy that
 * supports streaming (nginx with `proxy_buffering off`), or set
 * NEXT_PUBLIC_CADASTRADOR_URL to its public address.
 */

import type {
    ExtractorRefinementPreview,
    ExtractorRefinementPreviewRequest,
} from "@/types/agencyRefinement";

const CADASTRADOR_URL =
    process.env.NEXT_PUBLIC_CADASTRADOR_URL ?? "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────

export type CadastradorEvent =
    | { type: "progress"; step: string; [key: string]: unknown }
    | { type: "result"; outcome: string; agency_id?: number; name?: string; domain?: string; sitemap_url?: string; llm_rounds?: number; report?: unknown }
    | { type: "error"; message?: string; reason?: string };

type SSECallback = (event: CadastradorEvent) => void;

// ── SSE parser ────────────────────────────────────────────────────────
//
// The cadastrador sends standard SSE with `event:` and `data:` lines:
//
//   event: progress
//   data: {"step":"fetching"}
//
//   event: result
//   data: {"outcome":"active","agency_id":42,...}
//
// We accumulate lines until a blank line (event boundary), then emit
// one CadastradorEvent merging the event name as `type`.

function _isBlank(line: string): boolean {
    return /^\s*$/.test(line);
}

function _parseSSEEvent(eventName: string | null, dataLines: string[]): CadastradorEvent | null {
    const raw = dataLines.join("").trim();
    if (!raw) return null;

    let payload: Record<string, unknown>;
    try {
        payload = JSON.parse(raw);
    } catch {
        return { type: "error", message: `SSE parse error: ${raw.slice(0, 120)}` };
    }

    const type = eventName || "progress";
    return { type, ...payload } as CadastradorEvent;
}

// ── Streaming fetch ───────────────────────────────────────────────────

function streamSSE(path: string, body: unknown, onEvent: SSECallback): AbortController {
    const controller = new AbortController();

    (async () => {
        try {
            const response = await fetch(`${CADASTRADOR_URL}${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            if (!response.ok) {
                const text = await response.text().catch(() => "(unreadable)");
                onEvent({ type: "error", message: `HTTP ${response.status}: ${text.slice(0, 200)}` });
                return;
            }

            const reader = response.body?.getReader();
            if (!reader) {
                onEvent({ type: "error", message: "Resposta sem corpo legível." });
                return;
            }

            const decoder = new TextDecoder();
            let buffer = "";
            let currentEventName: string | null = null;
            const dataLines: string[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                // SSE lines end with \n. Blank line = event boundary.
                let lineEnd: number;
                while ((lineEnd = buffer.indexOf("\n")) !== -1) {
                    const line = buffer.slice(0, lineEnd).replace(/\r$/, "");
                    buffer = buffer.slice(lineEnd + 1);

                    if (_isBlank(line)) {
                        // Emit accumulated event
                        const evt = _parseSSEEvent(currentEventName, dataLines);
                        if (evt) onEvent(evt);
                        currentEventName = null;
                        dataLines.length = 0;
                    } else if (line.startsWith("event: ")) {
                        currentEventName = line.slice("event: ".length).trim();
                    } else if (line.startsWith("data: ")) {
                        dataLines.push(line.slice("data: ".length));
                    }
                    // ignore other fields (id:, retry:, :) 
                }
            }

            // Emit any unflushed event at stream end
            if (dataLines.length > 0) {
                const evt = _parseSSEEvent(currentEventName, dataLines);
                if (evt) onEvent(evt);
            }
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            onEvent({ type: "error", message: err instanceof Error ? err.message : String(err) });
        }
    })();

    return controller;
}

// ── Public API ────────────────────────────────────────────────────────

type OnboardPayload = {
    url: string;
    name: string;
};

/** Start onboarding a new agency. SSE events delivered via `onEvent`. */
export function onboardAgency(payload: OnboardPayload, onEvent: SSECallback): AbortController {
    return streamSSE("/agencies/onboard", payload, onEvent);
}

/** Re-onboard an existing agency. SSE events delivered via `onEvent`. */
export function reonboardAgency(agencyId: number, onEvent: SSECallback): AbortController {
    return streamSSE(`/agencies/${agencyId}/reonboard`, {}, onEvent);
}

/** Fetch the latest onboarding attempt (JSON). */
export async function getLatestAttempt(
    agencyId: number,
    agencyType: "sitemap" | "wsm" = "sitemap",
): Promise<unknown> {
    const response = await fetch(
        `${CADASTRADOR_URL}/agencies/${agencyId}/attempts/latest?agency_type=${agencyType}`,
    );
    if (!response.ok) {
        const text = await response.text().catch(() => "(unreadable)");
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    return response.json();
}

/** Debug: LLM synthesizer. */
export async function debugSynthesize(
    url: string,
    strategy: "sitemap" | "wsm" = "sitemap",
    field?: string,
): Promise<unknown> {
    const body: Record<string, string> = { url, strategy };
    if (field) body.field = field;
    const response = await fetch(`${CADASTRADOR_URL}/debug/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "(unreadable)");
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    return response.json();
}

/** Debug: identity resolver. */
export async function debugIdentity(url: string): Promise<unknown> {
    const response = await fetch(`${CADASTRADOR_URL}/debug/identity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "(unreadable)");
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    return response.json();
}

/** Preview one field's extractor chain against persisted HTML evidence. */
export async function previewExtractorRefinement(
    payload: ExtractorRefinementPreviewRequest,
): Promise<ExtractorRefinementPreview> {
    const response = await fetch(`${CADASTRADOR_URL}/refinement/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "(unreadable)");
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    return response.json() as Promise<ExtractorRefinementPreview>;
}
