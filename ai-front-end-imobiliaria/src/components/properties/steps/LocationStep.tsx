"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
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
import { SwitchTile } from "@/components/properties/steps/SwitchTile";
import type { PropertyFormValues } from "@/schemas/propertySchema";
import { toast } from "sonner";

function sanitizeCep(cep: string): string {
    return cep.replace(/\D/g, "");
}

function nullableNumber(value: unknown): number | null {
    if (value === "" || value == null) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

export function LocationStep() {
    const {
        register,
        watch,
        setValue,
        formState: { errors },
    } = useFormContext<PropertyFormValues>();
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

            setValue("street", data.logradouro ?? "");
            setValue("neighborhood", data.bairro ?? "");
            setValue("city", data.localidade ?? "");
            setValue("state", data.uf ?? "");
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
                <CardHeader className="border-b">
                    <CardTitle>Endereço</CardTitle>
                    <CardDescription>Busque pelo CEP para preencher logradouro, bairro, cidade e UF.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField
                        className="sm:col-span-2"
                        error={errors.zip_code?.message}
                        htmlFor="zip_code"
                        label="CEP"
                        required
                    >
                        <div className="flex gap-2">
                            <Input aria-invalid={!!errors.zip_code} id="zip_code" {...register("zip_code")} />
                            <Button type="button" variant="outline" onClick={handleSearchCep} disabled={isSearchingCep}>
                                {isSearchingCep ? <Loader2 className="animate-spin" /> : <Search />}
                                {isSearchingCep ? "Buscando..." : "Buscar"}
                            </Button>
                        </div>
                    </FormField>
                    <div className="hidden lg:col-span-2 lg:block" />

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
                    <FormField htmlFor="complement" label="Complemento">
                        <Input id="complement" {...register("complement")} />
                    </FormField>
                    <FormField error={errors.neighborhood?.message} htmlFor="neighborhood" label="Bairro" required>
                        <Input aria-invalid={!!errors.neighborhood} id="neighborhood" {...register("neighborhood")} />
                    </FormField>
                    <FormField error={errors.city?.message} htmlFor="city" label="Cidade" required>
                        <Input aria-invalid={!!errors.city} id="city" {...register("city")} />
                    </FormField>
                    <FormField error={errors.state?.message} htmlFor="state" label="UF" required>
                        <Input aria-invalid={!!errors.state} id="state" maxLength={2} {...register("state")} />
                    </FormField>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b">
                    <CardTitle>Mapa e privacidade</CardTitle>
                    <CardDescription>Coordenadas do imóvel e o que aparece na vitrine pública.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FormField htmlFor="latitude" label="Latitude">
                        <Input
                            id="latitude"
                            type="number"
                            step="0.00000001"
                            {...register("latitude", { setValueAs: nullableNumber })}
                        />
                    </FormField>
                    <FormField htmlFor="longitude" label="Longitude">
                        <Input
                            id="longitude"
                            type="number"
                            step="0.00000001"
                            {...register("longitude", { setValueAs: nullableNumber })}
                        />
                    </FormField>
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
