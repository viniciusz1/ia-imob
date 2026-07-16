import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CrawlAgencySchedulePanel } from "../CrawlAgencySchedulePanel";
import { ScheduleDefaultPanel } from "../ScheduleDefaultPanel";

describe("crawler schedule panels", () => {
  it("shows inherited effective settings and an open-circuit suspension reason", () => {
    render(<CrawlAgencySchedulePanel initialSchedule={{
      id: 3,
      crawl_agency_id: 42,
      inherit_default: true,
      preset: null,
      timezone: null,
      effective_preset: "daily",
      effective_timezone: "America/Sao_Paulo",
      next_run_at: "2026-07-16T06:00:00Z",
      last_enqueued_at: "2026-07-15T06:00:00Z",
      suspended: true,
      suspension_reason: "three_consecutive_production_failures",
      circuit: { state: "open", consecutive_failures: 3 },
    }} />);

    expect(screen.getByText(/herdando padrão da plataforma/i)).toBeInTheDocument();
    expect(screen.getByText(/próxima execução/i)).toHaveTextContent("16/07/2026");
    expect(screen.getByText(/suspenso após 3 falhas consecutivas/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /herdar padrão/i })).toBeChecked();
  });

  it("edits the explicit platform default", () => {
    render(<ScheduleDefaultPanel initialDefault={{
      id: 1,
      preset: "weekly",
      timezone: "America/Sao_Paulo",
      updated_by: 1,
      created_at: "2026-07-15T12:00:00Z",
      updated_at: "2026-07-15T12:00:00Z",
    }} />);

    expect(screen.getByRole("combobox", { name: /frequência padrão/i })).toHaveValue("weekly");
    expect(screen.getByRole("textbox", { name: /fuso horário padrão/i })).toHaveValue("America/Sao_Paulo");
  });
});
