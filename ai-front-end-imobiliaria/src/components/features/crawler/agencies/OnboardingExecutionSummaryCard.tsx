import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface OnboardingExecutionSummaryCardProps {
  agencyId: number;
  execution: OnboardingExecution;
}

export function OnboardingExecutionSummaryCard({
  agencyId,
  execution,
}: OnboardingExecutionSummaryCardProps) {
  const href = `/admin/crawler/agencies/${agencyId}/onboarding`;

  return (
    <Card className={execution.state === "requires_attention" ? "border-destructive/40" : "border-primary/30"}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle><h3>{STATE_TITLES[execution.state]}</h3></CardTitle>
            <CardDescription className="mt-1">Execução de Onboarding #{execution.id} · {execution.name}</CardDescription>
          </div>
          <Badge variant={execution.state === "requires_attention" ? "destructive" : "secondary"}>{execution.conduction === "automated" ? "Automatizada" : "Manual"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium">Etapa atual: {STEP_LABELS[execution.current_step]}</p>
          {execution.attention?.message && <p className="mt-1 text-sm text-muted-foreground">{execution.attention.message}</p>}
        </div>
        <div>
          <Button asChild><Link href={href}>Abrir Onboarding</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}
