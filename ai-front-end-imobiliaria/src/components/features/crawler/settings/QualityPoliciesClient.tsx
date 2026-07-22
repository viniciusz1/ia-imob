"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <Card>
        <CardHeader><CardTitle>Nova versão da Política de Qualidade</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div><Label htmlFor="stock-drop">Queda máxima de estoque (%)</Label><Input id="stock-drop" min={0} max={100} onChange={(event) => setStockDrop(event.target.valueAsNumber)} type="number" value={stockDrop} /></div>
          <div><Label htmlFor="error-ratio">Erros máximos (%)</Label><Input id="error-ratio" min={0} max={100} onChange={(event) => setErrorRatio(event.target.valueAsNumber)} type="number" value={errorRatio} /></div>
          <div><Label htmlFor="rejection-ratio">Rejeições máximas (%)</Label><Input id="rejection-ratio" min={0} max={100} onChange={(event) => setRejectionRatio(event.target.valueAsNumber)} type="number" value={rejectionRatio} /></div>
          <Button onClick={() => void create()} type="button">Criar política em rascunho</Button>
        </CardContent>
      </Card>
      {policies.map((policy) => (
        <Card key={policy.id}>
          <CardHeader className="flex-row items-center justify-between"><CardTitle>Política de Qualidade v{policy.version}</CardTitle><Badge>{policy.status}</Badge></CardHeader>
          <CardContent className="space-y-2">
            <p>Estoque {policy.rules.maximum_stock_drop_ratio * 100}% · Erros {policy.rules.maximum_error_ratio * 100}% · Rejeições {policy.rules.maximum_rejection_ratio * 100}%</p>
            {policy.status === "active" && <p>Versão ativa e imutável</p>}
            {policy.status === "draft" && <Button onClick={() => void validateQualityPolicy(policy.id).then(replace)}>Validar política</Button>}
            {policy.status === "validating" && <Button onClick={() => void activateQualityPolicy(policy.id).then(replace)}>Ativar política</Button>}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
