"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Separator } from "@/components/ui/separator";

import { useCreateUser, useUpdateUser } from "@/hooks/useUsers";
import {
    createUserSchema,
    userFormSchema,
    UserFormValues,
} from "@/schemas/userSchema";
import { User } from "@/types/user";
import { useRoles } from "@/hooks/useRoles";

// =============================================================================
// Props
// =============================================================================

interface UserFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: User | null;
}

// =============================================================================
// Valores padrão do formulário
// =============================================================================

function getDefaultValues(user?: User | null): UserFormValues {
    return {
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        person_type: user?.person_type || "F",
        creci: user?.creci || "",
        order: user?.order || 0,
        role_id: user?.role_id || 1,
        team_id: user?.team_id || null,
        notes: user?.notes || "",
        is_active: user?.is_active ?? true,
        show_on_website: user?.show_on_website ?? false,
        has_broker_page: user?.has_broker_page ?? false,
        username: user?.username || "",
        password: "",
        password_confirmation: "",
        work_period_1_start: user?.work_period_1_start || "",
        work_period_1_end: user?.work_period_1_end || "",
        work_period_2_start: user?.work_period_2_start || "",
        work_period_2_end: user?.work_period_2_end || "",
        website_name: user?.website_name || "",
        facebook_link: user?.facebook_link || "",
        instagram_link: user?.instagram_link || "",
        description: user?.description || "",
    };
}

// =============================================================================
// Componente
// =============================================================================

