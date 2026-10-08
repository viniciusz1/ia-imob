"use client";

import { ChevronDown, ChevronUp, CircleX, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  activateCrawlAgency,
  activateExtractionProfile,
  decideExtractionProfile,
  getProfileValidationReport,
} from "@/services/crawlerService";
import type {
  CrawlAgencyLifecycle,
  CrawlerOperation,
  ExtractionProfile,
  ProfileValidationReport,
} from "@/types/crawler";
import { CrawlerOperationStatus } from "../CrawlerOperationStatus";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";
import { isActiveCrawlerOperation, useCrawlerOperationPolling } from "../useCrawlerOperationPolling";
import { ProfileEvidenceInspector } from "./ProfileEvidenceInspector";

interface ProfileValidationPanelProps {
  agencyLifecycle: CrawlAgencyLifecycle;
  allowDecision?: boolean;
  initiallyExpanded?: boolean;
  initialProfile: ExtractionProfile;
  initialOperations?: CrawlerOperation[];
  onLifecycleChange?: (lifecycle: CrawlAgencyLifecycle) => void;
  onOperationChange?: (operation: CrawlerOperation) => void;
  onProfileChange?: (profile: ExtractionProfile) => void;
  pollOperations?: boolean;
}

const statusLabels: Record<ExtractionProfile["status"], string> = {
  candidate: "Candidato",
  approved: "Aprovado",
  rejected: "Rejeitado",
  active: "Ativo",
  revalidation_required: "Revalidação necessária",
};

const fieldLabels: Record<string, string> = {
  bairro: "Bairro",
  cidade: "Cidade",
  imagem: "Imagem",
  tipo_imovel: "Tipo de imóvel",
  title: "Título",
  url: "URL",
  valor: "Valor",
};

const strategyLabels: Record<string, string> = {
  css: "Seletores CSS",
  json_ld: "Dados estruturados JSON-LD",
  xpath: "Seletores XPath",
};

const statusVariants: Record<ExtractionProfile["status"], "info" | "success" | "destructive" | "warning" | "muted"> = {
  candidate: "info",
  approved: "muted",
  rejected: "destructive",
  active: "success",
  revalidation_required: "warning",
};

function profileValidationOperation(operations: CrawlerOperation[], profileId: number): CrawlerOperation | null {
  const latest = operations.find((operation) => (
    operation.type === "profile_validation"
    && operation.plan.extraction_profile_id === profileId
  ));
  return latest && (isActiveCrawlerOperation(latest) || latest.state === "failed" || latest.state === "cancelled") ? latest : null;
}

