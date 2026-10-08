"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  activateMarketDataContract,
  createMarketDataContract,
  validateMarketDataContract,
} from "@/services/crawlerService";
import type { MarketDataContract, MarketDataField, MarketDataFieldType } from "@/types/crawler";

interface MarketDataContractsClientProps {
  initialContracts: MarketDataContract[];
}

export function MarketDataContractsClient({ initialContracts }: MarketDataContractsClientProps) {
  const [contracts, setContracts] = useState(initialContracts);
  const [pendingFields, setPendingFields] = useState<MarketDataField[]>([]);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<MarketDataFieldType>("string");
  const [required, setRequired] = useState(false);
  const [normalization, setNormalization] = useState("");

  const replaceContract = (updated: MarketDataContract) => {
    setContracts((current) => current.map((item) => {
      if (item.id === updated.id) return updated;
      if (updated.status === "active" && item.status === "active") {
        return { ...item, status: "superseded" };
      }
      return item;
    }));
  };

  const validateContract = async (id: number) => {
    replaceContract(await validateMarketDataContract(id));
    toast.success("Contrato validado.");
  };

  const activateContract = async (id: number) => {
    replaceContract(await activateMarketDataContract(id));
    toast.success("Contrato ativado.");
  };

  const addField = () => {
    const name = fieldName.trim();
    if (!name || pendingFields.some((field) => field.name === name)) return;
    setPendingFields((current) => [...current, {
      name,
      type: fieldType,
      required,
      normalization: normalization.split(",").map((rule) => rule.trim()).filter(Boolean),
    }]);
    setFieldName("");
    setNormalization("");
    setRequired(false);
  };

  const createDraft = async () => {
    const created = await createMarketDataContract(pendingFields);
    setContracts((current) => [created, ...current]);
    setPendingFields([]);
    toast.success("Rascunho criado.");
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg tracking-tight text-foreground">Contrato de Dados de Mercado</h2>
        <p className="text-sm text-muted-foreground">Versões ativas são imutáveis e permanecem consultáveis.</p>
      </div>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Novo rascunho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-4">
            <FormField htmlFor="contract-field-name" label="Nome do campo">
              <Input id="contract-field-name" onChange={(event) => setFieldName(event.target.value)} value={fieldName} />
            </FormField>
            <FormField htmlFor="contract-field-type" label="Tipo">
              <NativeSelect
                id="contract-field-type"
                onChange={(event) => setFieldType(event.target.value as MarketDataFieldType)}
                value={fieldType}
              >
                {(["string", "integer", "decimal", "boolean", "date", "url", "array"] as const).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField htmlFor="contract-normalization" label="Normalização">
              <Input
                id="contract-normalization"
                onChange={(event) => setNormalization(event.target.value)}
                placeholder="trim,currency_brl"
                value={normalization}
              />
            </FormField>
            <div className="flex h-10 items-center gap-2 self-end">
              <Checkbox checked={required} id="contract-required" onCheckedChange={(checked) => setRequired(checked === true)} />
              <Label htmlFor="contract-required">Obrigatório</Label>
            </div>
          </div>
          {pendingFields.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingFields.map((field) => (
                <Badge key={field.name} variant="outline">{field.name}</Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={addField} type="button" variant="outline">Adicionar campo</Button>
            <Button disabled={pendingFields.length === 0} onClick={createDraft} type="button">Criar rascunho</Button>
          </div>
        </CardContent>
      </Card>
      {contracts.map((contract) => (
        <Card key={contract.id}>
          <CardHeader className="border-b">
            <CardTitle>Versão {contract.version}</CardTitle>
            <CardAction>
              <Badge variant={contractStatus[contract.status].variant}>{contractStatus[contract.status].label}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground tabular-nums">{contract.fields.length} campos canônicos</p>
            {contract.compatibility === "incompatible" && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                <TriangleAlert className="size-4 shrink-0 text-destructive" />
                <div className="space-y-1">
                  <p className="text-destructive">Mudança incompatível</p>
                  <ul className="list-disc pl-5 text-foreground">
                    {contract.affected_agencies.map((agency) => <li key={agency.id}>{agency.name}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {contract.status === "active" && <p className="text-sm text-muted-foreground">Esta versão ativa é imutável.</p>}
            {contract.status === "draft" && (
              <Button onClick={() => validateContract(contract.id)}>Validar contrato</Button>
            )}
            {contract.status === "validating" && (
              <Button onClick={() => activateContract(contract.id)}>Ativar contrato</Button>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

const contractStatus: Record<MarketDataContract["status"], { label: string; variant: "muted" | "info" | "success" }> = {
  draft: { label: "Rascunho", variant: "muted" },
  validating: { label: "Em validação", variant: "info" },
  active: { label: "Ativo", variant: "success" },
  superseded: { label: "Substituído", variant: "muted" },
};