export function UserFormModal({
    open,
    onOpenChange,
    initialData,
}: UserFormModalProps) {
    const isEditing = !!initialData;
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser(initialData?.id || 0);

    const { data: roles, isLoading: isLoadingRoles } = useRoles();

    const form = useForm<UserFormValues>({
        // @ts-expect-error Zod effects type mismatch between schemas
        resolver: zodResolver(isEditing ? userFormSchema : createUserSchema),
        defaultValues: getDefaultValues(initialData),
    });

    // Reset do formulário quando o modal abre/fecha ou quando initialData muda
    useEffect(() => {
        if (open) {
            form.reset(getDefaultValues(initialData));
            setAvatarFile(null);
        }
    }, [open, initialData, form]);

    const onSubmit = async (values: UserFormValues) => {
        try {
            if (avatarFile) {
                values.avatar = avatarFile;
            }

            if (isEditing) {
                await updateMutation.mutateAsync(values);
                toast.success("Usuário atualizado com sucesso!");
            } else {
                await createMutation.mutateAsync(values);
                toast.success("Usuário criado com sucesso!");
            }

            onOpenChange(false);
        } catch (error: any) {
            if (error.response?.status === 422 && error.response.data?.errors) {
                const errors = error.response.data.errors;
                Object.keys(errors).forEach((key) => {
                    form.setError(key as any, {
                        type: "server",
                        message: errors[key][0],
                    });
                });
                toast.error("Por favor, verifique os campos destacados.");
            } else {
                toast.error(
                    error.response?.data?.message ||
                    "Ocorreu um erro ao salvar o usuário."
                );
            }
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl lg:max-w-4xl p-0 gap-0 max-h-[90vh] flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle>
                        {isEditing ? "Editar Usuário" : "Novo Usuário"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Atualize os dados do usuário abaixo."
                            : "Preencha os dados para cadastrar um novo usuário."}
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={form.handleSubmit(onSubmit as any)}
                    className="flex flex-col flex-1 overflow-hidden"
                >
                    <div className="flex-1 overflow-y-auto px-6">
                        <div className="space-y-8 pb-6">
                            {/* ========================================= */}
                            {/* Seção: Dados Principais e Contato         */}
                            {/* ========================================= */}
                            <section>
                                <h3 className="text-base font-semibold mb-4">
                                    Dados Principais e Contato
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-name">
                                            Nome Completo *
                                        </Label>
                                        <Input
                                            id="modal-name"
                                            {...form.register("name")}
                                        />
                                        {form.formState.errors.name && (
                                            <p className="text-sm text-red-500">
                                                {
                                                    form.formState.errors.name
                                                        .message
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="modal-email">
                                            Email *
                                        </Label>
                                        <Input
                                            id="modal-email"
                                            type="email"
                                            {...form.register("email")}
                                        />
                                        {form.formState.errors.email && (
                                            <p className="text-sm text-red-500">
                                                {
                                                    form.formState.errors.email
                                                        .message
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="modal-phone">
                                            Telefone *
                                        </Label>
                                        <Input
                                            id="modal-phone"
                                            {...form.register("phone")}
                                        />
                                        {form.formState.errors.phone && (
                                            <p className="text-sm text-red-500">
                                                {
                                                    form.formState.errors.phone
                                                        .message
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="modal-person-type">
                                            Tipo de Pessoa *
                                        </Label>
                                        <Select
                                            onValueChange={(value) =>
                                                form.setValue(
                                                    "person_type",
                                                    value as "F" | "J"
                                                )
                                            }
                                            value={form.watch("person_type")}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="F">
                                                    Pessoa Física
                                                </SelectItem>
                                                <SelectItem value="J">
                                                    Pessoa Jurídica
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="modal-avatar">
                                            Imagem do Usuário
                                        </Label>
                                        <Input
                                            id="modal-avatar"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (
                                                    e.target.files &&
                                                    e.target.files.length > 0
                                                ) {
                                                    setAvatarFile(
                                                        e.target.files[0]
                                                    );
                                                }
                                            }}
                                        />
                                        {initialData?.avatar_url &&
                                            !avatarFile && (
                                                <div className="mt-2 text-sm text-muted-foreground pt-2 flex items-center gap-2">
                                                    <img
                                                        src={
                                                            initialData.avatar_url
                                                        }
                                                        alt="Avatar"
                                                        className="w-10 h-10 object-cover rounded-full"
                                                    />
                                                    <span>Imagem atual</span>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* ========================================= */}
                            {/* Seção: Profissional                       */}
                            {/* ========================================= */}
                            <section>
                                <h3 className="text-base font-semibold mb-4">
                                    Profissional
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-creci">
                                            CRECI
                                        </Label>
                                        <Input
                                            id="modal-creci"
                                            {...form.register("creci")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-order">
                                            Ordem *
                                        </Label>
                                        <Input
                                            id="modal-order"
                                            type="number"
                                            {...form.register("order")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-group">
                                            Grupo do Usuário *
                                        </Label>
                                        <Select
                                            onValueChange={(val) =>
                                                form.setValue(
                                                    "role_id",
                                                    Number(val)
                                                )
                                            }
                                            value={String(
                                                form.watch("role_id")
                                            )}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={isLoadingRoles ? "Carregando grupos..." : "Selecione o grupo"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roles?.map((role) => (
                                                    <SelectItem key={role.id} value={String(role.id)}>
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                                {roles?.length === 0 && (
                                                    <SelectItem value="0" disabled>Nenhum grupo encontrado</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-team">
                                            Equipe do Usuário
                                        </Label>
                                        <Select
                                            onValueChange={(val) =>
                                                form.setValue(
                                                    "team_id",
                                                    Number(val)
                                                )
                                            }
                                            value={
                                                form.watch("team_id")
                                                    ? String(
                                                        form.watch("team_id")
                                                    )
                                                    : undefined
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a equipe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {/* Placeholder para integração real */}
                                                <SelectItem value="1">
                                                    Vendas Sul
                                                </SelectItem>
                                                <SelectItem value="2">
                                                    Locação Norte
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="modal-notes">
                                            Observações
                                        </Label>
                                        <Textarea
                                            id="modal-notes"
                                            {...form.register("notes")}
                                            className="h-24"
                                        />
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* ========================================= */}
                            {/* Seção: Visibilidade e Acesso Geral        */}
                            {/* ========================================= */}
                            <section>
                                <h3 className="text-base font-semibold mb-4">
                                    Visibilidade e Acesso Geral
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">
                                                Usuário Ativo
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Define se o usuário pode acessar
                                                o sistema.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={form.watch("is_active")}
                                            onCheckedChange={(val) =>
                                                form.setValue("is_active", val)
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">
                                                Mostrar no Site
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Exibir perfil deste usuário na
                                                listagem do site de clientes.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={form.watch(
                                                "show_on_website"
                                            )}
                                            onCheckedChange={(val) =>
                                                form.setValue(
                                                    "show_on_website",
                                                    val
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">
                                                Página do Corretor
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Habilita uma página pública
                                                exclusiva com as captações deste
                                                corretor.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={form.watch(
                                                "has_broker_page"
                                            )}
                                            onCheckedChange={(val) =>
                                                form.setValue(
                                                    "has_broker_page",
                                                    val
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* ========================================= */}
                            {/* Seção: Credenciais                        */}
                            {/* ========================================= */}
                            <section>
                                <h3 className="text-base font-semibold mb-4">
                                    Credenciais
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="modal-username">
                                            Login / Usuário *
                                        </Label>
                                        <Input
                                            id="modal-username"
                                            {...form.register("username")}
                                        />
                                        {form.formState.errors.username && (
                                            <p className="text-sm text-red-500">
                                                {
                                                    form.formState.errors
                                                        .username.message
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-password">
                                            Senha{" "}
                                            {isEditing
                                                ? "(Apenas se quiser alterar)"
                                                : "*"}
                                        </Label>
                                        <Input
                                            id="modal-password"
                                            type="password"
                                            {...form.register("password")}
                                        />
                                        {form.formState.errors.password && (
                                            <p className="text-sm text-red-500">
                                                {
                                                    form.formState.errors
                                                        .password.message
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-password-confirm">
                                            Repita a Senha
                                        </Label>
                                        <Input
                                            id="modal-password-confirm"
                                            type="password"
                                            {...form.register(
                                                "password_confirmation"
                                            )}
                                        />
                                        {form.formState.errors
                                            .password_confirmation && (
                                                <p className="text-sm text-red-500">
                                                    {
                                                        form.formState.errors
                                                            .password_confirmation
                                                            .message
                                                    }
                                                </p>
                                            )}
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* ========================================= */}
                            {/* Seção: Horários de Acesso                 */}
                            {/* ========================================= */}
                            <section>
                                <h3 className="text-base font-semibold mb-4">
                                    Horários de Acesso
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    <div className="space-y-4 border p-4 rounded-md">
                                        <h4 className="font-semibold text-sm">
                                            1º Período
                                        </h4>
                                        <div className="space-y-2">
                                            <Label htmlFor="modal-wp1-start">
                                                Entrada
                                            </Label>
                                            <Input
                                                id="modal-wp1-start"
                                                type="time"
                                                {...form.register(
                                                    "work_period_1_start"
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="modal-wp1-end">
                                                Saída
                                            </Label>
                                            <Input
                                                id="modal-wp1-end"
                                                type="time"
                                                {...form.register(
                                                    "work_period_1_end"
                                                )}
                                            />
                                            {form.formState.errors
                                                .work_period_1_end && (
                                                    <p className="text-sm text-red-500">
                                                        {
                                                            form.formState.errors
                                                                .work_period_1_end
                                                                .message
                                                        }
                                                    </p>
                                                )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 border p-4 rounded-md">
                                        <h4 className="font-semibold text-sm">
                                            2º Período
                                        </h4>
                                        <div className="space-y-2">
                                            <Label htmlFor="modal-wp2-start">
                                                Entrada
                                            </Label>
                                            <Input
                                                id="modal-wp2-start"
                                                type="time"
                                                {...form.register(
                                                    "work_period_2_start"
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="modal-wp2-end">
                                                Saída
                                            </Label>
                                            <Input
                                                id="modal-wp2-end"
                                                type="time"
                                                {...form.register(
                                                    "work_period_2_end"
                                                )}
                                            />
                                            {form.formState.errors
                                                .work_period_2_end && (
                                                    <p className="text-sm text-red-500">
                                                        {
                                                            form.formState.errors
                                                                .work_period_2_end
                                                                .message
                                                        }
                                                    </p>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* ========================================= */}
                            {/* Seção: Configurações para o Site           */}
                            {/* ========================================= */}
                            <section>
                                <h3 className="text-base font-semibold mb-4">
                                    Configurações para o Site
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="modal-website-name">
                                            Nome Exibido no Site
                                        </Label>
                                        <Input
                                            id="modal-website-name"
                                            {...form.register("website_name")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-facebook">
                                            Link do Facebook
                                        </Label>
                                        <Input
                                            id="modal-facebook"
                                            placeholder="https://facebook.com/..."
                                            {...form.register("facebook_link")}
                                        />
                                        {form.formState.errors
                                            .facebook_link && (
                                                <p className="text-sm text-red-500">
                                                    {
                                                        form.formState.errors
                                                            .facebook_link.message
                                                    }
                                                </p>
                                            )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-instagram">
                                            Link do Instagram
                                        </Label>
                                        <Input
                                            id="modal-instagram"
                                            placeholder="https://instagram.com/..."
                                            {...form.register(
                                                "instagram_link"
                                            )}
                                        />
                                        {form.formState.errors
                                            .instagram_link && (
                                                <p className="text-sm text-red-500">
                                                    {
                                                        form.formState.errors
                                                            .instagram_link.message
                                                    }
                                                </p>
                                            )}
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="modal-description">
                                            Descrição para o Site
                                        </Label>
                                        <Textarea
                                            id="modal-description"
                                            className="h-32"
                                            {...form.register("description")}
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading
                                ? "Salvando..."
                                : isEditing
                                    ? "Salvar Alterações"
                                    : "Criar Usuário"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
