"use client";

import {
  Activity,
  Building2,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

const moduleRoot = "/admin/crawler";

const navigationItems = [
  {
    label: "Visão geral",
    href: moduleRoot,
    icon: LayoutDashboard,
    isActive: (pathname: string) => pathname === moduleRoot,
  },
  {
    label: "Prospecção",
    href: `${moduleRoot}/prospects`,
    icon: Search,
    isActive: (pathname: string) => pathname.startsWith(`${moduleRoot}/prospects`),
  },
  {
    label: "Crawl Agencies",
    href: `${moduleRoot}/agencies`,
    icon: Building2,
    isActive: (pathname: string) => [
      `${moduleRoot}/agencies`,
      `${moduleRoot}/runs`,
    ].some((prefix) => pathname.startsWith(prefix)),
  },
  {
    label: "Operações",
    href: `${moduleRoot}/operations`,
    icon: Activity,
    isActive: (pathname: string) => [
      `${moduleRoot}/operations`,
      `${moduleRoot}/discoveries`,
    ].some((prefix) => pathname.startsWith(prefix)),
  },
  {
    label: "Configurações",
    href: `${moduleRoot}/settings`,
    icon: Settings,
    isActive: (pathname: string) => pathname.startsWith(`${moduleRoot}/settings`),
  },
];

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

  if (pathname === `${moduleRoot}/operations`) {
    return [{
      label: "Enfileirar discovery",
      href: `${moduleRoot}/operations#novo-discovery`,
      permission: "crawler.operations.execute",
      icon: Plus,
      variant: "default" as const,
    }];
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
    <>
      <header className="bg-background px-6 pb-5 pt-6">
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

      <nav
        aria-label="Navegação do Crawler"
        className="sticky top-0 z-20 overflow-x-auto border-b border-t bg-background/95 px-6 backdrop-blur"
      >
        <div className="flex min-w-max items-center gap-6">
          {navigationItems.map((item) => {
            const active = item.isActive(pathname);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-12 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active && "border-primary text-foreground",
                )}
                href={item.href}
                key={item.href}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
