"use client";

import { Controller, useFormContext } from "react-hook-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SwitchTile } from "@/components/properties/steps/SwitchTile";
import type { PropertyFormValues } from "@/schemas/propertySchema";

function nullableNumber(value: unknown): number | null {
    if (value === "" || value == null) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

export function InternalManagementStep() {
    const {
        control,
        register,
        watch,
        setValue,
        formState: { errors },
    } = useFormContext<PropertyFormValues>();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="border-b">
                    <CardTitle>Publicação</CardTitle>
                    <CardDescription>Como o imóvel aparece no site da imobiliária.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <SwitchTile
                        checked={watch("is_published")}
                        description="Controla a publicação na vitrine."
                        id="is_published"
                        onCheckedChange={(checked) => setValue("is_published", checked, { shouldDirty: true })}
                        title="Visível no Site"
                    />
                    <SwitchTile
                        checked={watch("is_highlighted")}
                        description="Prioriza exibição nas listagens."
                        id="is_highlighted"
                        onCheckedChange={(checked) => setValue("is_highlighted", checked, { shouldDirty: true })}
                        title="Imóvel em Destaque"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b">
                    <CardTitle>Captação e exclusividade</CardTitle>
                    <CardDescription>Responsáveis, contrato de exclusividade e chaves.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FormField
                        hint="Campo temporário por ID até integração de autocomplete."
                        htmlFor="broker_id"
                        label="Corretor Captador (ID)"
                    >
                        <Input
                            id="broker_id"
                            type="number"
                            placeholder="Ex: 12"
                            {...register("broker_id", { setValueAs: nullableNumber })}
                        />
                    </FormField>
                    <FormField
                        hint="Campo temporário por ID até integração de autocomplete."
                        htmlFor="owner_id"
                        label="Proprietário (ID)"
                    >
                        <Input
                            id="owner_id"
                            type="number"
                            placeholder="Ex: 45"
                            {...register("owner_id", { setValueAs: nullableNumber })}
                        />
                    </FormField>

                    <SwitchTile
                        checked={watch("has_exclusive_right")}
                        className="sm:col-span-2"
                        description="Quando ativo, a data de vencimento passa a ser obrigatória."
                        id="has_exclusive_right"
                        onCheckedChange={(checked) =>
                            setValue("has_exclusive_right", checked, { shouldDirty: true, shouldValidate: true })
                        }
                        title="Contrato de Exclusividade"
                    />

                    <FormField
                        error={errors.exclusive_right_expiration_date?.message}
                        htmlFor="exclusive_right_expiration_date"
                        label="Vencimento da Exclusividade"
                    >
                        <Controller
                            control={control}
                            name="exclusive_right_expiration_date"
                            render={({ field }) => (
                                <DatePicker
                                    aria-invalid={!!errors.exclusive_right_expiration_date}
                                    id="exclusive_right_expiration_date"
                                    onChange={field.onChange}
                                    value={typeof field.value === "string" ? field.value.slice(0, 10) : ""}
                                />
                            )}
                        />
                    </FormField>
                    <FormField htmlFor="keys_location" label="Localização das Chaves">
                        <Input id="keys_location" {...register("keys_location")} />
                    </FormField>

                    <FormField className="sm:col-span-2" htmlFor="internal_notes" label="Notas Internas">
                        <Textarea id="internal_notes" className="min-h-32" {...register("internal_notes")} />
                    </FormField>
                </CardContent>
            </Card>
        </div>
    );
}
