"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/usePermission";
import { transitionCrawlAgency } from "@/services/crawlerService";
import type { CrawlAgency, CrawlAgencyLifecycle } from "@/types/crawler";

import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

interface CrawlAgencyLifecycleSettingsProps {
  agency: CrawlAgency;
}

const LIFECYCLE_DETAILS: Record<
  CrawlAgencyLifecycle,
  { label: string; badgeVariant: "default" | "secondary" | "outline" | "destructive"; description: string }
> = {
  onboarding: {
    label: "Onboarding",
    badgeVariant: "outline",
    description: "Esta fonte está em fase de configuração. Seus imóveis ainda não são publicados para os usuários finais.",
  },
  active: {
    label: "Ativa",
    badgeVariant: "default",
    description: "Esta fonte está ativa. Seus imóveis são exibidos no buscador e na página inicial, e os crawls operam normalmente.",
  },
  paused: {
    label: "Pausada",
    badgeVariant: "secondary",
    description: "Esta fonte está temporariamente pausada. Coletas automáticas e atualizações de dados estão suspensas.",
  },
  archived: {
    label: "Arquivada",
    badgeVariant: "destructive",
    description: "Esta fonte está arquivada. Seus imóveis deixam de ser exibidos no buscador/página inicial e novas coletas não são executadas.",
  },
};

export function CrawlAgencyLifecycleSettings({ agency }: CrawlAgencyLifecycleSettingsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);

  const canManage = usePermission("crawler.agencies.manage");
  const canActivate = usePermission("crawler.agencies.activate");

  const currentDetails = LIFECYCLE_DETAILS[agency.lifecycle_state] ?? {
    label: agency.lifecycle_state,
    badgeVariant: "outline" as const,
    description: "Estado administrativo atual da fonte.",
  };

  async function handleTransition(targetState: CrawlAgencyLifecycle, successMessage: string) {
    setIsSubmitting(true);
    try {
      await transitionCrawlAgency(agency.id, targetState);
      toast.success(successMessage);
      setArchiveDialogOpen(false);
      setActivateDialogOpen(false);
      router.refresh();
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível alterar o estado da Crawl Agency."));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCurrentActive = agency.lifecycle_state === "active";
  const isCurrentOnboarding = agency.lifecycle_state === "onboarding";
  const isCurrentPaused = agency.lifecycle_state === "paused";
  const isCurrentArchived = agency.lifecycle_state === "archived";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Status administrativo:</span>
            <Badge variant={currentDetails.badgeVariant}>{currentDetails.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{currentDetails.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        {/* Actions when Onboarding */}
        {isCurrentOnboarding && (
          <>
            {canActivate && (
              <Button
                disabled={isSubmitting}
                onClick={() => handleTransition("active", "Crawl Agency ativada com sucesso.")}
                type="button"
              >
                {isSubmitting ? "Ativando…" : "Ativar Crawl Agency"}
              </Button>
            )}

            {canManage && (
              <AlertDialog onOpenChange={setArchiveDialogOpen} open={archiveDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button disabled={isSubmitting} type="button" variant="outline">
                    Arquivar imobiliária
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Arquivar a Crawl Agency {agency.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta fonte deixará o onboarding e será marcada como arquivada. Suas configurações serão mantidas, mas nenhum crawl será executado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isSubmitting}
                      onClick={(event) => {
                        event.preventDefault();
                        void handleTransition("archived", "Crawl Agency arquivada com sucesso.");
                      }}
                    >
                      {isSubmitting ? "Arquivando…" : "Confirmar e arquivar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}

        {/* Actions when Active */}
        {isCurrentActive && canManage && (
          <>
            <Button
              disabled={isSubmitting}
              onClick={() => handleTransition("paused", "Crawl Agency pausada.")}
              type="button"
              variant="outline"
            >
              {isSubmitting ? "Pausando…" : "Pausar coletas"}
            </Button>

            <AlertDialog onOpenChange={setArchiveDialogOpen} open={archiveDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button disabled={isSubmitting} type="button" variant="destructive">
                  Arquivar imobiliária
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Arquivar a imobiliária {agency.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ao arquivar a imobiliária, todos os seus imóveis deixarão imediatamente de ser exibidos na página inicial e no buscador do sistema, e as coletas automáticas serão suspensas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isSubmitting}
                    onClick={(event) => {
                      event.preventDefault();
                      void handleTransition("archived", "Crawl Agency arquivada e imóveis ocultados.");
                    }}
                  >
                    {isSubmitting ? "Arquivando…" : "Confirmar e arquivar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {/* Actions when Paused */}
        {isCurrentPaused && canManage && (
          <>
            <Button
              disabled={isSubmitting}
              onClick={() => handleTransition("active", "Crawl Agency reativada.")}
              type="button"
            >
              {isSubmitting ? "Reativando…" : "Reativar Crawl Agency"}
            </Button>

            <AlertDialog onOpenChange={setArchiveDialogOpen} open={archiveDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button disabled={isSubmitting} type="button" variant="destructive">
                  Arquivar imobiliária
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Arquivar a imobiliária {agency.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ao arquivar a imobiliária, seus dados de mercado não serão mais exibidos nas consultas do sistema.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isSubmitting}
                    onClick={(event) => {
                      event.preventDefault();
                      void handleTransition("archived", "Crawl Agency arquivada com sucesso.");
                    }}
                  >
                    {isSubmitting ? "Arquivando…" : "Confirmar e arquivar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {/* Actions when Archived */}
        {isCurrentArchived && (
          <>
            {canManage && (
              <AlertDialog onOpenChange={setActivateDialogOpen} open={activateDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button disabled={isSubmitting} type="button">
                    Reativar imobiliária
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reativar a imobiliária {agency.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A imobiliária voltará ao status ativo. Seus imóveis cadastrados voltarão a ser exibidos no buscador de mercado e as coletas poderão ser agendadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isSubmitting}
                      onClick={(event) => {
                        event.preventDefault();
                        void handleTransition("active", "Crawl Agency reativada com sucesso.");
                      }}
                    >
                      {isSubmitting ? "Reativando…" : "Confirmar reativação"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {canManage && (
              <Button
                disabled={isSubmitting}
                onClick={() => handleTransition("onboarding", "Crawl Agency retornou para onboarding.")}
                type="button"
                variant="outline"
              >
                {isSubmitting ? "Atualizando…" : "Retornar para Onboarding"}
              </Button>
            )}
          </>
        )}

        {!canManage && !canActivate && (
          <p className="text-sm text-muted-foreground">
            Você não possui permissão para alterar o ciclo de vida desta Crawl Agency.
          </p>
        )}
      </div>
    </div>
  );
}
