import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExtractionProfileGenerator } from "../ExtractionProfileGenerator";

describe("ExtractionProfileGenerator", () => {
  it("requires explicit confirmation of the suggested or edited sample URL", () => {
    render(
      <ExtractionProfileGenerator
        agencyId={42}
        contracts={[{
          id: 1,
          version: 1,
          status: "active",
          fields: [],
          compatibility: "additive_optional",
          affected_agencies: [],
          created_by: 1,
          activated_by: 1,
          activated_at: "2026-07-15T12:00:00Z",
          created_at: "2026-07-15T12:00:00Z",
        }]}
        snapshots={[{ id: 5, crawl_agency_id: 42, operation_id: 7, url_count: 10, content_hash: "abc", created_at: "2026-07-15T12:00:00Z" }]}
        initialSampleUrl="https://agency.example.com/imovel/1"
      />,
    );

    const generate = screen.getByRole("button", { name: /gerar perfil candidato/i });
    expect(generate).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /confirmo a url/i }));
    expect(generate).toBeEnabled();
  });
});
