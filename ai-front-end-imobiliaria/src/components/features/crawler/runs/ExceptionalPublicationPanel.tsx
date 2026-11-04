"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { crawlerOperationErrorMessage } from "@/components/features/crawler/crawlerOperationFeedback";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from "@/hooks/usePermission";
import {
  createQualityException,
  publishCrawlRunExceptionally,
  rejectCrawlRunQuality,
} from "@/services/crawlerService";
import type { CrawlRun } from "@/types/crawler";

export function ExceptionalPublicationPanel({ initialRun }: { initialRun: CrawlRun }) {
  const router = useRouter();
  const canManagePolicies = usePermission("crawler.policies.manage");
  const canPublishExceptionally = usePermission("crawler.snapshots.publish_exceptionally");
  const canReviewSnapshot = usePermission("crawler.snapshots.review");
  const [run, setRun] = useState(initialRun);
  const [reason, setReason] = useState("");
  const [pendingAction, setPendingAction] = useState<"exception" | "publish" | "reject" | null>(null);
  if (!run.quality_report) return null;

  const registerException = async () => {
    setPendingAction("exception");
    try {
      await createQualityException(run.quality_report!.id, reason);
      toast.success("Exceção registrada sem alterar o snapshot.");
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível registrar a exceção."));
    } finally {
      setPendingAction(null);
    }
  };

  const publish = async () => {
    setPendingAction("publish");
    try {
      setRun(await publishCrawlRunExceptionally(run.id, reason));
      setReason("");
      toast.success("Snapshot publicado excepcionalmente.");
      router.refresh();
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível publicar o snapshot excepcionalmente."));
    } finally {
      setPendingAction(null);
    }
  };

  const reject = async () => {
    setPendingAction("reject");
    try {
      setRun(await rejectCrawlRunQuality(run.id, reason));
      setReason("");
      toast.success("Publicação recusada. O snapshot permanece preservado para consulta.");
      router.refresh();
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível recusar a publicação."));
    } finally {
      setPendingAction(null);
    }
  };

  const awaitingDecision = run.publication_state === "quarantined" && run.quality_rejection === null;
  const canAct = canManagePolicies || canPublishExceptionally || canReviewSnapshot;
  const actionDisabled = reason.trim().length < 10 || pendingAction !== null;

  return (
    <div className="space-y-3 rounded-md border p-4">
      <h3 className="font-semibold">Decisão de qualidade</h3>
      {run.quality_report.blockers.map((blocker) => <p className="text-destructive" key={blocker}>{blocker}</p>)}
      <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(run.quality_report.evidence, null, 2)}</pre>
      {awaitingDecision && canAct && (
        <>
          <Label htmlFor="quality-decision-reason">Justificativa</Label>
          <Textarea disabled={pendingAction !== null} id="quality-decision-reason" onChange={(event) => setReason(event.target.value)} value={reason} />
          <div className="flex flex-wrap gap-2">
            {canManagePolicies && <Button disabled={actionDisabled} onClick={() => void registerException()} type="button" variant="outline">{pendingAction === "exception" ? "Registrando…" : "Registrar exceção"}</Button>}
            {canReviewSnapshot && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={actionDisabled} type="button" variant="destructive">Recusar publicação</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Recusar a publicação deste snapshot?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O snapshot não substituirá os dados vigentes. A decisão e a justificativa serão preservadas e um novo crawl será necessário para outra revisão.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction disabled={pendingAction !== null} onClick={() => void reject()} variant="destructive">{pendingAction === "reject" ? "Recusando…" : "Confirmar recusa"}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {canPublishExceptionally && <Button disabled={actionDisabled} onClick={() => void publish()} type="button">{pendingAction === "publish" ? "Publicando…" : "Publicar excepcionalmente"}</Button>}
          </div>
        </>
      )}
      {run.exceptional_publication && <p>Publicado por #{run.exceptional_publication.published_by}: {run.exceptional_publication.reason}</p>}
      {run.quality_rejection && <p>Publicação recusada por #{run.quality_rejection.rejected_by}: {run.quality_rejection.reason}</p>}
    </div>
  );
}
