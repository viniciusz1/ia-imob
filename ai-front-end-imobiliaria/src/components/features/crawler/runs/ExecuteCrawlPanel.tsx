"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type {
  CrawlAgency,
  CrawlerOperation,
  DiscoveryPolicyVersion,
  ExtractionProfile,
  OnboardingExecution,
} from "@/types/crawler";

import { ProductionCrawlPanel } from "./ProductionCrawlPanel";
import { ValidationCrawlPanel } from "./ValidationCrawlPanel";

export interface ExecuteCrawlPanelProps {
  agency: CrawlAgency;
  activeOnboarding: Pick<OnboardingExecution, "id" | "current_step" | "operations"> | null;
  discoveryPolicies: DiscoveryPolicyVersion[];
  hasActiveQualityPolicy?: boolean;
  initialOperations: CrawlerOperation[];
  pendingCandidateRunId?: number | null;
  profiles: ExtractionProfile[];
  snapshots: Array<{ id: number; url_count: number; created_at: string }>;
  defaultIsValidation?: boolean;
}

export function ExecuteCrawlPanel({
  agency,
  activeOnboarding,
  discoveryPolicies,
  hasActiveQualityPolicy = true,
  initialOperations,
  pendingCandidateRunId = null,
  profiles,
  snapshots,
  defaultIsValidation,
}: ExecuteCrawlPanelProps) {
  const [profileList, setProfileList] = useState(profiles);
  const [currentAgency, setCurrentAgency] = useState(agency);

  useEffect(() => {
    setProfileList(profiles);
  }, [profiles]);

  useEffect(() => {
    setCurrentAgency(agency);
  }, [agency]);

  const hasUsableProductionProfiles = profileList.some((profile) => ["active", "approved"].includes(profile.status));
  const hasEligibleValidationProfiles = profileList.some(
    (profile) => profile.status === "candidate" || profile.status === "revalidation_required",
  );

  const initialIsValidation = defaultIsValidation ?? (
    activeOnboarding !== null
      ? hasEligibleValidationProfiles
      : (!hasUsableProductionProfiles && hasEligibleValidationProfiles)
  );

  const [isValidation, setIsValidation] = useState(initialIsValidation);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            aria-label="Crawl de validação"
            checked={isValidation}
            id="crawl-validation-mode"
            onCheckedChange={(checked) => setIsValidation(checked === true)}
          />
          <div className="space-y-1">
            <Label
              className="cursor-pointer text-sm font-medium"
              htmlFor="crawl-validation-mode"
            >
              Crawl de validação
            </Label>
            <p className="text-xs text-muted-foreground">
              {isValidation
                ? "Modo de validação ativado. O crawl testará o perfil candidato selecionado sem publicar em produção."
                : "Crawl normal de produção ativado. Marque para executar um crawl de validação em perfil candidato."}
            </p>
          </div>
        </div>
        <Badge variant={isValidation ? "secondary" : "outline"}>
          {isValidation ? "Crawl de Validação" : "Crawl de Produção"}
        </Badge>
      </div>

      {isValidation ? (
        <ValidationCrawlPanel
          activeOnboarding={activeOnboarding}
          agencyId={agency.id}
          initialOperations={initialOperations}
          onProfileChange={(updated) => {
            setProfileList((current) => current.map((p) => p.id === updated.id ? updated : (p.status === "active" ? { ...p, status: "approved" as const } : p)));
            if (["active", "approved"].includes(updated.status)) {
              setCurrentAgency((prev) => prev.lifecycle_state === "onboarding" ? { ...prev, lifecycle_state: "active" } : prev);
            }
          }}
          profiles={profileList}
        />
      ) : (
        <ProductionCrawlPanel
          agency={currentAgency}
          discoveryPolicies={discoveryPolicies}
          hasActiveQualityPolicy={hasActiveQualityPolicy}
          pendingCandidateRunId={pendingCandidateRunId}
          profiles={profileList}
          snapshots={snapshots}
        />
      )}
    </div>
  );
}
