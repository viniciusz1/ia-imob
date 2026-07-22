import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QualityPoliciesClient } from "../QualityPoliciesClient";

describe("QualityPoliciesClient", () => {
  it("shows immutable active versions and a versioned draft form", () => {
    render(<QualityPoliciesClient initialPolicies={[{
      id: 1,
      version: 1,
      status: "active",
      rules: { maximum_stock_drop_ratio: 0.5, maximum_error_ratio: 0.3, maximum_rejection_ratio: 0.3 },
      created_by: null,
      activated_by: null,
      activated_at: "2026-07-15T12:00:00Z",
      created_at: "2026-07-15T11:00:00Z",
    }]} />);

    expect(screen.getByText("Política de Qualidade v1")).toBeInTheDocument();
    expect(screen.getByText("Versão ativa e imutável")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /queda máxima de estoque/i })).toHaveValue(50);
    expect(screen.getByRole("button", { name: /criar política em rascunho/i })).toBeInTheDocument();
  });
});
