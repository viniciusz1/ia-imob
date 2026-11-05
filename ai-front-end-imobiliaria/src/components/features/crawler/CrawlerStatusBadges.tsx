import { Badge } from "@/components/ui/badge";
import type { CrawlAgencyHealth, CrawlAgencyLifecycle, CrawlerOperation } from "@/types/crawler";

type BadgeVariant = "success" | "warning" | "info" | "destructive" | "muted";

interface StatusPresentation {
  label: string;
  variant: BadgeVariant;
}

export const LIFECYCLE_STATUS: Record<CrawlAgencyLifecycle, StatusPresentation> = {
  onboarding: { label: "Em onboarding", variant: "info" },
  active: { label: "Ativa", variant: "success" },
  paused: { label: "Pausada", variant: "warning" },
  archived: { label: "Arquivada", variant: "muted" },
};

export const HEALTH_STATUS: Record<CrawlAgencyHealth, StatusPresentation> = {
  unknown: { label: "Sem diagnóstico", variant: "muted" },
  healthy: { label: "Saudável", variant: "success" },
  degraded: { label: "Degradada", variant: "warning" },
  unavailable: { label: "Indisponível", variant: "destructive" },
};

export const OPERATION_STATUS: Record<CrawlerOperation["state"], StatusPresentation> = {
  queued: { label: "Na fila", variant: "muted" },
  running: { label: "Em execução", variant: "info" },
  cancellation_requested: { label: "Cancelando", variant: "warning" },
  succeeded: { label: "Concluída", variant: "success" },
  failed: { label: "Falhou", variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "muted" },
};

function presentationFor<T extends string>(
  map: Record<T, StatusPresentation>,
  value: string,
): StatusPresentation {
  return map[value as T] ?? { label: value, variant: "muted" };
}

export function LifecycleBadge({ state }: { state: string }) {
  const { label, variant } = presentationFor(LIFECYCLE_STATUS, state);
  return <Badge variant={variant}>{label}</Badge>;
}

export function HealthBadge({ state }: { state: string }) {
  const { label, variant } = presentationFor(HEALTH_STATUS, state);
  return <Badge variant={variant}>{label}</Badge>;
}

export function OperationStateBadge({ state }: { state: string }) {
  const { label, variant } = presentationFor(OPERATION_STATUS, state);
  return <Badge variant={variant}>{label}</Badge>;
}
