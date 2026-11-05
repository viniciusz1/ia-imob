"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CityCombobox, StateSelect } from "@/components/properties/steps/BrazilLocationFields";
import { NumericField } from "@/components/properties/steps/NumericField";
import { SwitchTile } from "@/components/properties/steps/SwitchTile";
import type { PropertyFormValues } from "@/schemas/propertySchema";
import { toast } from "sonner";

function sanitizeCep(cep: string): string {
    return cep.replace(/\D/g, "");
}

export function LocationStep() {
    const {
        control,
        register,
        watch,
        setValue,
        formState: { errors },
    } = useFormContext<PropertyFormValues>();
    const selectedState = watch("state") ?? "";
    const [isSearchingCep, setIsSearchingCep] = useState(false);

    async function handleSearchCep() {
        const currentCep = sanitizeCep(watch("zip_code"));

        if (currentCep.length !== 8) {
            toast.error("Informe um CEP válido com 8 dígitos.");
            return;
        }

        try {
            setIsSearchingCep(true);
            const response = await fetch(`https://viacep.com.br/ws/${currentCep}/json/`);
            const data = await response.json();

            if (data.erro) {
                toast.error("CEP não encontrado.");
                return;
            }

            const fill = { shouldDirty: true, shouldValidate: true } as const;
            setValue("street", data.logradouro ?? "", fill);
            setValue("neighborhood", data.bairro ?? "", fill);
            setValue("state", (data.uf ?? "").toUpperCase(), fill);
            setValue("city", data.localidade ?? "", fill);
            toast.success("Endereço preenchido a partir do CEP.");
        } catch {
            toast.error("Falha ao consultar o CEP.");
        } finally {
            setIsSearchingCep(false);
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Endereço</CardTitle>
                    <CardDescription>Busque pelo CEP para preencher logradouro, bairro, cidade e UF.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-6">
                    <FormField
                        className="sm:col-span-2 lg:col-span-2"
                        error={errors.zip_code?.message}
                        htmlFor="zip_code"
                        label="CEP"
                        required
                    >
                        <div className="flex gap-2">
                            <Input
                                aria-invalid={!!errors.zip_code}
                                id="zip_code"
                                inputMode="numeric"
                                maxLength={9}
                                placeholder="00000-000"
                                {...register("zip_code")}
                            />
                            <Button
                                aria-label="Buscar CEP"
                                disabled={isSearchingCep}
                                onClick={handleSearchCep}
                                size="icon-lg"
                                title="Buscar endereço pelo CEP"
                                type="button"
                            >
                                {isSearchingCep ? <Loader2 className="animate-spin" /> : <Search />}
                            </Button>
                        </div>
                    </FormField>
                    <FormField
                        className="sm:col-span-2 lg:col-span-3"
                        error={errors.street?.message}
                        htmlFor="street"
                        label="Logradouro"
                        required
                    >
                        <Input aria-invalid={!!errors.street} id="street" {...register("street")} />
                    </FormField>
                    <FormField error={errors.number?.message} htmlFor="number" label="Número" required>
                        <Input aria-invalid={!!errors.number} id="number" {...register("number")} />
                    </FormField>
                    <FormField error={errors.state?.message} htmlFor="state" label="UF" required>
                        <Controller
                            control={control}
                            name="state"
                            render={({ field, fieldState }) => (
                                <StateSelect
                                    id="state"
                                    invalid={fieldState.invalid}
                                    onValueChange={(uf) => {
                                        if (uf === field.value) return;
                                        field.onChange(uf);
                                        // A city belongs to one UF: picking another UF asks for the city again.
                                        setValue("city", "", { shouldDirty: true });
                                    }}
                                    value={field.value ?? ""}
                                />
                            )}
                        />
                    </FormField>
                    <FormField className="lg:col-span-2" error={errors.city?.message} htmlFor="city" label="Cidade" required>
                        <Controller
                            control={control}
                            name="city"
                            render={({ field, fieldState }) => (
                                <CityCombobox
                                    id="city"
                                    invalid={fieldState.invalid}
                                    onValueChange={(city) => field.onChange(city)}
                                    uf={selectedState}
                                    value={field.value ?? ""}
                                />
                            )}
                        />
                    </FormField>
                    <FormField className="lg:col-span-2" error={errors.neighborhood?.message} htmlFor="neighborhood" label="Bairro" required>
                        <Input aria-invalid={!!errors.neighborhood} id="neighborhood" {...register("neighborhood")} />
                    </FormField>
                    <FormField htmlFor="complement" label="Complemento">
                        <Input id="complement" {...register("complement")} />
                    </FormField>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Mapa e privacidade</CardTitle>
                    <CardDescription>Coordenadas do imóvel e o que aparece na vitrine pública.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2">
                    <NumericField
                        allowNegative
                        decimals={7}
                        grouping={false}
                        kind="decimal"
                        label="Latitude"
                        maxIntegerDigits={2}
                        name="latitude"
                        placeholder="Ex.: -26,4851"
                    />
                    <NumericField
                        allowNegative
                        decimals={7}
                        grouping={false}
                        kind="decimal"
                        label="Longitude"
                        maxIntegerDigits={3}
                        name="longitude"
                        placeholder="Ex.: -49,0713"
                    />
                    <SwitchTile
                        checked={watch("show_exact_address")}
                        className="sm:col-span-2"
                        description="Desative para ocultar número e localização precisa na vitrine pública."
                        id="show_exact_address"
                        onCheckedChange={(checked) => setValue("show_exact_address", checked, { shouldDirty: true })}
                        title="Exibir endereço exato no site"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
