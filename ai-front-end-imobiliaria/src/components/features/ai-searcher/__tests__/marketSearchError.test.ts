import { AxiosError, AxiosHeaders } from "axios";

import {
    getMarketSearchErrorMessage,
    isMarketSearchAllowanceExceeded,
} from "../marketSearchError";

describe("getMarketSearchErrorMessage", () => {
    it("instructs the user to contact technical support for an exhausted allowance", () => {
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

        expect(getMarketSearchErrorMessage(error)).toBe(
            "Limite excedido. Entre em contato com a equipe técnica.",
        );
        expect(isMarketSearchAllowanceExceeded(error)).toBe(true);
    });
});
