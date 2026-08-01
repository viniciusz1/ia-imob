import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CrawlAgenciesClient } from "../CrawlAgenciesClient";

const navigation = vi.hoisted(() => ({
  pathname: "/admin/crawler/agencies",
  push: vi.fn(),
  searchParams: new URLSearchParams("page=2"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => navigation.searchParams,
}));

describe("CrawlAgenciesClient", () => {
  beforeEach(() => {
    navigation.push.mockReset();
    navigation.searchParams = new URLSearchParams("page=2");
  });

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
          current_published_crawl_run_id: null,
            created_at: "2026-07-15T12:00:00Z",
            updated_at: "2026-07-15T12:00:00Z",
          },
        ]}
        initialSearch=""
        pageCount={2}
      />,
    );

    expect(screen.getByText("onboarding")).toBeInTheDocument();
    expect(screen.getByText("unknown")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /imóveis litoral/i })).toHaveAttribute(
      "href",
      "/admin/crawler/agencies/42",
    );
    expect(screen.getByText("Mostrando página 2 de 2")).toBeInTheDocument();
  });

  it("sends the search to the server and resets pagination", () => {
    render(
      <CrawlAgenciesClient initialAgencies={[]} initialSearch="" pageCount={2} />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Filtrar Crawl Agencies" }), {
      target: { value: "seculus.net" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(navigation.push).toHaveBeenCalledWith("/admin/crawler/agencies?search=seculus.net");
  });
});
