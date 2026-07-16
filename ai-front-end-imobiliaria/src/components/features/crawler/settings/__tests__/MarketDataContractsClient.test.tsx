import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarketDataContractsClient } from "../MarketDataContractsClient";

describe("MarketDataContractsClient", () => {
  it("shows immutable active versions and incompatible impact", () => {
    render(
      <MarketDataContractsClient
        initialContracts={[
          {
            id: 2,
            version: 2,
            status: "validating",
            fields: [{ name: "city", type: "string", required: true, normalization: ["trim"] }],
            compatibility: "incompatible",
            affected_agencies: [{ id: 42, name: "Fonte Afetada", root_domain: "affected.example.com" }],
            created_by: 1,
            activated_by: null,
            activated_at: null,
            created_at: "2026-07-15T12:00:00Z",
          },
          {
            id: 1,
            version: 1,
            status: "active",
            fields: [{ name: "title", type: "string", required: true, normalization: ["trim"] }],
            compatibility: "additive_optional",
            affected_agencies: [],
            created_by: 1,
            activated_by: 1,
            activated_at: "2026-07-15T12:00:00Z",
            created_at: "2026-07-15T11:00:00Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Fonte Afetada")).toBeInTheDocument();
    expect(screen.getByText(/incompatível/i)).toBeInTheDocument();
    expect(screen.getByText(/versão ativa é imutável/i)).toBeInTheDocument();
  });

  it("provides a field editor for a new draft", () => {
    render(<MarketDataContractsClient initialContracts={[]} />);

    expect(screen.getByLabelText(/nome do campo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar campo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /criar rascunho/i })).toBeDisabled();
  });
});
