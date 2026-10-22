"use client";

import {
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/useAuthStore";

const moduleRoot = "/admin/crawler";

const newProspectingAction = {
  label: "Nova prospecção",
  href: `${moduleRoot}/prospects#nova-prospeccao`,
  permission: "crawler.prospects.manage",
  icon: Search,
  variant: "default" as const,
};

const registerAgencyAction = {
  label: "Cadastrar agência",
  href: `${moduleRoot}/agencies/new`,
  permission: "crawler.agencies.manage",
  icon: Plus,
  variant: "outline" as const,
};

const overviewActions = [newProspectingAction, registerAgencyAction];

function actionsForPath(pathname: string) {
  if (pathname === moduleRoot) return overviewActions;

  if (pathname === `${moduleRoot}/prospects`) {
    return [newProspectingAction];
  }

  if (pathname === `${moduleRoot}/agencies`) {
    return [registerAgencyAction];
  }

  return [];
}

export function CrawlerModuleNavigation() {
  const pathname = usePathname();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const actions = actionsForPath(pathname).filter((action) => (
    hasPermission(permissions, action.permission)
  ));

  return (
    <header className="border-b bg-background px-6 pb-5 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Crawler</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Operação e qualidade das fontes de dados imobiliários.
          </p>
        </div>

        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => (
              <Button asChild key={action.label} variant={action.variant}>
                <Link href={action.href}>
                  <action.icon />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
