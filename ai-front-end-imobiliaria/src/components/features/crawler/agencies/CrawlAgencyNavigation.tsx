"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { label: "Visão geral", suffix: "" },
  { label: "Discoveries", suffix: "/discoveries" },
  { label: "Perfis de Extração", suffix: "/profiles" },
  { label: "Crawls e qualidade", suffix: "/crawls" },
  { label: "Agendamento", suffix: "/schedule" },
  { label: "Configuração", suffix: "/settings" },
];

export function CrawlAgencyNavigation({ agencyId }: { agencyId: number }) {
  const pathname = usePathname();
  const root = `/admin/crawler/agencies/${agencyId}`;

  return (
    <nav aria-label="Navegação da Crawl Agency" className="flex overflow-x-auto border-b">
      {items.map((item) => {
        const href = `${root}${item.suffix}`;
        const active = pathname === href;

        return <Link aria-current={active ? "page" : undefined} className={cn("shrink-0 cursor-pointer border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active && "border-primary text-foreground")} href={href} key={href}>{item.label}</Link>;
      })}
    </nav>
  );
}
