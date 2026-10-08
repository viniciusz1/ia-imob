import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queueBulkProductionCrawls } from "@/services/crawlerService";
import { useAuthStore } from "@/store/useAuthStore";

import { CrawlAgenciesClient } from "../CrawlAgenciesClient";

vi.mock("@/services/crawlerService", () => ({
  queueBulkProductionCrawls: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedQueueBulkProductionCrawls = vi.mocked(queueBulkProductionCrawls);

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
    mockedQueueBulkProductionCrawls.mockReset();
    useAuthStore.getState().setUser({
      id: 1,
      name: "Crawler Operator",
      email: "crawler@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view", "crawler.operations.execute"],
    });
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

  it("confirms the global action and reports queued and skipped agencies", async () => {
    mockedQueueBulkProductionCrawls.mockResolvedValue({
      summary: { active_agencies: 3, enqueued: 2, skipped: 1 },
      group: {
        id: 91,
        name: "Reexecução de crawls ativos",
        action: "bulk_production_crawl",
        member_count: 2,
        progress_percentage: 0,
        result: "in_progress",
        operations: [],
        created_at: "2026-08-30T12:00:00Z",
      },
      skipped: [{
        crawl_agency: { id: 42, name: "Imóveis Litoral" },
        code: "circuit_open",
        message: "A Crawl Agency está suspensa por circuito aberto.",
      }],
    });
    render(<CrawlAgenciesClient initialAgencies={[]} initialSearch="litoral" pageCount={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Rodar todos os crawls ativos novamente" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("independentemente da busca e da página atual");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e enfileirar" }));

    await waitFor(() => expect(mockedQueueBulkProductionCrawls).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("status")).toHaveTextContent("2 de 3 enfileirada(s); 1 ignorada(s)");
    expect(screen.getByText("Imóveis Litoral").parentElement).toHaveTextContent("circuito aberto");
    expect(screen.getByRole("link", { name: "Acompanhar grupo na fila global" })).toHaveAttribute(
      "href",
      "/admin/crawler/operations?group_id=91",
    );
  });

  it("hides the bulk action without execute permission", () => {
    useAuthStore.getState().setUser({
      id: 2,
      name: "Crawler Viewer",
      email: "viewer@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view"],
    });

    render(<CrawlAgenciesClient initialAgencies={[]} initialSearch="" pageCount={1} />);

    expect(screen.queryByRole("button", { name: "Rodar todos os crawls ativos novamente" })).not.toBeInTheDocument();
  });
});
