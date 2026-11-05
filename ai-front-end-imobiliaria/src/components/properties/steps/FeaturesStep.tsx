"use client";

import { useFormContext } from "react-hook-form";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { FieldGroupTitle } from "@/components/properties/steps/FieldLayout";
import { NumericField } from "@/components/properties/steps/NumericField";
import type { PropertyFormValues } from "@/schemas/propertySchema";
import type { PropertyFeature } from "@/types/property";

interface FeaturesStepProps {
    featuresOptions: PropertyFeature[];
}

export function FeaturesStep({ featuresOptions }: FeaturesStepProps) {
    const { watch, setValue } = useFormContext<PropertyFormValues>();

    const selectedFeatures = watch("features");

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Medidas e cômodos</CardTitle>
                    <CardDescription>Áreas, cômodos, vagas e dados do prédio.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-7">
                    <div className="space-y-4">
                        <FieldGroupTitle>Áreas e construção</FieldGroupTitle>
                        <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                            <NumericField kind="decimal" label="Área Útil (m²)" name="usable_area" suffix="m²" />
                            <NumericField kind="decimal" label="Área Total (m²)" name="total_area" suffix="m²" />
                            <NumericField
                                kind="integer"
                                label="Ano de Construção"
                                maxDigits={4}
                                name="build_year"
                                placeholder={`Ex.: ${new Date().getFullYear() - 10}`}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                        <FieldGroupTitle>Cômodos, vagas e andares</FieldGroupTitle>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                            <NumericField emptyAsZero kind="integer" label="Quartos" maxDigits={2} name="bedrooms" />
                            <NumericField emptyAsZero kind="integer" label="Suítes" maxDigits={2} name="suites" />
                            <NumericField emptyAsZero kind="integer" label="Banheiros" maxDigits={2} name="bathrooms" />
                            <NumericField emptyAsZero kind="integer" label="Vagas" maxDigits={3} name="garage_spaces" />
                            <NumericField allowNegative kind="integer" label="Andar" maxDigits={3} name="floor_number" />
                            <NumericField kind="integer" label="Total de Andares" maxDigits={3} name="total_floors" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Comodidades</CardTitle>
                    <CardDescription>Marque o que o imóvel ou o condomínio oferece.</CardDescription>
                    {featuresOptions.length > 0 && (
                        <CardAction>
                            <Badge className="tabular-nums" variant={selectedFeatures.length > 0 ? "info" : "muted"}>
                                {selectedFeatures.length} {selectedFeatures.length === 1 ? "selecionada" : "selecionadas"}
                            </Badge>
                        </CardAction>
                    )}
                </CardHeader>
                <CardContent>
                    {featuresOptions.length === 0 ? (
                        <EmptyState
                            icon={Sparkles}
                            title="Nenhuma comodidade cadastrada."
                            variant="inline"
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {featuresOptions.map((feature) => {
                                const checked = selectedFeatures.includes(feature.id);
                                return (
                                    <label
                                        key={feature.id}
                                        className={cn(
                                            "flex cursor-pointer items-center gap-3 rounded-xl bg-muted px-4 py-3.5 transition-colors hover:bg-secondary",
                                            checked && "bg-primary/10 ring-1 ring-primary hover:bg-primary/15",
                                        )}
                                    >
                                        <Checkbox
                                            className="size-[18px]"
                                            checked={checked}
                                            onCheckedChange={(isChecked) => {
                                                if (isChecked) {
                                                    setValue("features", [...selectedFeatures, feature.id]);
                                                    return;
                                                }

                                                setValue(
                                                    "features",
                                                    selectedFeatures.filter((item) => item !== feature.id)
                                                );
                                            }}
                                        />
                                        <span className="text-sm font-medium text-foreground">{feature.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
