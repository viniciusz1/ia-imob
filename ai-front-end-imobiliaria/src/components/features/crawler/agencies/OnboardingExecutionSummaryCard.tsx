import { CircleAlert } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingExecution, OnboardingExecutionStepKey } from "@/types/crawler";

const STEP_LABELS: Record<OnboardingExecutionStepKey, string> = {
  discovery: "Discovery",
  sample_url_confirmation: "Confirmação da URL de Amostra",
  profile_generation: "Geração do Perfil de Extração",
  profile_validation: "Crawl de Validação",
  approval: "Aprovação humana",
  first_production: "Primeira produção",
  quality_gate: "Quality Gate e publicação",
};

const STATE_TITLES: Record<OnboardingExecution["state"], string> = {
  queued: "Onboarding preparado",
  running: "Onboarding em andamento",
  awaiting_manual_step: "Onboarding aguarda comando",
  requires_attention: "Onboarding requer atenção",
  awaiting_approval: "Onboarding aguarda aprovação",
  awaiting_first_production: "Onboarding aguarda primeira produção",
  completed: "Onboarding concluído",
  cancelled: "Onboarding cancelado",
};

function primaryActionLabel(action: OnboardingExecution["next_action"]): string {
  if (action === "review_configuration") return "Revisar configuração";
  if (action === "retry_failed_operation") return "Retentar etapa";
  if (action === "retry_first_production") return "Retentar primeira produção";
  if (action === "decide_onboarding") return "Revisar e aprovar";
  if (action === "start_first_production") return "Iniciar primeira produção";
  if (action === "review_attention") return "Revisar atenção";
  if (["wait_for_coordinator", "wait_for_current_operation"].includes(action ?? "")) return "Acompanhar execução";
  if (action?.startsWith("run_") || action === "confirm_sample_url" || action === "correct_sample_url") return "Continuar etapa manual";
  return "Ver resultado";
}

interface OnboardingExecutionSummaryCardProps {
  agencyId: number;
  execution: OnboardingExecution;
}

export function OnboardingExecutionSummaryCard({
  agencyId,
  execution,
}: OnboardingExecutionSummaryCardProps) {
  const href = `/admin/crawler/agencies/${agencyId}/onboarding`;
  const needsAttention = execution.state === "requires_attention";

  return (
    <Card className={needsAttention ? "border-destructive/30" : undefined}>
      <CardHeader className="border-b">
        <CardTitle>
          <h3>{STATE_TITLES[execution.state]}</h3>
        </CardTitle>
        <CardDescription>Execução de Onboarding #{execution.id} · {execution.name}</CardDescription>
        <CardAction>
          <Badge variant={needsAttention ? "destructive" : "muted"}>
            {execution.conduction === "automated" ? "Automatizada" : "Manual"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-foreground">Etapa atual: {STEP_LABELS[execution.current_step]}</p>
        {execution.attention?.message && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-foreground">{execution.attention.message}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={href}>{primaryActionLabel(execution.next_action)}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={href}>Abrir Onboarding</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
