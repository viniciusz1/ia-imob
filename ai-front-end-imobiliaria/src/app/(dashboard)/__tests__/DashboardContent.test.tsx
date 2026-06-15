import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardContent } from "../DashboardContent";
import { useAuthStore } from "@/store/useAuthStore";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("DashboardContent", () => {
  it("renders cards for modules the user can access", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      permissions: ["properties.view", "users.view"],
    });

    render(<DashboardContent />);

    expect(screen.getByRole("link", { name: /imóveis/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /usuários/i })).toBeInTheDocument();
  });

  it("hides cards for modules the user cannot access", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      permissions: ["properties.view"],
    });

    render(<DashboardContent />);

    expect(screen.getByRole("link", { name: /imóveis/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /usuários/i })).not.toBeInTheDocument();
  });

  it("renders all modules when permissions are still loading", () => {
    useAuthStore.getState().clearAuth();

    render(<DashboardContent />);

    expect(screen.getByRole("link", { name: /imóveis/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /usuários/i })).toBeInTheDocument();
  });
});
