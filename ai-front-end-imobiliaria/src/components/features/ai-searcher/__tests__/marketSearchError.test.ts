import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import {
    getMarketSearchErrorMessage,
    isMarketSearchAllowanceExceeded,
} from "../marketSearchError";

describe("getMarketSearchErrorMessage", () => {
    it("shows when the weekly allowance renews", () => {
        const error = new AxiosError(
            "Too Many Requests",
            "ERR_BAD_REQUEST",
            undefined,
            undefined,
            {
                status: 429,
                statusText: "Too Many Requests",
                headers: new AxiosHeaders(),
                config: { headers: new AxiosHeaders() },
                data: {
                    code: "market_search_allowance_exhausted",
                    message: "Limite semanal de buscas atingido.",
                    allowance: {
                        resets_at: "2026-08-17T00:00:00-03:00",
                    },
                },
            },
        );

        expect(getMarketSearchErrorMessage(error)).toContain("17/08/2026");
        expect(getMarketSearchErrorMessage(error)).toContain("semanal");
        expect(isMarketSearchAllowanceExceeded(error)).toBe(true);
    });
    it("shows when the daily allowance renews", () => {
        const error = new AxiosError("Too Many Requests", "ERR_BAD_REQUEST", undefined, undefined, {
            status: 429, statusText: "Too Many Requests", headers: new AxiosHeaders(),
            config: { headers: new AxiosHeaders() },
            data: { code: "user_market_search_daily_limit_exhausted", allowance: { resets_at: "2026-08-12T00:00:00-03:00" } },
        });
        expect(getMarketSearchErrorMessage(error)).toContain("12/08/2026");
        expect(getMarketSearchErrorMessage(error)).toContain("diário");
        expect(isMarketSearchAllowanceExceeded(error)).toBe(true);
    });
});
