import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProspectsClient } from "../ProspectsClient";

describe("ProspectsClient", () => {
  it("queues a city and exposes automatic evidence and human review actions", () => {
    render(<ProspectsClient initialSuggestions={[{
      id: 2,
      crawl_agency_id: 3,
      operation_id: 5,
      differences: { name: "Suggested Name" },
      state: "pending",
      created_at: "2026-07-15T12:00:00Z",
    }]} initialProspects={[{
      id: 1,
      root_domain: null,
      google_place_id: "place-1",
      name: "Sem site",
      city: "Joinville",
      state: "SC",
      base_url: null,
      phone: null,
      address: null,
      source: "google_places",
      automatic_classification: "rejected",
      automatic_reason: "no_website",
      review_state: "pending",
      reviewed_by: null,
      reviewed_at: null,
      review_reason: null,
      promoted_crawl_agency_id: null,
      latest_operation_id: 5,
      metadata: {},
      created_at: "2026-07-15T12:00:00Z",
      updated_at: "2026-07-15T12:00:00Z",
    }]} />);

    expect(screen.getByRole("heading", { name: "Prospecção" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cidade")).toBeInTheDocument();
    expect(screen.getByLabelText("UF")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prospectar cidade" })).toBeInTheDocument();
    expect(screen.getByLabelText(/cidades em lote/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reconsultar domínios conhecidos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar operação/i)).toBeInTheDocument();
    expect(screen.getByText("no_website")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejeitar" })).toBeInTheDocument();
    expect(screen.getByText("Sugestões para Crawl Agencies existentes")).toBeInTheDocument();
    expect(screen.getByText(/Suggested Name/)).toBeInTheDocument();
  });
});
