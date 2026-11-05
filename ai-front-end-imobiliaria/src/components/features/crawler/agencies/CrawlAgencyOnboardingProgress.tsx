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
  description: string;
  href: string;
  label: string;
  state: "completed" | "current" | "pending";
}

function onboardingSteps(agency: CrawlAgency, snapshots: DiscoverySnapshot[], profiles: ExtractionProfile[]): OnboardingStep[] {
  const checks = [
    {
      completed: snapshots.length > 0,
      description: "Mapeamento das URLs e descoberta da estrutura de links do portal.",
      label: "Discovery",
      path: "discoveries",
    },
    {
      completed: profiles.length > 0,
      description: "Geração das regras e seletores para extração dos imóveis.",
      label: "Perfil candidato",
      path: "profiles",
    },
    {
      completed: profiles.some((profile) => profile.latest_validation_report !== null),
      description: "Execução de crawl em amostra para validar cobertura e consistência.",
      label: "Validação",
      path: "profiles",
    },
    {
      completed: profiles.some((profile) => ["approved", "active"].includes(profile.status)),
      description: "Revisão e homologação dos dados para autorizar a produção.",
      label: "Aprovação",
      path: "profiles",
    },
    {
      completed: agency.lifecycle_state !== "onboarding",
      description: "Fonte ativada e pronta para coletas agendadas ou manuais.",
      label: "Ativação",
      path: "",
    },
  ];
  const currentIndex = checks.findIndex((step) => !step.completed);
  const root = `/admin/crawler/agencies/${agency.id}`;

  return checks.map((step, index) => ({
    description: step.description,
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

function stepStyle(state: OnboardingStep["state"]) {
  if (state === "completed") return "border-emerald-600 bg-emerald-600 text-white";
  if (state === "current") return "border-primary bg-primary text-primary-foreground";
  return "border-border bg-background text-muted-foreground";
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
        <ol aria-label="Etapas da jornada de ativação" className="space-y-4">
          {steps.map((step, index) => (
            <li className="relative grid gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)]" key={step.label}>
              {index < steps.length - 1 && (
                <div aria-hidden="true" className="absolute bottom-[-1rem] left-[1.2rem] top-10 w-px bg-border" />
              )}
              <span className={`relative z-10 flex size-10 items-center justify-center rounded-full border-2 ${stepStyle(step.state)}`}>
                <StepIcon state={step.state} />
              </span>
              <div className="rounded-lg border bg-muted/10 p-3 transition-colors hover:bg-muted/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={step.href}
                  >
                    {index + 1}. {step.label}
                  </Link>
                  <Badge
                    variant={
                      step.state === "completed"
                        ? "default"
                        : step.state === "current"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {stateLabel(step.state)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
