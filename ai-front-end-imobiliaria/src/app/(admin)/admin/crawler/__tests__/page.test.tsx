import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CrawlerOverviewPage from "../page";

describe("CrawlerOverviewPage", () => {
  it("presents the crawler operations entry points", () => {
    render(<CrawlerOverviewPage />);

    expect(
      screen.getByRole("heading", { name: /operações do crawler/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^crawl agencies$/i)).toBeInTheDocument();
  });
});
