"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function CrawlAgencyNavigation({ agencyId }: { agencyId: number }) {
  const pathname = usePathname();
  const root = `/admin/crawler/agencies/${agencyId}`;

  return (
    <nav
      aria-label="Navegação da Crawl Agency"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    >
      {items.map((item) => {
        const href = `${root}${item.suffix}`;
        const active = item.suffix === ""
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);

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
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