function formatDate(value: string | null): string {
  if (value === null) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function ProfileValidationPanel({
  agencyLifecycle,
  allowDecision = true,
  initiallyExpanded = false,
  initialProfile,
  initialOperations = [],
  onLifecycleChange,
  onOperationChange,
  onProfileChange,
  pollOperations = true,
}: ProfileValidationPanelProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [lifecycle, setLifecycle] = useState(agencyLifecycle);
  const [report, setReport] = useState<ProfileValidationReport | null>(initialProfile.latest_validation_report);
  const [operation, setOperation] = useState<CrawlerOperation | null>(() => profileValidationOperation(initialOperations, initialProfile.id));
  const [reason, setReason] = useState("");
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | "activate-profile" | "activate-agency" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const canDecide = profile.status === "candidate" || profile.status === "revalidation_required";
  const validRatioRecommended = report !== null && report.valid_ratio >= 0.8;
  const coverageRecommended = report !== null && Object.values(report.required_field_coverage).every((coverage) => coverage >= 0.9);
  const recommended = validRatioRecommended && coverageRecommended && (report?.blocking_failures.length ?? 0) === 0;
  const operationActive = operation !== null && isActiveCrawlerOperation(operation);

  useEffect(() => {
    setProfile(initialProfile);
    setReport(initialProfile.latest_validation_report);
  }, [initialProfile]);

  useEffect(() => {
    if (initiallyExpanded) setExpanded(true);
  }, [initiallyExpanded]);

  useEffect(() => {
    const recovered = profileValidationOperation(initialOperations, initialProfile.id);
    if (recovered) setOperation(recovered);
  }, [initialOperations, initialProfile.id]);

  useCrawlerOperationPolling({
    enabled: pollOperations,
    operations: operation ? [operation] : [],
    onError: (operationId, error) => toast.error(crawlerOperationErrorMessage(error, `Não foi possível atualizar a operação #${operationId}.`)),
    onOperation: (updated) => {
      setOperation(updated);
      onOperationChange?.(updated);
      if (updated.state === "succeeded") {
        const reportId = updated.result?.profile_validation_report_id;
        if (typeof reportId === "number") {
          void getProfileValidationReport(reportId)
            .then(setReport)
            .catch((error: unknown) => toast.error(crawlerOperationErrorMessage(error, "A validação terminou, mas não foi possível carregar o relatório.")));
        }
      }
    },
  });

  const updateProfile = (updated: ExtractionProfile) => {
    setProfile(updated);
    onProfileChange?.(updated);
  };

  const decide = async (decision: "approved" | "rejected") => {
    setPendingAction(decision === "approved" ? "approve" : "reject");
    setActionError(null);
    try {
      updateProfile(await decideExtractionProfile(profile.id, decision, reason));
      setReason("");
      toast.success(decision === "approved" ? "Perfil aprovado." : "Perfil rejeitado.");
    } catch (error) {
      const message = crawlerOperationErrorMessage(error, "Não foi possível registrar a decisão do perfil.");
      setActionError(message);
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  };

  const activateProfile = async () => {
    setPendingAction("activate-profile");
    setActionError(null);
    try {
      updateProfile(await activateExtractionProfile(profile.id));
      toast.success("Perfil de Extração ativado.");
    } catch (error) {
      const message = crawlerOperationErrorMessage(error, "Não foi possível ativar o Perfil de Extração.");
      setActionError(message);
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  };

  const activateAgency = async () => {
    setPendingAction("activate-agency");
    setActionError(null);
    try {
      const agency = await activateCrawlAgency(profile.crawl_agency_id);
      setLifecycle(agency.lifecycle_state);
      onLifecycleChange?.(agency.lifecycle_state);
      toast.success("Crawl Agency ativada.");
    } catch (error) {
      const message = crawlerOperationErrorMessage(error, "Não foi possível ativar a Crawl Agency.");
      setActionError(message);
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <article className="space-y-4 rounded-lg border p-4" id={`profile-${profile.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base text-foreground">Perfil v{profile.version}</h3>
            <Badge variant={statusVariants[profile.status]}>{statusLabels[profile.status]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Criado em {formatDate(profile.created_at)} · Discovery #{profile.discovery_snapshot_id} · Contrato #{profile.market_data_contract_version_id}
          </p>
          {report && (
            <p className="text-xs text-muted-foreground">
              Última validação em {formatDate(report.created_at)} · {Math.round(report.valid_ratio * 100)}% de registros válidos
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canDecide && !operationActive && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/crawler/agencies/${profile.crawl_agency_id}/crawls`}>Validar em Crawls</Link>
            </Button>
          )}
          {profile.status === "approved" && (
            <Button disabled={pendingAction !== null} onClick={() => void activateProfile()} size="sm" type="button">
              {pendingAction === "activate-profile" ? "Ativando Perfil…" : "Ativar Perfil de Extração"}
            </Button>
          )}
          {profile.status === "active" && lifecycle === "onboarding" && (
            <Button disabled={pendingAction !== null} onClick={() => void activateAgency()} size="sm" type="button">
              {pendingAction === "activate-agency" ? "Ativando Crawl Agency…" : "Ativar Crawl Agency"}
            </Button>
          )}
        </div>
      </header>

      {operation && <CrawlerOperationStatus agencyId={profile.crawl_agency_id} operation={operation} />}
      {actionError && <p className="text-sm text-destructive" role="alert">{actionError}</p>}

      <Button
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        size="sm"
        type="button"
        variant="ghost"
      >
        {expanded ? <ChevronUp /> : <ChevronDown />}
        {expanded ? `Ocultar detalhes do Perfil v${profile.version}` : `Ver detalhes do Perfil v${profile.version}`}
      </Button>

      {expanded && (
        <div className="space-y-5 border-t pt-4">
          <section className="space-y-4 text-sm">
            <h4 className="text-base text-foreground">Configuração versionada</h4>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="URL de amostra"><span className="break-all">{profile.sample_url}</span></DetailItem>
              <DetailItem label="Snapshot de Discovery">#{profile.discovery_snapshot_id}</DetailItem>
              <DetailItem label="Contrato de Dados de Mercado">#{profile.market_data_contract_version_id}</DetailItem>
              <DetailItem label="Estado técnico">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{profile.status}</code>
              </DetailItem>
              <DetailItem label="Estratégias">
                {profile.strategies
                  .map((strategy) => strategyLabels[strategy] ? `${strategyLabels[strategy]} (${strategy})` : strategy)
                  .join(", ") || "—"}
              </DetailItem>
            </dl>
            <div className="space-y-1">
              <h5 className="text-xs uppercase tracking-wide text-muted-foreground">Campos</h5>
              {profile.fields.length === 0 ? (
                <p className="text-muted-foreground">Nenhum campo configurado.</p>
              ) : (
                <ul className="space-y-1 text-foreground">
                  {profile.fields.map((field) => (
                    <li key={field.name}>
                      {fieldLabels[field.name] ? `${fieldLabels[field.name]} (${field.name})` : field.name} · {field.type} · {field.required ? "obrigatório" : "opcional"}
                      {field.normalization.length > 0 ? ` · ${field.normalization.join(", ")}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1">
                <h5 className="text-xs uppercase tracking-wide text-muted-foreground">Schemas</h5>
                <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
                  {JSON.stringify(profile.schemas, null, 2)}
                </pre>
              </div>
              <div className="space-y-1">
                <h5 className="text-xs uppercase tracking-wide text-muted-foreground">Parâmetros</h5>
                <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
                  {JSON.stringify(profile.parameters, null, 2)}
                </pre>
              </div>
            </div>
          </section>

          {report && (
            <section className="space-y-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-base text-foreground">Resultado da validação</h4>
                  <p className="text-xs text-muted-foreground">
                    Os limites são recomendações técnicas; a aprovação permanece uma decisão humana justificada.
                  </p>
                </div>
                <Badge variant={recommended ? "success" : "warning"}>
                  {recommended ? "Dentro da recomendação" : "Fora da recomendação"}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricTile
                  hint="Recomendado: 80% ou mais"
                  hintClassName={validRatioRecommended ? "text-success" : "text-warning"}
                  label="Registros válidos"
                  value={`${report.valid_record_count}/${report.sampled_url_count} · ${Math.round(report.valid_ratio * 100)}%`}
                />
                <MetricTile
                  hint="Recomendado: 90% por campo"
                  label="Cobertura obrigatória"
                  value={coverageRecommended ? "Atendida" : "Abaixo do recomendado"}
                />
                <MetricTile
                  hint="Exigem revisão e justificativa"
                  label="Falhas Críticas de Validação"
                  value={report.blocking_failures.length}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.required_field_coverage).map(([field, value]) => (
                  <Badge key={field} variant={value >= 0.9 ? "success" : "warning"}>
                    {fieldLabels[field] ?? field}: {Math.round(value * 100)}%
                  </Badge>
                ))}
              </div>
              {(report.blocking_failures.length > 0 || report.warnings.length > 0) && (
                <div className="space-y-2 rounded-lg border p-4">
                  <h5 className="text-sm text-foreground">Alertas e falhas</h5>
                  {report.blocking_failures.map((failure) => (
                    <p className="flex items-start gap-2 text-sm text-destructive" key={failure}>
                      <CircleX className="mt-0.5 size-4 shrink-0" />
                      Falha crítica de validação: {failure}
                    </p>
                  ))}
                  {report.warnings.map((warning) => (
                    <p className="flex items-start gap-2 text-sm text-warning" key={warning}>
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                      {warning}
                    </p>
                  ))}
                </div>
              )}
              <ProfileEvidenceInspector
                agencyId={profile.crawl_agency_id}
                profileId={profile.id}
                reportId={report.id}
                totalRecords={report.sampled_url_count}
              />
              {canDecide && allowDecision && (
                <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm text-foreground">
                    Registre a justificativa da decisão. É possível aprovar abaixo da recomendação após revisar as evidências.
                  </p>
                  <FormField htmlFor={`profile-decision-reason-${profile.id}`} label="Motivo da decisão">
                    <Input
                      id={`profile-decision-reason-${profile.id}`}
                      onChange={(event) => setReason(event.target.value)}
                      value={reason}
                    />
                  </FormField>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      data-primary-action="true"
                      disabled={reason.trim() === "" || pendingAction !== null}
                      onClick={() => void decide("approved")}
                      type="button"
                    >
                      {pendingAction === "approve" ? "Aprovando…" : "Aprovar Perfil"}
                    </Button>
                    <Button
                      disabled={reason.trim() === "" || pendingAction !== null}
                      onClick={() => void decide("rejected")}
                      type="button"
                      variant="outline"
                    >
                      {pendingAction === "reject" ? "Rejeitando…" : "Rejeitar Perfil"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {(profile.decider || profile.decided_at || profile.decision_reason) && (
            <section className="space-y-1 rounded-lg border p-4 text-sm">
              <h4 className="text-base text-foreground">Decisão registrada</h4>
              <p className="text-foreground">
                {profile.decider?.name ?? (profile.decided_by ? `Usuário #${profile.decided_by}` : "Responsável não informado")} · {formatDate(profile.decided_at)}
              </p>
              <p className="text-muted-foreground">{profile.decision_reason ?? "Sem justificativa registrada."}</p>
            </section>
          )}
          {(profile.activator || profile.activated_at) && (
            <section className="space-y-1 rounded-lg border p-4 text-sm">
              <h4 className="text-base text-foreground">Ativação registrada</h4>
              <p className="text-foreground">
                {profile.activator?.name ?? (profile.activated_by ? `Usuário #${profile.activated_by}` : "Responsável não informado")} · {formatDate(profile.activated_at)}
              </p>
            </section>
          )}
        </div>
      )}
    </article>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  hintClassName = "text-muted-foreground",
}: {
  label: string;
  value: ReactNode;
  hint: string;
  hintClassName?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg text-foreground tabular-nums">{value}</p>
      <p className={cn("text-xs", hintClassName)}>{hint}</p>
    </div>
  );
}
