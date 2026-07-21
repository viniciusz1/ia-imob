"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { crawlerOperationErrorMessage } from "@/components/features/crawler/crawlerOperationFeedback";
import { usePermission } from "@/hooks/usePermission";
import { evaluateCrawlRunQuality } from "@/services/crawlerService";
import type { CrawlRun } from "@/types/crawler";

export function QualityEvaluationPanel({ initialRun }: { initialRun: CrawlRun }) {
  const router = useRouter();
  const canExecuteOperations = usePermission("crawler.operations.execute");
  const [run, setRun] = useState(initialRun);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const canEvaluate = canExecuteOperations && run.publication_state === "candidate" && run.completed_at !== null && !run.quality_report;

  const evaluate = async () => {
    setIsEvaluating(true);
    try {
      const evaluatedRun = await evaluateCrawlRunQuality(run.id);
      setRun(evaluatedRun);
      toast.success(
        evaluatedRun.quality_report?.verdict === "approved"
          ? "Qualidade aprovada e snapshot publicado."
          : "Qualidade avaliada; snapshot enviado para quarentena.",
      );
      router.refresh();
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível avaliar a qualidade deste snapshot."));
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-3">
      <p>Contrato v{run.market_data_contract_version_id} · Política v{run.quality_policy_version_id}</p>
      {run.quality_report?.blockers.map((blocker) => <p className="text-destructive" key={blocker}>{blocker}</p>)}
      {run.quality_report?.warnings.map((warning) => <p className="text-amber-700" key={warning}>{warning}</p>)}
      {!run.quality_report && <p className="text-muted-foreground">Aguardando avaliação do portão de qualidade.</p>}
      {canEvaluate && (
        <Button disabled={isEvaluating} onClick={() => void evaluate()} type="button">
          {isEvaluating ? "Avaliando…" : "Avaliar qualidade agora"}
        </Button>
      )}
    </div>
  );
}
