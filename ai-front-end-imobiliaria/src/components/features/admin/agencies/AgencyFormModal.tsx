"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { FormField } from "@/components/ui/form-field";
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
            <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader className="gap-1 border-b px-6 py-5 text-left">
                        <DialogTitle>Editar agência</DialogTitle>
                        <DialogDescription>
                            Atualize os dados de identificação da agência.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 px-6 py-5">
                        <FormField
                            error={form.formState.errors.name?.message}
                            htmlFor="agency-name"
                            label="Nome"
                            required
                        >
                            <Input id="agency-name" {...form.register("name")} />
                        </FormField>

                        <FormField
                            error={form.formState.errors.slug?.message}
                            htmlFor="agency-slug"
                            label="Slug"
                            required
                        >
                            <Input id="agency-slug" {...form.register("slug")} />
                        </FormField>
                    </div>

                    <DialogFooter className="gap-2 border-t px-6 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="animate-spin" />}
                            {isLoading ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
