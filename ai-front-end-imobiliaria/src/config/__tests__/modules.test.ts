import { describe, expect, it } from "vitest";

import { dashboardModules, sidebarModules, workspaceModules } from "../modules";

describe("workspaceModules", () => {
  it("contains a module for every sidebar entry", () => {
    const sidebarIds = sidebarModules.map((item) => item.id);
    expect(sidebarIds).toContain("dashboard");
    expect(sidebarIds).toContain("properties");
    expect(sidebarIds).toContain("users");
    expect(sidebarIds).toContain("roles");
    expect(sidebarIds).toContain("ai-searcher");
    expect(sidebarIds).toContain("valuations");
    expect(sidebarIds).toContain("agency-configs");
    expect(sidebarIds).toContain("billing");
    expect(sidebarIds).toContain("site-settings");
    expect(sidebarIds).toContain("administration");
  });

  it("maps modules to the agreed permission gates", () => {
    const properties = workspaceModules.find((item) => item.id === "properties");
    const users = workspaceModules.find((item) => item.id === "users");
    const agencyConfigs = workspaceModules.find((item) => item.id === "agency-configs");
    const siteSettings = workspaceModules.find((item) => item.id === "site-settings");

    expect(properties?.permissions).toEqual(["properties.view"]);
    expect(users?.permissions).toEqual(["users.view"]);
    expect(agencyConfigs?.permissions).toEqual(["agency_configs.view"]);
    expect(siteSettings?.permissions).toEqual(["site_settings.view"]);
  });

  it("exposes every sidebar module as a dashboard card except dashboard itself", () => {
    const sidebarIds = new Set(sidebarModules.map((item) => item.id));
    const dashboardIds = new Set(dashboardModules.map((item) => item.id));

    for (const item of sidebarModules) {
      if (item.id === "dashboard") {
        expect(dashboardIds.has(item.id)).toBe(false);
      } else {
        expect(dashboardIds.has(item.id)).toBe(true);
      }
    }

    expect(dashboardIds.isSubsetOf(sidebarIds)).toBe(true);
  });
});
