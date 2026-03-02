"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
        <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="zip_code">CEP *</Label>
                    <div className="flex gap-2">
                        <Input id="zip_code" {...register("zip_code")} />
                        <Button type="button" variant="outline" onClick={handleSearchCep} disabled={isSearchingCep}>
                            <Search className="h-4 w-4 mr-2" />
                            {isSearchingCep ? "Buscando..." : "Buscar"}
                        </Button>
                    </div>
                    {errors.zip_code && <p className="text-sm text-red-500">{errors.zip_code.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">Logradouro *</Label>
                    <Input id="street" {...register("street")} />
                    {errors.street && <p className="text-sm text-red-500">{errors.street.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="number">Número *</Label>
                    <Input id="number" {...register("number")} />
                    {errors.number && <p className="text-sm text-red-500">{errors.number.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input id="complement" {...register("complement")} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input id="neighborhood" {...register("neighborhood")} />
                    {errors.neighborhood && (
                        <p className="text-sm text-red-500">{errors.neighborhood.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input id="city" {...register("city")} />
                    {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="state">UF *</Label>
                    <Input id="state" maxLength={2} {...register("state")} />
                    {errors.state && <p className="text-sm text-red-500">{errors.state.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                        id="latitude"
                        type="number"
                        step="0.00000001"
                        {...register("latitude", { setValueAs: nullableNumber })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                        id="longitude"
                        type="number"
                        step="0.00000001"
                        {...register("longitude", { setValueAs: nullableNumber })}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <p className="font-medium">Exibir endereço exato no site</p>
                    <p className="text-sm text-muted-foreground">
                        Desative para ocultar número e localização precisa na vitrine pública.
                    </p>
                </div>
                <Switch
                    checked={watch("show_exact_address")}
                    onCheckedChange={(checked) => setValue("show_exact_address", checked, { shouldDirty: true })}
                />
            </div>
        </section>
    );
}

