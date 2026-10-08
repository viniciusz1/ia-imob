"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { activateQualityPolicy, createQualityPolicy, validateQualityPolicy } from "@/services/crawlerService";
import type { QualityPolicy } from "@/types/crawler";

export function QualityPoliciesClient({ initialPolicies }: { initialPolicies: QualityPolicy[] }) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [stockDrop, setStockDrop] = useState(50);
  const [errorRatio, setErrorRatio] = useState(30);
  const [rejectionRatio, setRejectionRatio] = useState(30);

  const replace = (policy: QualityPolicy) => setPolicies((current) => current.map((item) => item.id === policy.id ? policy : item));
  const create = async () => {
    const policy = await createQualityPolicy({
      maximum_stock_drop_ratio: stockDrop / 100,
      maximum_error_ratio: errorRatio / 100,
      maximum_rejection_ratio: rejectionRatio / 100,
    });
    setPolicies((current) => [policy, ...current]);
    toast.success("Política criada em rascunho.");
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg tracking-tight text-foreground">Política de Qualidade</h2>
        <p className="text-sm text-muted-foreground">
          Limites de queda de estoque, erros e rejeições aplicados a cada snapshot. Versões ativas são imutáveis.
        </p>
      </div>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Nova versão da Política de Qualidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-3">
            <FormField htmlFor="stock-drop" label="Queda máxima de estoque (%)">
              <Input
                id="stock-drop"
                max={100}
                min={0}
                onChange={(event) => setStockDrop(event.target.valueAsNumber)}
                type="number"
                value={stockDrop}
              />
            </FormField>
            <FormField htmlFor="error-ratio" label="Erros máximos (%)">
              <Input
                id="error-ratio"
                max={100}
                min={0}
                onChange={(event) => setErrorRatio(event.target.valueAsNumber)}
                type="number"
                value={errorRatio}
              />
            </FormField>
            <FormField htmlFor="rejection-ratio" label="Rejeições máximas (%)">
              <Input
                id="rejection-ratio"
                max={100}
                min={0}
                onChange={(event) => setRejectionRatio(event.target.valueAsNumber)}
                type="number"
                value={rejectionRatio}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={() => void create()} type="button">Criar política em rascunho</Button>
          </div>
        </CardContent>
      </Card>
      {policies.map((policy) => (
        <Card key={policy.id}>
          <CardHeader className="border-b">
            <CardTitle>Política de Qualidade v{policy.version}</CardTitle>
            <CardAction>
              <Badge variant={policyStatus[policy.status].variant}>{policyStatus[policy.status].label}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-3">
              <RuleValue label="Estoque" value={policy.rules.maximum_stock_drop_ratio} />
              <RuleValue label="Erros" value={policy.rules.maximum_error_ratio} />
              <RuleValue label="Rejeições" value={policy.rules.maximum_rejection_ratio} />
            </dl>
            {policy.status === "active" && <p className="text-sm text-muted-foreground">Versão ativa e imutável</p>}
            {policy.status === "draft" && (
              <Button onClick={() => void validateQualityPolicy(policy.id).then(replace)}>Validar política</Button>
            )}
            {policy.status === "validating" && (
              <Button onClick={() => void activateQualityPolicy(policy.id).then(replace)}>Ativar política</Button>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

const policyStatus: Record<QualityPolicy["status"], { label: string; variant: "muted" | "info" | "success" }> = {
  draft: { label: "Rascunho", variant: "muted" },
  validating: { label: "Em validação", variant: "info" },
  active: { label: "Ativa", variant: "success" },
};

function RuleValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg text-foreground tabular-nums">{(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</dd>
    </div>
  );
}
