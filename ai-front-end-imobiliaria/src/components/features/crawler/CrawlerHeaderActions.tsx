"use client";

import { Plus, Search, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/useAuthStore";

interface CrawlerAction {
  label: string;
  href: string;
  permission: string;
  icon: LucideIcon;
  variant: "default" | "outline";
}

const CRAWLER_ACTIONS = {
  registerAgency: {
    label: "Cadastrar agência",
    href: "/admin/crawler/agencies/new",
    permission: "crawler.agencies.manage",
    icon: Plus,
    variant: "outline",
  },
  newProspecting: {
    label: "Nova prospecção",
    href: "/admin/crawler/prospects#nova-prospeccao",
    permission: "crawler.prospects.manage",
    icon: Search,
    variant: "default",
  },
} satisfies Record<string, CrawlerAction>;

export type CrawlerActionKey = keyof typeof CRAWLER_ACTIONS;

/** Page-header shortcuts of the Crawler module, filtered by permission. */
export function CrawlerHeaderActions({ actions }: { actions: CrawlerActionKey[] }) {
  const permissions = useAuthStore((state) => state.user?.permissions);
  const allowed = actions
    .map((key) => CRAWLER_ACTIONS[key])
    .filter((action) => hasPermission(permissions, action.permission));

  if (allowed.length === 0) return null;

  return (
    <>
      {allowed.map((action) => (
        <Button asChild key={action.label} variant={action.variant}>
          <Link href={action.href}>
            <action.icon />
            {action.label}
          </Link>
        </Button>
      ))}
    </>
  );
}
