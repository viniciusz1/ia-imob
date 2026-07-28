import { Check, CircleDot, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function CrawlAgencyOnboardingProgress({ agency, profiles, snapshots }: CrawlAgencyOnboardingProgressProps) {
  const steps = onboardingSteps(agency, snapshots, profiles);
  const completed = steps.filter((step) => step.state === "completed").length;

  return (
    <Card className="overflow-hidden border-primary/25">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Jornada de ativação</CardTitle>
            <CardDescription className="mt-1">Acompanhe o onboarding da fonte até ela estar pronta para produção.</CardDescription>
          </div>
          <Badge variant="secondary">{completed} de {steps.length} concluídas</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ol aria-label="Etapas da jornada de ativação" className="grid gap-3 md:grid-cols-5">
          {steps.map((step, index) => (
            <li className="relative" key={step.label}>
              {index < steps.length - 1 && <div aria-hidden="true" className="absolute left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] top-5 hidden h-px bg-border md:block" />}
              <Link className="group relative flex flex-row items-center gap-3 rounded-lg p-2 hover:bg-muted/60 md:flex-col md:text-center" href={step.href}>
                <span className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 ${step.state === "completed" ? "border-emerald-600 bg-emerald-600 text-white" : step.state === "current" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>
                  <StepIcon state={step.state} />
                </span>
                <span>
                  <span className="block text-sm font-medium">{index + 1}. {step.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{stateLabel(step.state)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
