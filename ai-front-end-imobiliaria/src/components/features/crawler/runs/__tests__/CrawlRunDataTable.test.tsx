import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CrawlRunDataTable } from "../CrawlRunDataTable";

describe("CrawlRunDataTable", () => {
  it("renders duplicate normalization warnings without unique key warning", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <CrawlRunDataTable
        initialPage={{
          data: [{
            id: 1,
            valor: 200000,
            cidade: "Joinville",
            bairro: "Centro",
            payload: { valor: 200000 },
            raw_payload: { valor: "R$ 200.000" },
            normalization_warnings: [
              "número não reconhecido: -",
              "número não reconhecido: -",
            ],
            extraction_trace: { valor: "css" },
            listing_state: "missing",
            absence_count: 1,
            listing_reason: "not_observed",
          }],
          meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
        }}
        runId={19}
      />,
    );

    const duplicateKeyCalls = errorSpy.mock.calls.filter((call) =>
      call.some((arg) => typeof arg === "string" && arg.includes("Encountered two children with the same key")),
    );

    expect(duplicateKeyCalls).toHaveLength(0);
    errorSpy.mockRestore();
  });

  it("offers normalized raw and rejected views with row evidence", () => {
    render(
      <CrawlRunDataTable
        initialPage={{
          data: [{
            id: 1,
            valor: 200000,
            cidade: "Joinville",
            bairro: "Centro",
            payload: { valor: 200000 },
            raw_payload: { valor: "R$ 200.000" },
            normalization_warnings: ["review value"],
            extraction_trace: { valor: "css" },
            listing_state: "missing",
            absence_count: 1,
            listing_reason: "not_observed",
          }],
          meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
        }}
        runId={19}
      />,
    );

    expect(screen.getByRole("button", { name: "Normalizados" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Brutos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejeitados" })).toBeInTheDocument();
    expect(screen.getByText("review value")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$ 200\.000/)).toHaveLength(2);
    expect(screen.getByText(/"valor": "css"/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Estado do anúncio" })).toBeInTheDocument();
    expect(screen.getByText("Ausente · 1 publicação(ões) ausente(s)")).toBeInTheDocument();
    expect(screen.getByText("Motivo: not_observed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /próxima/i })).toBeDisabled();
  });
});
