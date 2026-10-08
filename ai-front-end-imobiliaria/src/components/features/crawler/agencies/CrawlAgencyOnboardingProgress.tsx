import { Check, CircleDot, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CrawlAgency, DiscoverySnapshot, ExtractionProfile } from "@/types/crawler";

interface CrawlAgencyOnboardingProgressProps {
  agency: CrawlAgency;
  profiles: ExtractionProfile[];
  snapshots: DiscoverySnapshot[];
}

interface OnboardingStep {
  href: string;
  label: string;
  state: "completed" | "current" | "pending";
}

function onboardingSteps(agency: CrawlAgency, snapshots: DiscoverySnapshot[], profiles: ExtractionProfile[]): OnboardingStep[] {
  const checks = [
    { completed: snapshots.length > 0, label: "Discovery", path: "discoveries" },
    { completed: profiles.length > 0, label: "Perfil candidato", path: "profiles" },
    { completed: profiles.some((profile) => profile.latest_validation_report !== null), label: "Validação", path: "profiles" },
    { completed: profiles.some((profile) => ["approved", "active"].includes(profile.status)), label: "Aprovação", path: "profiles" },
    { completed: agency.lifecycle_state !== "onboarding", label: "Ativação", path: "" },
  ];
  const currentIndex = checks.findIndex((step) => !step.completed);
  const root = `/admin/crawler/agencies/${agency.id}`;

  return checks.map((step, index) => ({
    href: step.path ? `${root}/${step.path}` : root,
    label: step.label,
    state: step.completed ? "completed" : index === currentIndex ? "current" : "pending",
  }));
}

function StepIcon({ state }: { state: OnboardingStep["state"] }) {
  if (state === "completed") return <Check className="size-4" />;
  if (state === "current") return <CircleDot className="size-4" />;
  return <LockKeyhole className="size-4" />;
}

function stateLabel(state: OnboardingStep["state"]) {
  if (state === "completed") return "Concluída";
  if (state === "current") return "Etapa atual";
  return "Pendente";
}

const STEP_STYLES: Record<OnboardingStep["state"], { bar: string; icon: string }> = {
  completed: { bar: "bg-success", icon: "bg-success/10 text-success" },
  current: { bar: "bg-primary", icon: "bg-primary text-primary-foreground" },
  pending: { bar: "bg-muted", icon: "bg-muted text-muted-foreground" },
};

export function CrawlAgencyOnboardingProgress({ agency, profiles, snapshots }: CrawlAgencyOnboardingProgressProps) {
  const steps = onboardingSteps(agency, snapshots, profiles);
  const completed = steps.filter((step) => step.state === "completed").length;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Jornada de ativação</CardTitle>
        <CardDescription>Acompanhe o onboarding da fonte até ela estar pronta para produção.</CardDescription>
        <CardAction>
          <Badge className="tabular-nums" variant={completed === steps.length ? "success" : "muted"}>
            {completed} de {steps.length} concluídas
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ol aria-label="Etapas da jornada de ativação" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => (
            <li key={step.label}>
              <Link
                aria-current={step.state === "current" ? "step" : undefined}
                className="flex h-full flex-col gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                href={step.href}
              >
                <span aria-hidden="true" className={cn("h-1 rounded-full", STEP_STYLES[step.state].bar)} />
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      STEP_STYLES[step.state].icon,
                    )}
                  >
                    <StepIcon state={step.state} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">{index + 1}. {step.label}</span>
                    <span className="block text-xs text-muted-foreground">{stateLabel(step.state)}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
