import { describe, expect, it } from "vitest";
import { formatAreaInput, formatCurrencyInput, toDigits } from "../numberInput";

describe("numeric filter inputs", () => {
  it("drops every character that is not a digit", () => {
    expect(toDigits("abc")).toBe("");
    expect(toDigits("R$ 350.000")).toBe("350000");
    expect(toDigits("120m2")).toBe("1202");
    expect(toDigits("-45,9")).toBe("459");
  });

  it("drops leading zeros", () => {
    expect(toDigits("000350")).toBe("350");
    expect(toDigits("0")).toBe("0");
  });

  it("formats the price as brazilian currency", () => {
    expect(formatCurrencyInput("350000")).toBe("R$ 350.000");
    expect(formatCurrencyInput("R$ 1.250.000")).toBe("R$ 1.250.000");
    expect(formatCurrencyInput("abc")).toBe("");
    expect(formatCurrencyInput("")).toBe("");
  });

  it("formats the area in square metres", () => {
    expect(formatAreaInput("120")).toBe("120 m²");
    expect(formatAreaInput("1200")).toBe("1.200 m²");
    expect(formatAreaInput("m²")).toBe("");
  });
});
