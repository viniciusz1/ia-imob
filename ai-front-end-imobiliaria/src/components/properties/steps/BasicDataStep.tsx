"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { PropertyFormValues } from "@/schemas/property";
import type { SelectOption } from "@/types/property";

interface BasicDataStepProps {
    propertyTypes: SelectOption[];
    purposes: SelectOption[];
    statuses: SelectOption[];
}

export function BasicDataStep({
    propertyTypes,
    purposes,
    statuses,
}: BasicDataStepProps) {
    const {
        register,
        setValue,
        watch,
        formState: { errors },
    } = useFormContext<PropertyFormValues>();

    return (
        <section className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="reference_code">Código de Referência *</Label>
                    <Input id="reference_code" {...register("reference_code")} />
                    {errors.reference_code && (
                        <p className="text-sm text-red-500">{errors.reference_code.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input id="title" {...register("title")} />
                    {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label>Tipo de Imóvel *</Label>
                    <Select
                        value={watch("property_type")}
                        onValueChange={(value) => setValue("property_type", value, { shouldValidate: true })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            {propertyTypes.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.property_type && (
                        <p className="text-sm text-red-500">{errors.property_type.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>Finalidade *</Label>
                    <Select
                        value={watch("purpose")}
                        onValueChange={(value) => setValue("purpose", value, { shouldValidate: true })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            {purposes.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.purpose && <p className="text-sm text-red-500">{errors.purpose.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label>Status *</Label>
                    <Select
                        value={watch("status")}
                        onValueChange={(value) => setValue("status", value, { shouldValidate: true })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            {statuses.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" {...register("description")} className="min-h-32" />
                {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
            </div>
        </section>
    );
}
