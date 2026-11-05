"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

const items = [
  { label: "Visão geral", suffix: "" },
  { label: "Onboarding", suffix: "/onboarding" },
  { label: "Discoveries", suffix: "/discoveries" },
  { label: "Perfis de Extração", suffix: "/profiles" },
  { label: "Crawls", suffix: "/crawls" },
  { label: "Qualidade", suffix: "/quality" },
  { label: "Agendamento", suffix: "/schedule" },
  { label: "Configuração", suffix: "/settings" },
];

export function CrawlAgencyNavigation({
  agencyId,
  onNavigate,
}: {
  agencyId: number;
  onNavigate?: (href: string) => void;
}) {
  const pathname = usePathname();
  const root = `/admin/crawler/agencies/${agencyId}`;
  const [lastPathname, setLastPathname] = useState(pathname);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setPendingHref(null);
  }

  const currentPath = pendingHref ?? pathname;

  return (
    <nav
      aria-label="Navegação da Crawl Agency"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    >
      {items.map((item) => {
        const href = `${root}${item.suffix}`;
        const active = item.suffix === ""
          ? currentPath === href
          : currentPath === href || currentPath.startsWith(`${href}/`);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            href={href}
            key={href}
            onClick={() => {
              setPendingHref(href);
              onNavigate?.(href);
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
