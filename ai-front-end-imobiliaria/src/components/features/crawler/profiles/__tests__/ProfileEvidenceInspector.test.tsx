import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProfileValidationRecords } from "@/services/crawlerService";

import { ProfileEvidenceInspector } from "../ProfileEvidenceInspector";

vi.mock("@/services/crawlerService", () => ({
  getProfileValidationRecords: vi.fn(),
}));

describe("ProfileEvidenceInspector", () => {
  beforeEach(() => {
    vi.mocked(getProfileValidationRecords).mockResolvedValue({
      data: [
        {
          id: 7,
          url: "https://agency.example.com/imovel/7",
          raw_data: { title: "Título bruto", valor: "R$ 100.000" },
          normalized_data: { title: "Título bruto", valor: 100000 },
          errors: ["bairro_missing"],
          field_presence: { title: true, bairro: false },
          is_valid: false,
        },
        {
          id: 8,
          url: "https://agency.example.com/imovel/8",
          raw_data: { title: "Outro imóvel", valor: "R$ 99,99" },
          normalized_data: { title: "Outro imóvel", valor: 99.99, _quality: { valid: true, warnings: ["valor arredondado"] } },
          errors: [],
          field_presence: { title: true, bairro: true },
          is_valid: true,
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 5, total: 2 },
    });
  });

  it("loads evidence on demand and compares one selected URL", async () => {
    render(<ProfileEvidenceInspector agencyId={42} profileId={9} reportId={4} totalRecords={20} />);

    expect(getProfileValidationRecords).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /inspecionar evidências/i }));

    expect(await screen.findAllByRole("link", { name: /imovel\/7/i })).toHaveLength(2);
    expect(screen.getAllByText("Título bruto", { selector: "dd" })).toHaveLength(2);
    expect(screen.getByText("100000")).toBeInTheDocument();
    expect(screen.getByText("bairro_missing")).toBeInTheDocument();
    expect(screen.getByText(/falha crítica · 1 erro/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima url/i }));
    expect(screen.getByRole("article", { name: /imovel\/8/i })).toBeInTheDocument();
    expect(screen.getAllByText("valor arredondado").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText(/ver payload técnico integral/i));
    expect(screen.getByText(/"_quality"/i)).toBeInTheDocument();
  });

  it("filters URLs with problems through the public API", async () => {
    render(<ProfileEvidenceInspector agencyId={42} profileId={9} reportId={4} totalRecords={20} />);

    fireEvent.click(screen.getByRole("button", { name: /inspecionar evidências/i }));
    await screen.findAllByRole("link", { name: /imovel\/7/i });
    fireEvent.click(screen.getByRole("checkbox", { name: /somente urls com problemas/i }));

    await waitFor(() => {
      expect(getProfileValidationRecords).toHaveBeenLastCalledWith(42, 9, 4, {
        filter: "issues",
        page: 1,
        per_page: 5,
        search: "",
      });
    });
  });

  it("shows explicit empty and loading failure states", async () => {
    vi.mocked(getProfileValidationRecords).mockResolvedValueOnce({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 5, total: 0 },
    });
    const { unmount } = render(<ProfileEvidenceInspector agencyId={42} profileId={9} reportId={4} totalRecords={0} />);
    fireEvent.click(screen.getByRole("button", { name: /inspecionar evidências/i }));
    expect(await screen.findByText(/nenhuma evidência corresponde/i)).toBeInTheDocument();

    unmount();
    vi.mocked(getProfileValidationRecords).mockRejectedValueOnce(new Error("network"));
    render(<ProfileEvidenceInspector agencyId={42} profileId={9} reportId={5} totalRecords={2} />);
    fireEvent.click(screen.getByRole("button", { name: /inspecionar evidências/i }));
    expect(await screen.findByText(/não foi possível carregar as evidências/i)).toBeInTheDocument();
  });
});
