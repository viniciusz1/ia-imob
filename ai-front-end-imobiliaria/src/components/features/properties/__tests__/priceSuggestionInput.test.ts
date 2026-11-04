import { describe, expect, it } from "vitest";
import { priceSuggestionInput } from "../priceSuggestionInput";

const fields = {
  property_type: "casa", purpose: "venda", city: " Cidade Teste ", neighborhood: " Centro ",
  usable_area: 100, bedrooms: 0, bathrooms: 0, garage_spaces: 0,
};

describe("price suggestion input", () => {
  it.each([["casa", "house"], ["apartamento", "apartment"], ["sobrado", "townhouse"]])(
    "maps %s to the supported valuation type", (propertyType, expected) => {
      const result = priceSuggestionInput({ ...fields, property_type: propertyType }, false);
      expect(result.issues).toEqual([]);
      expect(result.inputs[0]).toMatchObject({ residential_type: expected, city: ["Cidade Teste"], neighborhood: ["Centro"], bedrooms: 0 });
    },
  );
  it.each(["terreno", "geminado", "sala-comercial", ""])('does not estimate unsupported type "%s"', (propertyType) => {
    expect(priceSuggestionInput({ ...fields, property_type: propertyType }, false).inputs).toEqual([]);
  });
  it.each([0, 19, 2001, NaN, Infinity, null])("rejects unusable area %s", (area) => {
    expect(priceSuggestionInput({ ...fields, usable_area: area }, false).inputs).toEqual([]);
  });
  it("does not convert missing room counts into zero", () => {
    expect(priceSuggestionInput({ ...fields, bedrooms: undefined }, false).inputs).toEqual([]);
  });
  it("requires an explicit supported purpose", () => {
    expect(priceSuggestionInput({ ...fields, purpose: "temporada" }, false).inputs).toEqual([]);
  });
  it("separates sale and rental purposes", () => {
    expect(priceSuggestionInput({ ...fields, purpose: "venda_locacao" }, true).inputs.map((input) => input.purpose)).toEqual(["sale", "rent"]);
    expect(priceSuggestionInput({ ...fields, purpose: "locacao" }, true).inputs[0]).toMatchObject({ purpose: "rent", flood_risk: true });
  });
});
