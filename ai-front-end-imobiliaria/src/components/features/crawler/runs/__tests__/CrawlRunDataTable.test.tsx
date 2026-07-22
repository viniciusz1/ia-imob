import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CrawlRunDataTable } from "../CrawlRunDataTable";

describe("CrawlRunDataTable", () => {
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
          meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
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
  });
});
