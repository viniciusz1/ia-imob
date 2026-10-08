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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { PropertyFormValues } from "@/schemas/propertySchema";
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
        <Card>
            <CardHeader className="border-b">
                <CardTitle>Dados básicos</CardTitle>
                <CardDescription>Identificação, tipo e situação do imóvel.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <FormField
                    error={errors.reference_code?.message}
                    htmlFor="reference_code"
                    label="Código de Referência"
                    required
                >
                    <Input
                        aria-invalid={!!errors.reference_code}
                        id="reference_code"
                        {...register("reference_code")}
                    />
                </FormField>

                <FormField
                    className="lg:col-span-2"
                    error={errors.title?.message}
                    htmlFor="title"
                    label="Título"
                    required
                >
                    <Input aria-invalid={!!errors.title} id="title" {...register("title")} />
                </FormField>

                <FormField
                    error={errors.property_type?.message}
                    htmlFor="property_type"
                    label="Tipo de Imóvel"
                    required
                >
                    <Select
                        value={watch("property_type")}
                        onValueChange={(value) => setValue("property_type", value, { shouldValidate: true })}
                    >
                        <SelectTrigger
                            aria-invalid={!!errors.property_type}
                            className="w-full"
                            id="property_type"
                        >
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
                </FormField>

                <FormField
                    error={errors.purpose?.message}
                    htmlFor="purpose"
                    label="Finalidade"
                    required
                >
                    <Select
                        value={watch("purpose")}
                        onValueChange={(value) => setValue("purpose", value, { shouldValidate: true })}
                    >
                        <SelectTrigger
                            aria-invalid={!!errors.purpose}
                            className="w-full"
                            id="purpose"
                        >
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
                </FormField>

                <FormField
                    error={errors.status?.message}
                    htmlFor="status"
                    label="Status"
                    required
                >
                    <Select
                        value={watch("status")}
                        onValueChange={(value) => setValue("status", value, { shouldValidate: true })}
                    >
                        <SelectTrigger
                            aria-invalid={!!errors.status}
                            className="w-full"
                            id="status"
                        >
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
                </FormField>

                <FormField
                    className="sm:col-span-2 lg:col-span-3"
                    error={errors.description?.message}
                    htmlFor="description"
                    label="Descrição"
                >
                    <Textarea className="min-h-32" id="description" {...register("description")} />
                </FormField>
            </CardContent>
        </Card>
    );
}
