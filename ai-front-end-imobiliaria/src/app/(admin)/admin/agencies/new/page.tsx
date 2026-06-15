"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

    return (
        <div className="container mx-auto py-8 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Nova Agência</CardTitle>
                    <CardDescription>
                        Cadastre uma nova imobiliária e seu administrador inicial.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <section className="space-y-4">
                            <h3 className="text-lg font-semibold">Dados da Agência</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="agencyName">Nome da Agência *</Label>
                                    <Input id="agencyName" {...form.register("agencyName")} />
                                    {form.formState.errors.agencyName && (
                                        <p className="text-sm text-red-500">
                                            {form.formState.errors.agencyName.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="agencySlug">Slug *</Label>
                                    <Input id="agencySlug" {...form.register("agencySlug")} />
                                    {form.formState.errors.agencySlug && (
                                        <p className="text-sm text-red-500">
                                            {form.formState.errors.agencySlug.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="agencyPhone">Telefone da Agência</Label>
                                    <Input id="agencyPhone" {...form.register("agencyPhone")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="agencyEmail">E-mail da Agência</Label>
                                    <Input id="agencyEmail" type="email" {...form.register("agencyEmail")} />
                                    {form.formState.errors.agencyEmail && (
                                        <p className="text-sm text-red-500">
                                            {form.formState.errors.agencyEmail.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <Separator />

                        <section className="space-y-4">
                            <h3 className="text-lg font-semibold">Administrador Inicial</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="adminName">Nome do Administrador *</Label>
                                    <Input id="adminName" {...form.register("adminName")} />
                                    {form.formState.errors.adminName && (
                                        <p className="text-sm text-red-500">
                                            {form.formState.errors.adminName.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminEmail">E-mail do Administrador *</Label>
                                    <Input id="adminEmail" type="email" {...form.register("adminEmail")} />
                                    {form.formState.errors.adminEmail && (
                                        <p className="text-sm text-red-500">
                                            {form.formState.errors.adminEmail.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminUsername">Usuário *</Label>
                                    <Input id="adminUsername" {...form.register("adminUsername")} />
                                    {form.formState.errors.adminUsername && (
                                        <p className="text-sm text-red-500">
                                            {form.formState.errors.adminUsername.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminPhone">Telefone do Administrador</Label>
                                    <Input id="adminPhone" {...form.register("adminPhone")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminPassword">Senha *</Label>
                                    <Input id="adminPassword" type="password" {...form.register("adminPassword")} />
                                    {form.formState.errors.adminPassword && (
                                        <p className="text-sm text-red-500">
                                            {form.formState.errors.adminPassword.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminPasswordConfirmation">Confirmar Senha *</Label>
                                    <Input
                                        id="adminPasswordConfirmation"
                                        type="password"
                                        {...form.register("adminPasswordConfirmation")}
                                    />
                                    {form.formState.errors.adminPasswordConfirmation && (
                                        <p className="text-sm text-red-500">
                                            {form.formState.errors.adminPasswordConfirmation.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/admin/agencies")}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Registrando…" : "Registrar Agência"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
