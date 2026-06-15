import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AgencyConfigsClient } from "../AgencyConfigsClient";
import {
    useAgencyConfigs,
    useCreateAgencyConfig,
    useCreateAgencyExtractor,
    useDeleteAgencyConfig,
    useDeleteAgencyExtractor,
    useUpdateAgencyConfig,
    useUpdateAgencyExtractor,
} from "@/hooks/useAgencyConfigs";
import { useAuthStore } from "@/store/useAuthStore";
import type { AgencyConfigsResponse } from "@/types/agencyConfig";

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/hooks/useAgencyConfigs", () => ({
    useAgencyConfigs: vi.fn(),
    useCreateAgencyConfig: vi.fn(),
    useCreateAgencyExtractor: vi.fn(),
    useDeleteAgencyConfig: vi.fn(),
    useDeleteAgencyExtractor: vi.fn(),
    useUpdateAgencyConfig: vi.fn(),
    useUpdateAgencyExtractor: vi.fn(),
}));

const agencyConfigs: AgencyConfigsResponse = {
    sitemap_agencies: [
        {
            id: 7,
            agency_type: "sitemap",
            name: "Alpha Imóveis",
            domain: "alpha.test",
            sitemap_url: "https://alpha.test/sitemap.xml",
            allowed_url_patterns: null,
            is_active: true,
            expected_min_items: null,
            extractors: [],
        },
    ],
    wsm_agencies: [],
};

function mutationStub() {
    return {
        mutateAsync: vi.fn(),
        isPending: false,
    };
}

function mockAgencyConfigHooks() {
    vi.mocked(useAgencyConfigs).mockReturnValue({
        data: agencyConfigs,
        isLoading: false,
        error: null,
    } as ReturnType<typeof useAgencyConfigs>);
    vi.mocked(useCreateAgencyConfig).mockReturnValue(mutationStub() as unknown as ReturnType<typeof useCreateAgencyConfig>);
    vi.mocked(useCreateAgencyExtractor).mockReturnValue(mutationStub() as unknown as ReturnType<typeof useCreateAgencyExtractor>);
    vi.mocked(useDeleteAgencyConfig).mockReturnValue(mutationStub() as unknown as ReturnType<typeof useDeleteAgencyConfig>);
    vi.mocked(useDeleteAgencyExtractor).mockReturnValue(mutationStub() as unknown as ReturnType<typeof useDeleteAgencyExtractor>);
    vi.mocked(useUpdateAgencyConfig).mockReturnValue(mutationStub() as unknown as ReturnType<typeof useUpdateAgencyConfig>);
    vi.mocked(useUpdateAgencyExtractor).mockReturnValue(mutationStub() as unknown as ReturnType<typeof useUpdateAgencyExtractor>);
}

function setUserPermissions(permissions: string[]) {
    useAuthStore.getState().setUser({
        id: 1,
        name: "Admin",
        email: "admin@example.com",
        permissions,
    });
}

describe("AgencyConfigsClient", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        pushMock.mockClear();
        useAuthStore.getState().clearAuth();
        mockAgencyConfigHooks();
    });

    it("shows Verificar extratores for users with refinement permission", () => {
        setUserPermissions(["agency_configs.refine"]);

        render(<AgencyConfigsClient />);

        expect(screen.getByRole("button", { name: /Verificar extratores/i })).toBeInTheDocument();
    });

    it("hides Verificar extratores for users without refinement permission", () => {
        setUserPermissions(["agency_configs.view"]);

        render(<AgencyConfigsClient />);

        expect(screen.queryByRole("button", { name: /Verificar extratores/i })).not.toBeInTheDocument();
    });

    it("opens the dedicated refinement screen for the selected agency", () => {
        setUserPermissions(["agency_configs.refine"]);

        render(<AgencyConfigsClient />);

        fireEvent.click(screen.getByRole("button", { name: /Verificar extratores/i }));

        expect(pushMock).toHaveBeenCalledWith("/agencias-importadas/sitemap/7/verificar-extratores");
    });
});
