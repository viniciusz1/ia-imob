"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import { hasPermission } from "@/lib/permissions";
import { dashboardModules } from "@/config/modules";

export function DashboardContent() {
    const user = useAuthStore((state) => state.user);
    const userPermissions = Array.isArray(user?.permissions) ? user.permissions : null;

    const visibleModules = dashboardModules.filter((module) => {
        if (module.platformOnly && user?.is_platform_admin !== true) {
            return false;
        }

        if (module.permissions.length === 0) {
            return true;
        }

        if (userPermissions === null) return false;

        return hasPermission(userPermissions, module.permissions, "any");
    });

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleModules.map((module) => (
                <Link key={module.id} href={module.href} aria-label={module.dashboard?.title ?? module.title}>
                    <Card className="transition-colors hover:border-primary/50 hover:shadow-md">
                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <module.icon className="size-5" />
                            </div>
                            <CardTitle className="text-lg">
                                {module.dashboard?.title ?? module.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                {module.dashboard?.description}
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
