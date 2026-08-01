import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingExecutionSummaryCard } from "../OnboardingExecutionSummaryCard";
import { onboardingExecution } from "./onboardingExecutionFixture";

describe("OnboardingExecutionSummaryCard", () => {
  it("shows only a contextual summary and routes recovery to Onboarding", () => {
    const execution = onboardingExecution({
      state: "requires_attention",
      current_step: "discovery",
      attention: {
        code: "child_operation_failed",
        category: "configuration",
        message: "A configuração de Discovery usa uma fonte sem suporte do worker.",
      },
      recovery_actions: [{
        key: "review_configuration",
        priority: "primary",
        enabled: true,
        reason: "A mesma configuração tende a repetir esta falha.",
      }],
      next_action: "review_configuration",
    });

    render(<OnboardingExecutionSummaryCard agencyId={42} execution={execution} />);

    expect(screen.getByRole("heading", { name: "Onboarding requer atenção" })).toBeInTheDocument();
    expect(screen.getByText("Etapa atual: Discovery")).toBeInTheDocument();
    expect(screen.getByText(/fonte sem suporte do worker/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revisar configuração" })).toHaveAttribute(
      "href",
      "/admin/crawler/agencies/42/onboarding",
    );
    expect(screen.getByRole("link", { name: "Abrir Onboarding" })).toHaveAttribute(
      "href",
      "/admin/crawler/agencies/42/onboarding",
    );
    expect(screen.queryByRole("list", { name: "Timeline da Execução de Onboarding" })).not.toBeInTheDocument();
  });
});
