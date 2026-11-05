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
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FieldGroupTitle, InputAdornment } from "@/components/properties/steps/FieldLayout";
import type { PropertyFormValues } from "@/schemas/propertySchema";
import type { PropertyFeature } from "@/types/property";

interface FeaturesStepProps {
    featuresOptions: PropertyFeature[];
}

function nullableNumber(value: unknown): number | null {
    if (value === "" || value == null) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function intOrZero(value: unknown): number {
    if (value === "" || value == null) return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

export function FeaturesStep({ featuresOptions }: FeaturesStepProps) {
    const {
        register,
        watch,
        setValue,
        formState: { errors },
    } = useFormContext<PropertyFormValues>();

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
                            <FormField htmlFor="usable_area" label="Área Útil (m²)">
                                <InputAdornment suffix="m²">
                                    <Input
                                        className="pr-12"
                                        id="usable_area"
                                        type="number"
                                        step="0.01"
                                        {...register("usable_area", { setValueAs: nullableNumber })}
                                    />
                                </InputAdornment>
                            </FormField>
                            <FormField htmlFor="total_area" label="Área Total (m²)">
                                <InputAdornment suffix="m²">
                                    <Input
                                        className="pr-12"
                                        id="total_area"
                                        type="number"
                                        step="0.01"
                                        {...register("total_area", { setValueAs: nullableNumber })}
                                    />
                                </InputAdornment>
                            </FormField>
                            <FormField error={errors.build_year?.message} htmlFor="build_year" label="Ano de Construção">
                                <Input
                                    aria-invalid={!!errors.build_year}
                                    id="build_year"
                                    type="number"
                                    {...register("build_year", { setValueAs: nullableNumber })}
                                />
                            </FormField>
                        </div>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                        <FieldGroupTitle>Cômodos, vagas e andares</FieldGroupTitle>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                            <FormField htmlFor="bedrooms" label="Quartos">
                                <Input id="bedrooms" type="number" {...register("bedrooms", { setValueAs: intOrZero })} />
                            </FormField>
                            <FormField htmlFor="suites" label="Suítes">
                                <Input id="suites" type="number" {...register("suites", { setValueAs: intOrZero })} />
                            </FormField>
                            <FormField htmlFor="bathrooms" label="Banheiros">
                                <Input
                                    id="bathrooms"
                                    type="number"
                                    {...register("bathrooms", { setValueAs: intOrZero })}
                                />
                            </FormField>
                            <FormField htmlFor="garage_spaces" label="Vagas">
                                <Input
                                    id="garage_spaces"
                                    type="number"
                                    {...register("garage_spaces", { setValueAs: intOrZero })}
                                />
                            </FormField>
                            <FormField htmlFor="floor_number" label="Andar">
                                <Input
                                    id="floor_number"
                                    type="number"
                                    {...register("floor_number", { setValueAs: nullableNumber })}
                                />
                            </FormField>
                            <FormField htmlFor="total_floors" label="Total de Andares">
                                <Input
                                    id="total_floors"
                                    type="number"
                                    {...register("total_floors", { setValueAs: nullableNumber })}
                                />
                            </FormField>
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
                                            checked && "bg-primary/10 ring-1 ring-primary/40 hover:bg-primary/15",
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
