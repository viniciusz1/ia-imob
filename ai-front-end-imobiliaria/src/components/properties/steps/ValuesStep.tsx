"use client";

import { useFormContext } from "react-hook-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SwitchTile } from "@/components/properties/steps/SwitchTile";
import type { PropertyFormValues } from "@/schemas/propertySchema";

function nullableNumber(value: unknown): number | null {
    if (value === "" || value == null) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

export function ValuesStep() {
    const { register, watch, setValue } = useFormContext<PropertyFormValues>();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="border-b">
                    <CardTitle>Valores</CardTitle>
                    <CardDescription>Preços de venda e locação e custos mensais, em reais.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField htmlFor="sale_price" label="Valor de Venda">
                        <Input
                            id="sale_price"
                            type="number"
                            step="0.01"
                            {...register("sale_price", { setValueAs: nullableNumber })}
                        />
                    </FormField>
                    <FormField htmlFor="rent_price" label="Valor de Locação">
                        <Input
                            id="rent_price"
                            type="number"
                            step="0.01"
                            {...register("rent_price", { setValueAs: nullableNumber })}
                        />
                    </FormField>
                    <FormField htmlFor="property_tax" label="IPTU">
                        <Input
                            id="property_tax"
                            type="number"
                            step="0.01"
                            {...register("property_tax", { setValueAs: nullableNumber })}
                        />
                    </FormField>
                    <FormField htmlFor="condo_fee" label="Condomínio">
                        <Input
                            id="condo_fee"
                            type="number"
                            step="0.01"
                            {...register("condo_fee", { setValueAs: nullableNumber })}
                        />
                    </FormField>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b">
                    <CardTitle>Condições</CardTitle>
                    <CardDescription>Negociação e exibição do preço no site.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <SwitchTile
                        checked={watch("accepts_financing")}
                        description="Indica se aceita financiamento bancário."
                        id="accepts_financing"
                        onCheckedChange={(checked) =>
                            setValue("accepts_financing", checked, { shouldDirty: true })
                        }
                        title="Aceita Financiamento"
                    />
                    <SwitchTile
                        checked={watch("accepts_exchange")}
                        description="Indica se o proprietário aceita troca."
                        id="accepts_exchange"
                        onCheckedChange={(checked) =>
                            setValue("accepts_exchange", checked, { shouldDirty: true })
                        }
                        title="Estuda Permuta"
                    />
                    <SwitchTile
                        checked={watch("show_price")}
                        description="Desative para ocultar preço do anúncio público."
                        id="show_price"
                        onCheckedChange={(checked) => setValue("show_price", checked, { shouldDirty: true })}
                        title="Exibir Preço no Site"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
