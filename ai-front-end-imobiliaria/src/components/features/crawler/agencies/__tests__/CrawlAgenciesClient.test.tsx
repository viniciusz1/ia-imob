import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CrawlAgenciesClient } from "../CrawlAgenciesClient";

describe("CrawlAgenciesClient", () => {
  it("shows lifecycle and health separately and links to the stable identity", () => {
    render(
      <CrawlAgenciesClient
        initialAgencies={[
          {
            id: 42,
            name: "Imóveis Litoral",
            slug: "imoveis-litoral",
            base_url: "https://imoveislitoral.example.com",
            root_domain: "imoveislitoral.example.com",
            lifecycle_state: "onboarding",
            health_state: "unknown",
            revalidation_required: false,
            created_at: "2026-07-15T12:00:00Z",
            updated_at: "2026-07-15T12:00:00Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("onboarding")).toBeInTheDocument();
    expect(screen.getByText("unknown")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /imóveis litoral/i })).toHaveAttribute(
      "href",
      "/admin/crawler/agencies/42",
    );
  });
});
