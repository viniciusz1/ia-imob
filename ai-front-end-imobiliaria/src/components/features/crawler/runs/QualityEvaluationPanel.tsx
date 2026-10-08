"use client";

import { CircleAlert, TriangleAlert } from "lucide-react";
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        Contrato v{run.market_data_contract_version_id} · Política v{run.quality_policy_version_id}
      </p>
      {run.quality_report?.blockers.map((blocker) => (
        <div
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          key={blocker}
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-destructive">{blocker}</p>
        </div>
      ))}
      {run.quality_report?.warnings.map((warning) => (
        <div
          className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
          key={warning}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-foreground">{warning}</p>
        </div>
      ))}
      {!run.quality_report && <p className="text-sm text-muted-foreground">Aguardando avaliação do portão de qualidade.</p>}
      {canEvaluate && (
        <Button disabled={isEvaluating} onClick={() => void evaluate()} type="button">
          {isEvaluating ? "Avaliando…" : "Avaliar qualidade agora"}
        </Button>
      )}
    </div>
  );
}
