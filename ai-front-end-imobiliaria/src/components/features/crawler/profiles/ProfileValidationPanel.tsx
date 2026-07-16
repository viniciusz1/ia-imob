"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  activateCrawlAgency,
  activateExtractionProfile,
  decideExtractionProfile,
  getCrawlerOperation,
  getProfileValidationReport,
  queueProfileValidation,
} from "@/services/crawlerService";
import type {
  CrawlAgencyLifecycle,
  ExtractionProfile,
  ProfileValidationReport,
} from "@/types/crawler";

interface ProfileValidationPanelProps {
  agencyLifecycle: CrawlAgencyLifecycle;
  initialProfile: ExtractionProfile;
}

export function ProfileValidationPanel({ agencyLifecycle, initialProfile }: ProfileValidationPanelProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [lifecycle, setLifecycle] = useState(agencyLifecycle);
  const [report, setReport] = useState<ProfileValidationReport | null>(initialProfile.latest_validation_report);
  const [operationId, setOperationId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const canDecide = profile.status === "candidate" || profile.status === "revalidation_required";

  useEffect(() => {
    if (operationId === null) return;
    const interval = window.setInterval(() => {
      void getCrawlerOperation(operationId).then(async (operation) => {
        if (operation.state === "succeeded") {
          const reportId = operation.result?.profile_validation_report_id;
          if (typeof reportId === "number") setReport(await getProfileValidationReport(reportId));
          setOperationId(null);
        } else if (["failed", "cancelled"].includes(operation.state)) {
          setOperationId(null);
        }
      });
    }, 3000);
    return () => window.clearInterval(interval);
  }, [operationId]);

  const validate = async () => {
    const operation = await queueProfileValidation(profile.id);
    setOperationId(operation.id);
  };

  const decide = async (decision: "approved" | "rejected") => {
    const updated = await decideExtractionProfile(profile.id, decision, reason);
    setProfile(updated);
    toast.success(decision === "approved" ? "Perfil aprovado." : "Perfil rejeitado.");
  };

  const activateProfile = async () => {
    setProfile(await activateExtractionProfile(profile.id));
    toast.success("Perfil de Extração ativado.");
  };

  const activateAgency = async () => {
    const agency = await activateCrawlAgency(profile.crawl_agency_id);
    setLifecycle(agency.lifecycle_state);
    toast.success("Crawl Agency ativada.");
  };

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <strong>Perfil v{profile.version}</strong>
          <Badge variant="outline">{profile.status}</Badge>
        </div>
        {canDecide && (
          <Button disabled={operationId !== null} onClick={validate} type="button" variant="outline">
            {operationId === null ? "Rodar Crawl de Validação" : "Validando…"}
          </Button>
        )}
      </div>

      {report && (
        <div className="space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <span>Válidos: {report.valid_record_count}/{report.sampled_url_count} ({Math.round(report.valid_ratio * 100)}%)</span>
            <span>Elegível: {report.eligible ? "sim" : "não"}</span>
            <span>Cobertura: {Object.entries(report.required_field_coverage).map(([field, value]) => `${field} ${Math.round(value * 100)}%`).join(", ")}</span>
          </div>
          {report.blocking_failures.map((failure) => <p className="text-sm text-destructive" key={failure}>Falha bloqueante: {failure}</p>)}
          {report.warnings.map((warning) => <p className="text-sm text-amber-700" key={warning}>{warning}</p>)}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr><th>URL</th><th>Bruto</th><th>Normalizado</th><th>Erros</th></tr></thead>
              <tbody>
                {report.records.map((record) => (
                  <tr className="border-t align-top" key={record.id}>
                    <td className="max-w-64 break-all p-2">{record.url}</td>
                    <td className="p-2"><pre className="max-w-80 whitespace-pre-wrap">{JSON.stringify(record.raw_data, null, 2)}</pre></td>
                    <td className="p-2"><pre className="max-w-80 whitespace-pre-wrap">{JSON.stringify(record.normalized_data, null, 2)}</pre></td>
                    <td className="p-2">{record.errors.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canDecide && (
            <div className="flex flex-wrap gap-2">
              <Input aria-label="Motivo da decisão" onChange={(event) => setReason(event.target.value)} placeholder="Motivo da decisão" value={reason} />
              <Button disabled={!report.eligible || reason.trim() === ""} onClick={() => void decide("approved")} type="button">Aprovar Perfil</Button>
              <Button disabled={reason.trim() === ""} onClick={() => void decide("rejected")} type="button" variant="destructive">Rejeitar Perfil</Button>
            </div>
          )}
        </div>
      )}

      {profile.status === "approved" && <Button onClick={activateProfile} type="button">Ativar Perfil</Button>}
      {profile.status === "active" && lifecycle === "onboarding" && <Button onClick={activateAgency} type="button">Ativar Crawl Agency</Button>}
    </div>
  );
}
