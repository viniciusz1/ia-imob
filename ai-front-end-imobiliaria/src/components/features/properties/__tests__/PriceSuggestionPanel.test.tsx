import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValuesStep } from "@/components/properties/steps/ValuesStep";
import type { PropertyFormValues } from "@/schemas/propertySchema";
import { suggestMarketPrice, type PriceSuggestion } from "@/services/priceSuggestionService";
import { useAuthStore } from "@/store/useAuthStore";

vi.mock("@/services/priceSuggestionService", () => ({ suggestMarketPrice: vi.fn() }));
const suggest = vi.mocked(suggestMarketPrice);
const result: PriceSuggestion = {
  status: "calculated", purpose: "sale", range: { min: 660000, central: 720000, max: 780000 },
  flood_adjustment_percent: null, sample_summary: { used_count: 5, minimum_required: 5 },
};

function Form({ defaults = {} }: { defaults?: Partial<PropertyFormValues> }) {
  const form = useForm<PropertyFormValues>({ defaultValues: {
    property_type: "casa", purpose: "venda", city: "Cidade Teste", neighborhood: "Centro",
    usable_area: 120, bedrooms: 3, bathrooms: 2, garage_spaces: 1,
    sale_price: 111000, rent_price: 2222, ...defaults,
  } });
  return <FormProvider {...form}>
    <input aria-label="Cidade" {...form.register("city")} />
    <input aria-label="Área útil" type="number" {...form.register("usable_area", { valueAsNumber: true })} />
    <ValuesStep />
  </FormProvider>;
}

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ user: {
    id: 1, name: "Corretor", email: "test@example.com", is_platform_admin: false,
    permissions: ["valuations.create"],
  } });
  suggest.mockResolvedValue(result);
});

