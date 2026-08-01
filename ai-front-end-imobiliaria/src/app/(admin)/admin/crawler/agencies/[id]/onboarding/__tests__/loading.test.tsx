import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CrawlAgencyOnboardingLoading from "../loading";

describe("CrawlAgencyOnboardingLoading", () => {
  it("announces the loading state", () => {
    render(<CrawlAgencyOnboardingLoading />);

    expect(screen.getByRole("status")).toHaveTextContent("Carregando Onboarding");
  });
});
