import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listDiscoverySnapshotUrls } from "@/services/crawlerService";
import type { DiscoverySnapshot, PaginatedDiscoverySnapshotUrls } from "@/types/crawler";

import { DiscoverySnapshotsPanel } from "../DiscoverySnapshotsPanel";

vi.mock("@/services/crawlerService", () => ({
  listDiscoverySnapshotUrls: vi.fn(),
}));

const snapshots: DiscoverySnapshot[] = [
  { id: 10, operation_id: 20, crawl_agency_id: 7, url_count: 2, content_hash: "abc", created_at: "2026-07-22T22:59:32Z" },
  { id: 9, operation_id: 19, crawl_agency_id: 7, url_count: 1, content_hash: "def", created_at: "2026-07-22T22:55:40Z" },
];

describe("DiscoverySnapshotsPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads and displays a Snapshot URL table inside the Crawl Agency", async () => {
    vi.mocked(listDiscoverySnapshotUrls).mockResolvedValue({
      data: [
        { id: 1, url: "https://macroimoveis.com/imovel/123", created_at: "2026-07-22T22:59:30Z" },
        { id: 2, url: "https://macroimoveis.com/imovel/456", created_at: "2026-07-22T22:59:31Z" },
      ],
      meta: { current_page: 1, last_page: 2, per_page: 20, total: 22 },
    });
    render(<DiscoverySnapshotsPanel snapshots={snapshots} />);

    expect(listDiscoverySnapshotUrls).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /snapshot #10/i }));

    await waitFor(() => expect(listDiscoverySnapshotUrls).toHaveBeenCalledWith(10, 1, 20));
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /macroimoveis.com\/imovel\/123/i })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /macroimoveis.com\/imovel\/456/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /snapshot #10/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps loaded URLs cached when a Snapshot is closed and reopened", async () => {
    vi.mocked(listDiscoverySnapshotUrls).mockResolvedValue({
      data: [{ id: 1, url: "https://macroimoveis.com/imovel/123", created_at: "2026-07-22T22:59:30Z" }],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
    });
    render(<DiscoverySnapshotsPanel snapshots={snapshots} />);
    const snapshotButton = screen.getByRole("button", { name: /snapshot #10/i });

    fireEvent.click(snapshotButton);
    await screen.findByRole("table");
    fireEvent.click(snapshotButton);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(snapshotButton);

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(listDiscoverySnapshotUrls).toHaveBeenCalledTimes(1);
  });

  it("requests page and page-size changes from the backend", async () => {
    vi.mocked(listDiscoverySnapshotUrls)
      .mockResolvedValueOnce({
        data: [{ id: 1, url: "https://macroimoveis.com/imovel/1", created_at: "2026-07-22T22:59:30Z" }],
        meta: { current_page: 1, last_page: 2, per_page: 20, total: 21 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 21, url: "https://macroimoveis.com/imovel/21", created_at: "2026-07-22T22:59:31Z" }],
        meta: { current_page: 2, last_page: 2, per_page: 20, total: 21 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 1, url: "https://macroimoveis.com/imovel/1", created_at: "2026-07-22T22:59:30Z" }],
        meta: { current_page: 1, last_page: 1, per_page: 30, total: 21 },
      });
    render(<DiscoverySnapshotsPanel snapshots={snapshots} />);

    fireEvent.click(screen.getByRole("button", { name: /snapshot #10/i }));
    await screen.findByText("Página 1 de 2 · 21 URLs");
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(listDiscoverySnapshotUrls).toHaveBeenCalledWith(10, 2, 20));
    await screen.findByText("Página 2 de 2 · 21 URLs");

    fireEvent.change(screen.getByRole("combobox", { name: /itens por página do snapshot #10/i }), { target: { value: "30" } });
    await waitFor(() => expect(listDiscoverySnapshotUrls).toHaveBeenCalledWith(10, 1, 30));
    expect(await screen.findByText("Página 1 de 1 · 21 URLs")).toBeInTheDocument();
  });

  it("keeps the current table visible while another page is loading", async () => {
    let resolveNextPage: ((page: PaginatedDiscoverySnapshotUrls) => void) | undefined;
    const nextPage = new Promise<PaginatedDiscoverySnapshotUrls>((resolve) => {
      resolveNextPage = resolve;
    });
    vi.mocked(listDiscoverySnapshotUrls)
      .mockResolvedValueOnce({
        data: [{ id: 1, url: "https://macroimoveis.com/imovel/1", created_at: "2026-07-22T22:59:30Z" }],
        meta: { current_page: 1, last_page: 2, per_page: 20, total: 21 },
      })
      .mockReturnValueOnce(nextPage);
    render(<DiscoverySnapshotsPanel snapshots={snapshots} />);

    fireEvent.click(screen.getByRole("button", { name: /snapshot #10/i }));
    await screen.findByText("Página 1 de 2 · 21 URLs");
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(listDiscoverySnapshotUrls).toHaveBeenCalledWith(10, 2, 20));

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /macroimoveis.com\/imovel\/1/i })).toBeInTheDocument();

    resolveNextPage?.({
      data: [{ id: 21, url: "https://macroimoveis.com/imovel/21", created_at: "2026-07-22T22:59:31Z" }],
      meta: { current_page: 2, last_page: 2, per_page: 20, total: 21 },
    });
    expect(await screen.findByRole("link", { name: /macroimoveis.com\/imovel\/21/i })).toBeInTheDocument();
  });
});
