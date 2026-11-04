"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/usePermission";
import type { PropertyFormValues } from "@/schemas/propertySchema";
import { suggestMarketPrice, type PriceSuggestion } from "@/services/priceSuggestionService";
import type { ValuationInput } from "@/types/valuation";
import { formatValuationMoney } from "@/components/features/valuations/valuationPresentation";
import { priceSuggestionInput } from "./priceSuggestionInput";

export function PriceSuggestionPanel() {
  const canSuggest = usePermission("valuations.create");
  return canSuggest ? <PriceSuggestionFields /> : null;
}

function PriceSuggestionFields() {
  const { control } = useFormContext<PropertyFormValues>();
  const [floodRisk, setFloodRisk] = useState(false);
  const [propertyType, purpose, city, neighborhood, area, bedrooms, bathrooms, garageSpaces] = useWatch({
    control,
    name: ["property_type", "purpose", "city", "neighborhood", "usable_area", "bedrooms", "bathrooms", "garage_spaces"],
  });
  const { inputs, issues } = priceSuggestionInput({
    property_type: propertyType, purpose, city, neighborhood, usable_area: area,
    bedrooms, bathrooms, garage_spaces: garageSpaces,
  }, floodRisk);

  return (
    <section aria-labelledby="price-suggestion-title" className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div>
        <h3 id="price-suggestion-title" className="font-medium">Sugestão de faixa de preço</h3>
        <p className="text-sm text-muted-foreground">
          Consulte a faixa de mercado usando a localização, a área útil e as características preenchidas.
          O preço só será alterado se você aplicar o valor sugerido.
        </p>
      </div>
      {issues.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Checkbox id="suggestion-flood-risk" checked={floodRisk}
              onCheckedChange={(checked) => setFloodRisk(checked === true)} />
            <Label htmlFor="suggestion-flood-risk">Considerar risco de enchente nesta sugestão</Label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {inputs.map((input) => <SuggestionCard key={JSON.stringify(input)} input={input} />)}
          </div>
        </>
      )}
    </section>
  );
}

function SuggestionCard({ input }: { input: ValuationInput }) {
  const { setValue } = useFormContext<PropertyFormValues>();
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const rental = input.purpose === "rent";

  async function calculate() {
    setPending(true);
    setError(null);
    setSuggestion(null);
    setApplied(false);
    try {
      setSuggestion(await suggestMarketPrice(input));
    } catch {
      setError("Não foi possível consultar a faixa de preço. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  function applyPrice() {
    if (!suggestion?.range || pending) return;
    setValue(rental ? "rent_price" : "sale_price", suggestion.range.central, {
      shouldDirty: true, shouldValidate: true,
    });
    setApplied(true);
  }

  return (
    <div className="space-y-3 rounded-md border bg-background p-4">
      <h4 className="font-medium">{rental ? "Aluguel mensal" : "Venda"}</h4>
      <Button type="button" variant="outline" disabled={pending} onClick={calculate}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {pending ? "Consultando..." : rental ? "Sugerir aluguel mensal" : "Sugerir preço de venda"}
      </Button>
      <div aria-live="polite" className="space-y-3 text-sm">
        {pending && <p role="status">Consultando imóveis comparáveis para {rental ? "aluguel mensal" : "venda"}...</p>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {suggestion?.status === "insufficient_sample" && (
          <p className="text-muted-foreground">
            Amostra insuficiente para sugerir um preço. São necessários pelo menos{" "}
            {suggestion.sample_summary.minimum_required} imóveis comparáveis válidos nesta região.
            Você pode preencher o preço manualmente.
          </p>
        )}
        {suggestion?.status === "calculated" && suggestion.range && (
          <>
            <dl className="space-y-2">
              {(["min", "central", "max"] as const).map((key) => (
                <div key={key} className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {{ min: "Mínimo", central: "Valor central", max: "Máximo" }[key]}
                  </dt>
                  <dd className="font-medium">{formatValuationMoney(suggestion.range![key], input.purpose)}</dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground">
              Baseada em {suggestion.sample_summary.used_count} imóveis comparáveis.
              {suggestion.sample_summary.bathrooms_relaxed && " A amostra inclui imóveis com até um banheiro a mais ou a menos."}
              {suggestion.flood_adjustment_percent !== null
                ? ` Ajuste por risco de enchente: −${suggestion.flood_adjustment_percent}%.`
                : " Sem ajuste por risco de enchente."}
              {rental && " Não inclui condomínio, IPTU ou outras taxas."}
            </p>
            <Button type="button" variant="secondary" onClick={applyPrice}>
              {rental ? "Aplicar valor central ao aluguel" : "Aplicar valor central à venda"}
            </Button>
            {applied && <p>Valor central aplicado. Você pode ajustá-lo no campo de preço.</p>}
          </>
        )}
      </div>
    </div>
  );
}
