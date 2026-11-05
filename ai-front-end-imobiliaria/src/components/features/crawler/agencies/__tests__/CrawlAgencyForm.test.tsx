import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("shows slug, URL and domain errors live without flagging untouched fields", async () => {
    render(<CrawlAgencyForm />);

    expect(screen.queryByText(/Use letras minúsculas/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/URL base/)).not.toHaveAttribute("aria-invalid");

    fireEvent.change(screen.getByLabelText(/Slug/), { target: { value: "Imobiliária Centro" } });
    fireEvent.change(screen.getByLabelText(/URL base/), { target: { value: "litoral" } });
    fireEvent.change(screen.getByLabelText(/Domínio raiz/), { target: { value: "https://litoral.com.br/" } });

    expect(await screen.findByText(/Use letras minúsculas, números e hífens/)).toBeInTheDocument();
    expect(screen.getByText(/começando com http:\/\/ ou https:\/\//)).toBeInTheDocument();
    expect(screen.getByText(/Informe só o domínio/)).toBeInTheDocument();
    expect(screen.getByLabelText(/URL base/)).toHaveAttribute("aria-invalid", "true");
    // The untouched name field stays neutral.
    expect(screen.getByLabelText(/Nome/)).not.toHaveAttribute("aria-invalid");

    fireEvent.change(screen.getByLabelText(/Slug/), { target: { value: "imobiliaria-centro" } });
    await waitFor(() => expect(screen.queryByText(/Use letras minúsculas/)).not.toBeInTheDocument());
  });
});
