import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CrawlAgencyForm } from "../CrawlAgencyForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/services/crawlerService", () => ({
  createCrawlAgency: vi.fn(),
}));

describe("CrawlAgencyForm", () => {
  it("enables registration only after every required field is filled with a valid URL", () => {
    render(<CrawlAgencyForm />);

    const submit = screen.getByRole("button", { name: "Cadastrar Crawl Agency" });
    expect(submit).toBeDisabled();
    expect(screen.getByText("Preencha: Nome, Slug, URL base válida, Domínio raiz")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: "Imobiliária Litoral" } });
    fireEvent.change(screen.getByLabelText(/Slug/), { target: { value: "imobiliaria-litoral" } });
    fireEvent.change(screen.getByLabelText(/URL base/), { target: { value: "litoral.com.br" } });
    fireEvent.change(screen.getByLabelText(/Domínio raiz/), { target: { value: "litoral.com.br" } });

    expect(submit).toBeDisabled();
    expect(screen.getByText("Preencha: URL base válida")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/URL base/), { target: { value: "https://litoral.com.br" } });

    expect(submit).toBeEnabled();
    expect(screen.queryByText(/Preencha:/)).not.toBeInTheDocument();
  });
});
