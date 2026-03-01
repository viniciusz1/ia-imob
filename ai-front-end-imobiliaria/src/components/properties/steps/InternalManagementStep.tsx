"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PropertyFormValues } from "@/schemas/property";

function nullableNumber(value: unknown): number | null {
    if (value === "" || value == null) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

export function InternalManagementStep() {
    const {
        register,
        watch,
        setValue,
        formState: { errors },
    } = useFormContext<PropertyFormValues>();

    return (
        <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="broker_id">Corretor Captador (ID)</Label>
                    <Input
                        id="broker_id"
                        type="number"
                        placeholder="Ex: 12"
                        {...register("broker_id", { setValueAs: nullableNumber })}
                    />
                    <p className="text-xs text-muted-foreground">
                        Campo temporário por ID até integração de autocomplete.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="owner_id">Proprietário (ID)</Label>
                    <Input
                        id="owner_id"
                        type="number"
                        placeholder="Ex: 45"
                        {...register("owner_id", { setValueAs: nullableNumber })}
                    />
                    <p className="text-xs text-muted-foreground">
                        Campo temporário por ID até integração de autocomplete.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="exclusive_right_expiration_date">Vencimento da Exclusividade</Label>
                    <Input
                        id="exclusive_right_expiration_date"
                        type="date"
                        {...register("exclusive_right_expiration_date")}
                    />
                    {errors.exclusive_right_expiration_date && (
                        <p className="text-sm text-red-500">
                            {errors.exclusive_right_expiration_date.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="keys_location">Localização das Chaves</Label>
                    <Input id="keys_location" {...register("keys_location")} />
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <p className="font-medium">Visível no Site</p>
                        <p className="text-sm text-muted-foreground">Controla a publicação na vitrine.</p>
                    </div>
                    <Switch
                        checked={watch("is_published")}
                        onCheckedChange={(checked) => setValue("is_published", checked, { shouldDirty: true })}
                    />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <p className="font-medium">Imóvel em Destaque</p>
                        <p className="text-sm text-muted-foreground">Prioriza exibição nas listagens.</p>
                    </div>
                    <Switch
                        checked={watch("is_highlighted")}
                        onCheckedChange={(checked) => setValue("is_highlighted", checked, { shouldDirty: true })}
                    />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <p className="font-medium">Contrato de Exclusividade</p>
                        <p className="text-sm text-muted-foreground">
                            Quando ativo, a data de vencimento passa a ser obrigatória.
                        </p>
                    </div>
                    <Switch
                        checked={watch("has_exclusive_right")}
                        onCheckedChange={(checked) =>
                            setValue("has_exclusive_right", checked, { shouldDirty: true, shouldValidate: true })
                        }
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="internal_notes">Notas Internas</Label>
                <Textarea id="internal_notes" className="min-h-32" {...register("internal_notes")} />
            </div>
        </section>
    );
}
