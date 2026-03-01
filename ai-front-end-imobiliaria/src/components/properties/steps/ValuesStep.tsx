"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PropertyFormValues } from "@/schemas/property";

function nullableNumber(value: unknown): number | null {
    if (value === "" || value == null) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

export function ValuesStep() {
    const { register, watch, setValue } = useFormContext<PropertyFormValues>();

    return (
        <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="sale_price">Valor de Venda</Label>
                    <Input
                        id="sale_price"
                        type="number"
                        step="0.01"
                        {...register("sale_price", { setValueAs: nullableNumber })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="rent_price">Valor de Locação</Label>
                    <Input
                        id="rent_price"
                        type="number"
                        step="0.01"
                        {...register("rent_price", { setValueAs: nullableNumber })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="property_tax">IPTU</Label>
                    <Input
                        id="property_tax"
                        type="number"
                        step="0.01"
                        {...register("property_tax", { setValueAs: nullableNumber })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="condo_fee">Condomínio</Label>
                    <Input
                        id="condo_fee"
                        type="number"
                        step="0.01"
                        {...register("condo_fee", { setValueAs: nullableNumber })}
                    />
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <p className="font-medium">Aceita Financiamento</p>
                        <p className="text-sm text-muted-foreground">Indica se aceita financiamento bancário.</p>
                    </div>
                    <Switch
                        checked={watch("accepts_financing")}
                        onCheckedChange={(checked) =>
                            setValue("accepts_financing", checked, { shouldDirty: true })
                        }
                    />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <p className="font-medium">Estuda Permuta</p>
                        <p className="text-sm text-muted-foreground">Indica se o proprietário aceita troca.</p>
                    </div>
                    <Switch
                        checked={watch("accepts_exchange")}
                        onCheckedChange={(checked) =>
                            setValue("accepts_exchange", checked, { shouldDirty: true })
                        }
                    />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <p className="font-medium">Exibir Preço no Site</p>
                        <p className="text-sm text-muted-foreground">Desative para ocultar preço do anúncio público.</p>
                    </div>
                    <Switch
                        checked={watch("show_price")}
                        onCheckedChange={(checked) => setValue("show_price", checked, { shouldDirty: true })}
                    />
                </div>
            </div>
        </section>
    );
}
