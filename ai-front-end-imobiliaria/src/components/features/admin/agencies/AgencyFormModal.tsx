"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateAgency } from "@/hooks/useAdminAgencies";
import { agencyFormSchema, type AgencyFormValues } from "@/schemas/adminAgencySchema";
import type { AgencySummary } from "@/services/adminApi";

interface AgencyFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agency: AgencySummary | null;
}

function getDefaultValues(agency: AgencySummary | null): AgencyFormValues {
    return {
        name: agency?.name || "",
        slug: agency?.slug || "",
    };
}

export function AgencyFormModal({ open, onOpenChange, agency }: AgencyFormModalProps) {
    const updateMutation = useUpdateAgency(agency?.id || 0);

    const form = useForm<AgencyFormValues>({
        resolver: zodResolver(agencyFormSchema),
        defaultValues: getDefaultValues(agency),
    });

    useEffect(() => {
        if (open) {
            form.reset(getDefaultValues(agency));
        }
    }, [open, agency, form]);

    const onSubmit = async (values: AgencyFormValues) => {
        try {
            await updateMutation.mutateAsync(values);
            toast.success("Agência atualizada com sucesso.");
            onOpenChange(false);
        } catch (error: unknown) {
            if (
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof (error as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } }).response?.status === "number" &&
                (error as { response: { status: number } }).response.status === 422 &&
                (error as { response: { data?: { errors?: Record<string, string[]> } } }).response.data?.errors
            ) {
                const errors = (error as { response: { data: { errors: Record<string, string[]> } } }).response.data.errors;
                Object.keys(errors).forEach((key) => {
                    form.setError(key as keyof AgencyFormValues, {
                        type: "server",
                        message: errors[key][0],
                    });
                });
                toast.error("Por favor, verifique os campos destacados.");
            } else {
                toast.error("Ocorreu um erro ao salvar a agência.");
            }
        }
    };

    const isLoading = updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Agência</DialogTitle>
                    <DialogDescription>
                        Atualize os dados de identificação da agência.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="agency-name">Nome *</Label>
                        <Input
                            id="agency-name"
                            {...form.register("name")}
                        />
                        {form.formState.errors.name && (
                            <p className="text-sm text-red-500">
                                {form.formState.errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="agency-slug">Slug *</Label>
                        <Input
                            id="agency-slug"
                            {...form.register("slug")}
                        />
                        {form.formState.errors.slug && (
                            <p className="text-sm text-red-500">
                                {form.formState.errors.slug.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
