"use client";

import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
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
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>Decisão de qualidade</h2>
        </CardTitle>
        <CardDescription>Registre uma exceção ou publique o snapshot com justificativa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {run.quality_report.blockers.map((blocker) => (
          <div
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
            key={blocker}
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-destructive">{blocker}</p>
          </div>
        ))}
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Evidências</p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs">
            {JSON.stringify(run.quality_report.evidence, null, 2)}
          </pre>
        </div>
        <FormField htmlFor="quality-decision-reason" hint="Mínimo de 10 caracteres." label="Justificativa">
          <Textarea id="quality-decision-reason" onChange={(event) => setReason(event.target.value)} value={reason} />
        </FormField>
        <div className="flex flex-wrap justify-end gap-3">
          <Button disabled={reason.trim().length < 10} onClick={() => void registerException()} type="button" variant="outline">
            Registrar exceção
          </Button>
          {run.publication_state === "quarantined" && (
            <Button disabled={reason.trim().length < 10} onClick={() => void publish()} type="button">
              Publicar excepcionalmente
            </Button>
          )}
        </div>
        {run.exceptional_publication && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
            Publicado por #{run.exceptional_publication.published_by}: {run.exceptional_publication.reason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
