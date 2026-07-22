"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <h2 className="text-2xl font-semibold">Contrato de Dados de Mercado</h2>
        <p className="text-muted-foreground">Versões ativas são imutáveis e permanecem consultáveis.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Novo rascunho</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="contract-field-name">Nome do campo</Label>
              <Input id="contract-field-name" value={fieldName} onChange={(event) => setFieldName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-field-type">Tipo</Label>
              <select className="h-9 rounded-md border bg-transparent px-3" id="contract-field-type" value={fieldType} onChange={(event) => setFieldType(event.target.value as MarketDataFieldType)}>
                {(["string", "integer", "decimal", "boolean", "date", "url", "array"] as const).map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-normalization">Normalização</Label>
              <Input id="contract-normalization" placeholder="trim,currency_brl" value={normalization} onChange={(event) => setNormalization(event.target.value)} />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox id="contract-required" checked={required} onCheckedChange={(checked) => setRequired(checked === true)} />
              <Label htmlFor="contract-required">Obrigatório</Label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addField}>Adicionar campo</Button>
            <Button type="button" disabled={pendingFields.length === 0} onClick={createDraft}>Criar rascunho</Button>
          </div>
          {pendingFields.length > 0 && <p className="text-sm">{pendingFields.map((field) => field.name).join(", ")}</p>}
        </CardContent>
      </Card>
      {contracts.map((contract) => (
        <Card key={contract.id}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Versão {contract.version}</CardTitle>
            <Badge>{contract.status}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>{contract.fields.length} campos canônicos</p>
            {contract.compatibility === "incompatible" && (
              <div className="rounded-md border border-destructive/40 p-3">
                <p className="font-medium">Mudança incompatível</p>
                <ul className="list-disc pl-5">
                  {contract.affected_agencies.map((agency) => <li key={agency.id}>{agency.name}</li>)}
                </ul>
              </div>
            )}
            {contract.status === "active" && <p className="text-sm">Esta versão ativa é imutável.</p>}
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
