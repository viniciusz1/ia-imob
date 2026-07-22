import type { AxiosResponse } from "axios";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";

import { LoginForm } from "../LoginForm";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  markAuthenticatedSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/services/authService", () => ({
  authService: {
    login: vi.fn(),
    getUser: vi.fn(),
  },
}));

vi.mock("@/services/authSessionCookie", () => ({
  markAuthenticatedSession: mocks.markAuthenticatedSession,
}));

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as AxiosResponse<T>["config"],
  };
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
    vi.mocked(authService.login).mockResolvedValue(axiosResponse({
      user: {
        id: 4,
        name: "Platform Admin",
        email: "platform@imobiliaria.com",
        is_platform_admin: true,
        permissions: ["crawler.view", "platform.agencies.view"],
      },
    }));
  });

  it("unwraps the user resource and sends a Crawler Operator to Crawler Operations", async () => {
    vi.mocked(authService.getUser).mockResolvedValue(axiosResponse({
      data: {
        id: 4,
        name: "Platform Admin",
        email: "platform@imobiliaria.com",
        is_platform_admin: true,
        permissions: ["crawler.view", "platform.agencies.view"],
      },
    }));

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/usuário ou e-mail/i), {
      target: { value: "platform@imobiliaria.com" },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar no sistema/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.permissions).toContain("crawler.view");
    });
    expect(useAuthStore.getState().user?.email).toBe("platform@imobiliaria.com");
    expect(mocks.push).toHaveBeenCalledWith("/admin/crawler");
  });
});
