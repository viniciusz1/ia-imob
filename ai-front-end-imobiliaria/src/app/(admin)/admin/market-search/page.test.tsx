import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./page";

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@/services/api", () => ({ default: mocks, API_PREFIX: "/api/v1" }));
vi.mock("@/hooks/usePermission", () => ({ usePermission: () => true }));

describe("administração de buscas", () => {
  beforeEach(() => {
    mocks.get.mockReset(); mocks.put.mockReset();
    mocks.get.mockImplementation((url: string) => Promise.resolve({ data: url.endsWith("/users")
      ? { data: [{ id: 1, name: "Ana", email: "ana@example.com", agency: { name: "Imobiliária" }, market_search_daily_limit: 20, used_today: 3 }], current_page: 1, last_page: 1 }
      : { data: [{ id: 1, user_name: "Ana", agency_name: "Imobiliária", mode: "ai", query: { prompt: "Casa" }, created_at: "2026-08-11T15:00:00Z" }], current_page: 1, last_page: 1 } }));
    mocks.put.mockResolvedValue({});
  });

  it("mostra buscas e permite alterar o limite de um usuário", async () => {
    render(<Page />);
    expect(await screen.findByText(/Casa/)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("20"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mocks.put).toHaveBeenCalledWith("/api/v1/admin/market-search/users/1", { limit: 30 }));
  });
});
