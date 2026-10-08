"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
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
import { createAgency } from "@/services/adminApi";
import {
    registerAgencySchema,
    type RegisterAgencyFormValues,
} from "@/schemas/adminAgencySchema";

export default function AdminNewAgencyPage() {
    const router = useRouter();
    const form = useForm<RegisterAgencyFormValues>({
        resolver: zodResolver(registerAgencySchema),
        defaultValues: {
            agencyName: "",
            agencySlug: "",
            agencyPhone: "",
            agencyEmail: "",
            adminName: "",
            adminEmail: "",
            adminUsername: "",
            adminPhone: "",
            adminPassword: "",
            adminPasswordConfirmation: "",
        },
    });

    const onSubmit = async (values: RegisterAgencyFormValues) => {
        try {
            await createAgency({
                agency: {
                    name: values.agencyName,
                    slug: values.agencySlug,
                    phone: values.agencyPhone || undefined,
                    email: values.agencyEmail || undefined,
                },
                admin: {
                    name: values.adminName,
                    email: values.adminEmail,
                    username: values.adminUsername,
                    phone: values.adminPhone || undefined,
                    password: values.adminPassword,
                    password_confirmation: values.adminPasswordConfirmation || "",
                },
            });
            toast.success("Agência registrada com sucesso.");
            router.push("/admin/agencies");
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
                    const field = key.replace("agency.", "agency").replace("admin.", "admin") as keyof RegisterAgencyFormValues;
                    form.setError(field, {
                        type: "server",
                        message: errors[key][0],
                    });
                });
                toast.error("Por favor, verifique os campos destacados.");
            } else {
                toast.error("Ocorreu um erro ao registrar a agência.");
            }
        }
    };

    const { errors, isSubmitting } = form.formState;

    return (
        <div className="space-y-6">
            <PageHeader
                backHref="/admin/agencies"
                description="Cadastre uma nova imobiliária e seu administrador inicial."
                title="Nova agência"
            />

            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle>Dados da agência</CardTitle>
                        <CardDescription>Identificação e contato da imobiliária.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField error={errors.agencyName?.message} htmlFor="agencyName" label="Nome da Agência" required>
                            <Input id="agencyName" {...form.register("agencyName")} />
                        </FormField>
                        <FormField
                            error={errors.agencySlug?.message}
                            hint="Usado no endereço do site público."
                            htmlFor="agencySlug"
                            label="Slug"
                            required
                        >
                            <Input id="agencySlug" {...form.register("agencySlug")} />
                        </FormField>
                        <FormField htmlFor="agencyPhone" label="Telefone da Agência">
                            <Input id="agencyPhone" {...form.register("agencyPhone")} />
                        </FormField>
                        <FormField error={errors.agencyEmail?.message} htmlFor="agencyEmail" label="E-mail da Agência">
                            <Input id="agencyEmail" type="email" {...form.register("agencyEmail")} />
                        </FormField>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="border-b">
                        <CardTitle>Administrador inicial</CardTitle>
                        <CardDescription>Primeiro usuário com acesso total ao CRM da agência.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField
                            className="sm:col-span-2"
                            error={errors.adminName?.message}
                            htmlFor="adminName"
                            label="Nome do Administrador"
                            required
                        >
                            <Input id="adminName" {...form.register("adminName")} />
                        </FormField>
                        <FormField error={errors.adminEmail?.message} htmlFor="adminEmail" label="E-mail do Administrador" required>
                            <Input id="adminEmail" type="email" {...form.register("adminEmail")} />
                        </FormField>
                        <FormField error={errors.adminUsername?.message} htmlFor="adminUsername" label="Usuário" required>
                            <Input id="adminUsername" {...form.register("adminUsername")} />
                        </FormField>
                        <FormField htmlFor="adminPhone" label="Telefone do Administrador">
                            <Input id="adminPhone" {...form.register("adminPhone")} />
                        </FormField>
                        <div className="hidden sm:block" />
                        <FormField error={errors.adminPassword?.message} htmlFor="adminPassword" label="Senha" required>
                            <Input id="adminPassword" type="password" {...form.register("adminPassword")} />
                        </FormField>
                        <FormField
                            error={errors.adminPasswordConfirmation?.message}
                            htmlFor="adminPasswordConfirmation"
                            label="Confirmar Senha"
                            required
                        >
                            <Input
                                id="adminPasswordConfirmation"
                                type="password"
                                {...form.register("adminPasswordConfirmation")}
                            />
                        </FormField>
                    </CardContent>
                </Card>

                <div className="flex flex-wrap justify-end gap-3">
                    <Button onClick={() => router.push("/admin/agencies")} type="button" variant="outline">
                        Cancelar
                    </Button>
                    <Button disabled={isSubmitting} type="submit">
                        {isSubmitting && <Loader2 className="animate-spin" />}
                        {isSubmitting ? "Registrando…" : "Registrar Agência"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
