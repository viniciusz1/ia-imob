"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createQualityException, publishCrawlRunExceptionally } from "@/services/crawlerService";
import type { CrawlRun } from "@/types/crawler";

export function ExceptionalPublicationPanel({ initialRun }: { initialRun: CrawlRun }) {
  const [run, setRun] = useState(initialRun);
  const [reason, setReason] = useState("");
  if (!run.quality_report) return null;

  const registerException = async () => {
    await createQualityException(run.quality_report!.id, reason);
    toast.success("Exceção registrada sem alterar o snapshot.");
  };
  const publish = async () => {
    setRun(await publishCrawlRunExceptionally(run.id, reason));
    toast.success("Snapshot publicado excepcionalmente.");
  };

  return (
    <div className="space-y-3 rounded-md border p-4">
      <h3 className="font-semibold">Decisão de qualidade</h3>
      {run.quality_report.blockers.map((blocker) => <p className="text-destructive" key={blocker}>{blocker}</p>)}
      <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(run.quality_report.evidence, null, 2)}</pre>
      <Label htmlFor="quality-decision-reason">Justificativa</Label>
      <Textarea id="quality-decision-reason" onChange={(event) => setReason(event.target.value)} value={reason} />
      <div className="flex gap-2">
        <Button disabled={reason.trim().length < 10} onClick={() => void registerException()} type="button" variant="outline">Registrar exceção</Button>
        {run.publication_state === "quarantined" && <Button disabled={reason.trim().length < 10} onClick={() => void publish()} type="button">Publicar excepcionalmente</Button>}
      </div>
      {run.exceptional_publication && <p>Publicado por #{run.exceptional_publication.published_by}: {run.exceptional_publication.reason}</p>}
    </div>
  );
}
