"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adoptOnboardingDiscoverySnapshot } from "@/services/crawlerService";
import type { OnboardingDiscoverySnapshotCandidate, OnboardingExecution } from "@/types/crawler";

import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

interface AdoptDiscoverySnapshotButtonProps {
  candidate: OnboardingDiscoverySnapshotCandidate;
  executionId: number;
  onAdopted: (execution: OnboardingExecution) => void;
}

export function AdoptDiscoverySnapshotButton({
  candidate,
  executionId,
  onAdopted,
}: AdoptDiscoverySnapshotButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const noteId = `discovery-adoption-note-${executionId}-${candidate.id}`;

  const adopt = async () => {
    setPending(true);
    try {
      const execution = await adoptOnboardingDiscoverySnapshot(executionId, candidate.id, note);
      onAdopted(execution);
      toast.success(`Snapshot #${candidate.id} adotado. O onboarding continuará da próxima etapa.`);
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível adotar este Snapshot."));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      {candidate.adoption.reason && (
        <p className="text-sm text-destructive">{candidate.adoption.reason}</p>
      )}
      {candidate.adoption.age_warning && (
        <p className="text-sm text-amber-700 dark:text-amber-400">{candidate.adoption.age_warning}</p>
      )}
      {!confirming ? (
        <Button
          disabled={!candidate.adoption.eligible}
          onClick={() => setConfirming(true)}
          size="sm"
          type="button"
          variant="outline"
        >
          Usar Snapshot #{candidate.id}
        </Button>
      ) : (
        <div className="space-y-2 rounded-md border bg-background p-3">
          <Label htmlFor={noteId}>Nota da adoção</Label>
          <Textarea
            disabled={pending}
            id={noteId}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Opcional: registre o motivo da escolha."
            value={note}
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={() => void adopt()} size="sm" type="button">
              Confirmar adoção do Snapshot #{candidate.id}
            </Button>
            <Button disabled={pending} onClick={() => setConfirming(false)} size="sm" type="button" variant="ghost">
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