describe("price suggestion in property registration", () => {
  it("announces loading, prevents duplicate requests and keeps manual entry available", async () => {
    let finish: ((value: PriceSuggestion) => void) | undefined;
    suggest.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    expect(screen.getByRole("status")).toHaveTextContent("Consultando imóveis comparáveis para venda");
    const loadingButton = screen.getByRole("button", { name: "Consultando..." });
    expect(loadingButton).toBeDisabled();
    fireEvent.click(loadingButton);
    expect(suggest).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("Valor de Venda"), { target: { value: "500000" } });
    await act(async () => { finish?.(result); });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Valor de Venda")).toHaveValue(500000);
    expect(screen.getByRole("button", { name: /Aplicar valor central/ })).toBeInTheDocument();
  });

  it("handles an empty comparable sample and allows a new consultation", async () => {
    suggest.mockResolvedValueOnce({
      ...result, status: "insufficient_sample", range: null,
      sample_summary: { used_count: 0, minimum_required: 5 },
    });
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    expect(await screen.findByText(/Amostra insuficiente/)).toHaveTextContent("pelo menos 5 imóveis");
    expect(screen.queryByRole("button", { name: /Aplicar valor central/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Valor de Venda")).toHaveValue(111000);
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    expect(await screen.findByRole("button", { name: /Aplicar valor central/ })).toBeInTheDocument();
    expect(screen.queryByText(/Amostra insuficiente/)).not.toBeInTheDocument();
  });

  it("keeps a successful sale suggestion when the rental request fails", async () => {
    suggest.mockImplementation(async (input) => {
      if (input.purpose === "rent") throw new Error("Service unavailable");
      return result;
    });
    render(<Form defaults={{ purpose: "venda_locacao" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    await screen.findByRole("button", { name: "Aplicar valor central à venda" });
    fireEvent.click(screen.getByRole("button", { name: "Sugerir aluguel mensal" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tente novamente");
    fireEvent.click(screen.getByRole("button", { name: "Aplicar valor central à venda" }));
    expect(screen.getByLabelText("Valor de Venda")).toHaveValue(720000);
    expect(screen.getByLabelText("Valor de Locação")).toHaveValue(2222);
    expect(screen.queryByRole("button", { name: "Aplicar valor central ao aluguel" })).not.toBeInTheDocument();
  });

  it("only shows the feature with the existing serialized valuation permission", () => {
    useAuthStore.setState({ user: { id: 1, name: "Corretor", email: "test@example.com", is_platform_admin: false, permissions: [] } });
    render(<Form />);
    expect(screen.queryByText("Sugestão de faixa de preço")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Valor de Venda")).toBeInTheDocument();
    expect(suggest).not.toHaveBeenCalled();
  });

  it("explains missing data while keeping manual price entry available", () => {
    render(<Form defaults={{ city: "", usable_area: null }} />);
    expect(screen.getByText(/Preencha cidade e bairro/)).toBeInTheDocument();
    expect(screen.getByText(/Preencha a área útil/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sugerir preço de venda" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Valor de Venda"), { target: { value: "500000" } });
    expect(screen.getByLabelText("Valor de Venda")).toHaveValue(500000);
    expect(suggest).not.toHaveBeenCalled();
  });

  it("uses the filled characteristics and only applies the central price on explicit action", async () => {
    render(<Form />);
    expect(suggest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    const apply = await screen.findByRole("button", { name: "Aplicar valor central à venda" });
    expect(suggest).toHaveBeenCalledWith({
      purpose: "sale", city: ["Cidade Teste"], neighborhood: ["Centro"], residential_type: "house",
      area: 120, bedrooms: 3, bathrooms: 2, garage_spaces: 1, flood_risk: false,
    });
    expect(screen.getByLabelText("Valor de Venda")).toHaveValue(111000);
    fireEvent.click(apply);
    expect(screen.getByLabelText("Valor de Venda")).toHaveValue(720000);
    expect(screen.getByLabelText("Valor de Locação")).toHaveValue(2222);
  });

  it("offers independent sale and monthly-rent suggestions for both purposes", async () => {
    suggest.mockImplementation(async (input) => input.purpose === "rent"
      ? { ...result, purpose: "rent", range: { min: 2640, central: 2880, max: 3120 } }
      : result);
    render(<Form defaults={{ purpose: "venda_locacao" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Sugerir aluguel mensal" }));
    fireEvent.click(await screen.findByRole("button", { name: "Aplicar valor central ao aluguel" }));
    expect(screen.getByLabelText("Valor de Locação")).toHaveValue(2880);
    expect(screen.getByLabelText("Valor de Venda")).toHaveValue(111000);
    expect(screen.getByText(/2\.880,00\/mês/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    expect(await screen.findByRole("button", { name: "Aplicar valor central à venda" })).toBeInTheDocument();
    expect(suggest).toHaveBeenCalledTimes(2);
  });

  it("shows insufficient sample without replacing the price", async () => {
    suggest.mockResolvedValue({ ...result, status: "insufficient_sample", range: null });
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    expect(await screen.findByText(/Amostra insuficiente/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aplicar valor central/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Valor de Venda")).toHaveValue(111000);
  });

  it("allows retry after a failed request", async () => {
    suggest.mockRejectedValueOnce(new Error("offline"));
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tente novamente");
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    expect(await screen.findByRole("button", { name: /Aplicar valor central/ })).toBeInTheDocument();
  });

  it("discards a late response when the subject changes and invalidates calculated results", async () => {
    let finish: ((value: PriceSuggestion) => void) | undefined;
    suggest.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    expect(screen.getByRole("button", { name: "Consultando..." })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Cidade"), { target: { value: "Outra cidade" } });
    await act(async () => { finish?.(result); });
    expect(screen.queryByRole("button", { name: /Aplicar valor central/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    await screen.findByRole("button", { name: /Aplicar valor central/ });
    fireEvent.change(screen.getByLabelText("Área útil"), { target: { value: "150" } });
    expect(screen.queryByRole("button", { name: /Aplicar valor central/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Valor de Venda")).toHaveValue(111000);
  });

  it("includes declared flood risk and invalidates the previous suggestion", async () => {
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    await screen.findByRole("button", { name: /Aplicar valor central/ });
    fireEvent.click(screen.getByLabelText("Considerar risco de enchente nesta sugestão"));
    expect(screen.queryByRole("button", { name: /Aplicar valor central/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sugerir preço de venda" }));
    await waitFor(() => expect(suggest).toHaveBeenLastCalledWith(expect.objectContaining({ flood_risk: true })));
  });
});
