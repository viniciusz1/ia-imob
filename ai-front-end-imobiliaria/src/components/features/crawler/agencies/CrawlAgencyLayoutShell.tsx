"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import type { CrawlAgency } from "@/types/crawler";

import { CrawlAgencyContextHeader } from "./CrawlAgencyContextHeader";
import {
  CrawlAgencyLayoutContext,
  type CrawlAgencyHeaderData,
} from "./CrawlAgencyLayoutContext";

interface CrawlAgencyLayoutShellProps {
  initialAgency: CrawlAgency;
  children: React.ReactNode;
}

interface AreaInfo {
  area: string;
  description: string;
}

function defaultAreaInfo(pathname: string, agencyId: number): AreaInfo {
  const root = `/admin/crawler/agencies/${agencyId}`;
  if (pathname === root) {
    return {
      area: "Visão geral",
      description: "Estado operacional, prontidão e atividade recente desta fonte.",
    };
  }
  if (pathname === `${root}/onboarding`) {
    return {
      area: "Onboarding",
      description: "Execução atual, recuperação e histórico imutável desta Crawl Agency.",
    };
  }
  if (pathname.startsWith(`${root}/onboarding/`)) {
    return {
      area: "Onboarding",
      description: "Execução atual, recuperação e histórico imutável desta Crawl Agency.",
    };
  }
  if (pathname === `${root}/discoveries`) {
    return {
      area: "Discoveries",
      description: "Snapshots imutáveis de URLs desta Crawl Agency.",
    };
  }
  if (pathname === `${root}/profiles`) {
    return {
      area: "Perfis de Extração",
      description: "Configurações versionadas, validações e decisões humanas.",
    };
  }
  if (pathname === `${root}/crawls`) {
    return {
      area: "Crawls",
      description: "Validações de perfil, execuções de produção e resultados técnicos.",
    };
  }
  if (pathname.startsWith(`${root}/crawls/operations/`)) {
    return {
      area: "Crawls",
      description: "Validações de perfil, execuções de produção e resultados técnicos.",
    };
  }
  if (pathname === `${root}/quality`) {
    return {
      area: "Qualidade",
      description: "Portão de Qualidade, publicação, quarentena e decisões desta Crawl Agency.",
    };
  }
  if (pathname === `${root}/schedule`) {
    return {
      area: "Agendamento e segurança",
      description: "Frequência, próxima execução e circuito da fonte.",
    };
  }
  if (pathname === `${root}/settings`) {
    return {
      area: "Configuração",
      description: "Identidade e estado administrativo da fonte.",
    };
  }
  return {
    area: "Crawl Agency",
    description: "",
  };
}

export function CrawlAgencyLayoutShell({
  initialAgency,
  children,
}: CrawlAgencyLayoutShellProps) {
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const [activePath, setActivePath] = useState(pathname);
  const [overrideData, setOverrideData] = useState<CrawlAgencyHeaderData | null>(null);

  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setActivePath(pathname);
    setOverrideData(null);
  }

  const onNavigate = useCallback((href: string) => {
    setActivePath(href);
    setOverrideData(null);
  }, []);

  const setHeaderData = useCallback((data: CrawlAgencyHeaderData) => {
    setOverrideData((prev) => ({
      ...prev,
      ...data,
    }));
  }, []);

  const contextValue = useMemo(
    () => ({
      inLayout: true,
      setHeaderData,
    }),
    [setHeaderData],
  );

  const defaults = useMemo(
    () => defaultAreaInfo(activePath, initialAgency.id),
    [activePath, initialAgency.id],
  );

  const agency = overrideData?.agency ?? initialAgency;
  const area = overrideData?.area ?? defaults.area;
  const description = overrideData?.description ?? defaults.description;

  return (
    <CrawlAgencyLayoutContext.Provider value={contextValue}>
      <div className="space-y-6">
        <CrawlAgencyContextHeader
          agency={agency}
          area={area}
          description={description}
          forceRender
          onNavigate={onNavigate}
        />
        {children}
      </div>
    </CrawlAgencyLayoutContext.Provider>
  );
}
