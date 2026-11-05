import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, readFilters, writeFilters } from "../useMarketAnalyticsFilters";

describe("market analytics filter state", () => {
  it("reads an empty query string as no filters", () => {
    expect(readFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });

  it("reads every filter from the query string", () => {
    const params = new URLSearchParams(
      "cidade=Jaragu%C3%A1+do+Sul&bairro[]=Centro&bairro[]=Amizade&tipo[]=Casa&quartos[]=3&quartos[]=5&min=200000",
    );

    const filters = readFilters(params);

    expect(filters.cidade).toBe("Jaraguá do Sul");
    expect(filters.bairro).toEqual(["Centro", "Amizade"]);
    expect(filters.tipo).toEqual(["Casa"]);
    expect(filters.quartos).toEqual([3, 5]);
    expect(filters.min).toBe("200000");
  });

  it("drops non numeric values from numeric filters", () => {
    expect(readFilters(new URLSearchParams("quartos[]=abc&quartos[]=2")).quartos).toEqual([2]);
  });

  it("round trips through the query string", () => {
    const filters = {
      ...EMPTY_FILTERS,
      cidade: "Guaramirim",
      bairro: ["Centro"],
      tipo: ["Apartamento", "Casa"],
      vagas: [0, 3],
      max: "750000",
    };

    expect(readFilters(writeFilters(filters))).toEqual(filters);
  });

  it("omits empty filters from the query string", () => {
    expect(writeFilters(EMPTY_FILTERS).toString()).toBe("");
  });
});
