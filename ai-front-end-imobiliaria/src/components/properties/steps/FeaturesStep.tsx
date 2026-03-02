"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
        <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="usable_area">Área Útil (m²)</Label>
                    <Input
                        id="usable_area"
                        type="number"
                        step="0.01"
                        {...register("usable_area", { setValueAs: nullableNumber })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="total_area">Área Total (m²)</Label>
                    <Input
                        id="total_area"
                        type="number"
                        step="0.01"
                        {...register("total_area", { setValueAs: nullableNumber })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="build_year">Ano de Construção</Label>
                    <Input
                        id="build_year"
                        type="number"
                        {...register("build_year", { setValueAs: nullableNumber })}
                    />
                    {errors.build_year && (
                        <p className="text-sm text-red-500">{errors.build_year.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bedrooms">Quartos</Label>
                    <Input id="bedrooms" type="number" {...register("bedrooms", { setValueAs: intOrZero })} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="suites">Suítes</Label>
                    <Input id="suites" type="number" {...register("suites", { setValueAs: intOrZero })} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bathrooms">Banheiros</Label>
                    <Input
                        id="bathrooms"
                        type="number"
                        {...register("bathrooms", { setValueAs: intOrZero })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="garage_spaces">Vagas</Label>
                    <Input
                        id="garage_spaces"
                        type="number"
                        {...register("garage_spaces", { setValueAs: intOrZero })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="floor_number">Andar</Label>
                    <Input
                        id="floor_number"
                        type="number"
                        {...register("floor_number", { setValueAs: nullableNumber })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="total_floors">Total de Andares</Label>
                    <Input
                        id="total_floors"
                        type="number"
                        {...register("total_floors", { setValueAs: nullableNumber })}
                    />
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="font-medium">Comodidades</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {featuresOptions.map((feature) => {
                        const checked = selectedFeatures.includes(feature.id);
                        return (
                            <label
                                key={feature.id}
                                className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/30"
                            >
                                <Checkbox
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
                                <span className="text-sm">{feature.name}</span>
                            </label>
                        );
                    })}
                    {featuresOptions.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhuma comodidade cadastrada.</p>
                    )}
                </div>
            </div>
        </section>
    );
}

