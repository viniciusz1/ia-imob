import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NewPropertiesValidationClient } from "../NewPropertiesValidationClient";
import {
  getNewPropertyModuleInterest,
  recordNewPropertyModuleInterest,
} from "@/services/newPropertyInterestService";

vi.mock("@/services/newPropertyInterestService", () => ({
  getNewPropertyModuleInterest: vi.fn(),
  recordNewPropertyModuleInterest: vi.fn(),
}));

function renderClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NewPropertiesValidationClient />
    </QueryClientProvider>,
  );
}

describe("NewPropertiesValidationClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("explains the new listing concept and the proposed flow", async () => {
    vi.mocked(getNewPropertyModuleInterest).mockResolvedValue(null);

    renderClient();

    expect(await screen.findByRole("heading", { name: "O que é um anúncio novo?" })).toBeInTheDocument();
    expect(screen.getByText(/aparece pela primeira vez em um snapshot publicado/i)).toBeInTheDocument();
    expect(screen.getByText("Identificar")).toBeInTheDocument();
    expect(screen.getByText("Qualificar")).toBeInTheDocument();
    expect(screen.getByText(/não lista anúncios nem envia alertas/i)).toBeInTheDocument();
  });

  it("records the broker intended use", async () => {
    vi.mocked(getNewPropertyModuleInterest).mockResolvedValue(null);
    vi.mocked(recordNewPropertyModuleInterest).mockResolvedValue({
      id: 10,
      intended_uses: ["monitor_new_listings"],
      notes: "Avisar clientes rapidamente.",
      created_at: "2026-08-27T12:00:00.000Z",
      updated_at: "2026-08-27T12:00:00.000Z",
    });

    renderClient();

    fireEvent.click(await screen.findByRole("checkbox", { name: "Monitorar anúncios recém-publicados" }));
    fireEvent.change(screen.getByLabelText("O que faria essa função ser útil para você?"), {
      target: { value: "Avisar clientes rapidamente." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Quero usar este módulo" }));

    await waitFor(() => {
      expect(recordNewPropertyModuleInterest).toHaveBeenCalledWith({
        intended_uses: ["monitor_new_listings"],
        notes: "Avisar clientes rapidamente.",
      }, expect.anything());
    });
    expect(await screen.findByText(/interesse já registrado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atualizar meu interesse" })).toBeInTheDocument();
  });

  it("loads a previously recorded response into the form", async () => {
    vi.mocked(getNewPropertyModuleInterest).mockResolvedValue({
      id: 11,
      intended_uses: ["prospect_owners"],
      notes: "Priorizar captação.",
      created_at: "2026-08-27T12:00:00.000Z",
      updated_at: "2026-08-27T12:00:00.000Z",
    });

    renderClient();

    expect(await screen.findByText(/interesse já registrado/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Prospectar proprietários" })).toBeChecked();
    expect(screen.getByLabelText("O que faria essa função ser útil para você?")).toHaveValue("Priorizar captação.");
  });
});
