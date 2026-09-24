import { describe, expect, it } from "vitest";
import { formatValuationMoney } from "../valuationPresentation";

describe("formatValuationMoney", () => {
  it.each([
    [1000, "1.000,00"],
    [3500, "3.500,00"],
    [250000, "250.000,00"],
    [650000.5, "650.000,50"],
  ])("formats %s for sale and monthly rent without rounding to thousands", (value, expected) => {
    expect(formatValuationMoney(value, "sale").replace(/\u00a0/g, " ")).toBe(`R$ ${expected}`);
    expect(formatValuationMoney(value, "rent").replace(/\u00a0/g, " ")).toBe(`R$ ${expected}/mês`);
  });
});
