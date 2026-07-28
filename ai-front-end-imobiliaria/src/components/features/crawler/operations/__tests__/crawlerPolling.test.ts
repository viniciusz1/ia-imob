import { describe, expect, it } from "vitest";

import { crawlerPollInterval } from "../crawlerPolling";

describe("crawler polling", () => {
  it("backs off while the document is hidden", () => {
    expect(crawlerPollInterval("visible")).toBe(5_000);
    expect(crawlerPollInterval("hidden")).toBe(30_000);
  });
});
