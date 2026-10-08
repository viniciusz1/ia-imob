"use client";

import { type FieldPath, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useState, useEffect, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
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
    UserFormInput,
    userFormSchema,
    UserFormValues,
} from "@/schemas/userSchema";
import { User } from "@/types/user";
import { useRoles } from "@/hooks/useRoles";
import { usePermission } from "@/hooks/usePermission";

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

    const canManageRoles = usePermission("roles.manage");
    const { data: roles, isLoading: isLoadingRoles } = useRoles(open && canManageRoles);

    const form = useForm<UserFormInput, unknown, UserFormValues>({
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
        } catch (error: unknown) {
            if (isAxiosError<{ errors?: Record<string, string[]>; message?: string }>(error)
                && error.response?.status === 422
                && error.response.data?.errors) {
                const errors = error.response.data.errors;
                Object.keys(errors).forEach((key) => {
                    form.setError(key as FieldPath<UserFormInput>, {
                        type: "server",
                        message: errors[key][0],
                    });
                });
                toast.error("Por favor, verifique os campos destacados.");
            } else {
                toast.error(
                    (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) ||
                    "Ocorreu um erro ao salvar o usuário."
                );
            }
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;
    const errors = form.formState.errors;

    const personType = form.watch("person_type");
    const roleId = form.watch("role_id");
    const teamId = form.watch("team_id");
    const isActive = form.watch("is_active");
    const showOnWebsite = form.watch("show_on_website");
    const hasBrokerPage = form.watch("has_broker_page");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl">
                <DialogHeader className="gap-1 border-b px-6 py-5 text-left">
                    <DialogTitle>
                        {isEditing ? "Editar usuário" : "Novo usuário"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Atualize os dados do usuário abaixo."
                            : "Preencha os dados para cadastrar um novo usuário."}
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-1 flex-col overflow-hidden"
                >
                    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                        {/* ========================================= */}
                        {/* Seção: Dados Principais e Contato         */}
                        {/* ========================================= */}
                        <section className="space-y-4">
                            <SectionTitle>Dados principais e contato</SectionTitle>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <FormField
                                    error={errors.name?.message}
                                    htmlFor="modal-name"
                                    label="Nome completo"
                                    required
                                >
                                    <Input
                                        id="modal-name"
                                        {...form.register("name")}
                                    />
                                </FormField>

                                <FormField
                                    error={errors.email?.message}
                                    htmlFor="modal-email"
                                    label="E-mail"
                                    required
                                >
                                    <Input
                                        id="modal-email"
                                        type="email"
                                        {...form.register("email")}
                                    />
                                </FormField>

                                <FormField
                                    error={errors.phone?.message}
                                    htmlFor="modal-phone"
                                    label="Telefone"
                                    required
                                >
                                    <Input
                                        id="modal-phone"
                                        {...form.register("phone")}
                                    />
                                </FormField>

                                <FormField
                                    htmlFor="modal-person-type"
                                    label="Tipo de pessoa"
                                    required
                                >
                                    <Select
                                        onValueChange={(value) =>
                                            form.setValue(
                                                "person_type",
                                                value as "F" | "J"
                                            )
                                        }
                                        value={personType}
                                    >
                                        <SelectTrigger className="w-full" id="modal-person-type">
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
                                </FormField>

                                <FormField
                                    className="sm:col-span-2"
                                    htmlFor="modal-avatar"
                                    label="Imagem do usuário"
                                >
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
                                    {initialData?.avatar_url && !avatarFile && (
                                        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                                            {/* A imagem vem da API com domínio variável; o next/image exigiria configurar cada host. */}
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={initialData.avatar_url}
                                                alt="Avatar"
                                                className="size-10 rounded-full object-cover"
                                            />
                                            <span>Imagem atual</span>
                                        </div>
                                    )}
                                </FormField>
                            </div>
                        </section>

                        <Separator />

                        {/* ========================================= */}
                        {/* Seção: Profissional                       */}
                        {/* ========================================= */}
                        <section className="space-y-4">
                            <SectionTitle>Profissional</SectionTitle>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <FormField htmlFor="modal-creci" label="CRECI">
                                    <Input
                                        id="modal-creci"
                                        {...form.register("creci")}
                                    />
                                </FormField>
                                <FormField
                                    error={errors.order?.message}
                                    htmlFor="modal-order"
                                    label="Ordem"
                                    required
                                >
                                    <Input
                                        id="modal-order"
                                        type="number"
                                        {...form.register("order")}
                                    />
                                </FormField>
                                <FormField
                                    error={errors.role_id?.message}
                                    htmlFor="modal-group"
                                    label="Grupo do Usuário"
                                    required
                                >
                                    <Select
                                        onValueChange={(val) =>
                                            form.setValue(
                                                "role_id",
                                                Number(val)
                                            )
                                        }
                                        value={String(roleId)}
                                    >
                                        <SelectTrigger className="w-full" id="modal-group">
                                            <SelectValue placeholder={isLoadingRoles ? "Carregando grupos..." : "Selecione o grupo"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles?.map((role) => (
                                                <SelectItem key={role.id} value={String(role.id)}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                            {roles?.length === 0 && (
                                                <SelectItem value="0" disabled>
                                                    Nenhum grupo encontrado
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </FormField>
                                <FormField htmlFor="modal-team" label="Equipe do usuário">
                                    <Select
                                        onValueChange={(val) =>
                                            form.setValue(
                                                "team_id",
                                                Number(val)
                                            )
                                        }
                                        value={teamId ? String(teamId) : undefined}
                                    >
                                        <SelectTrigger className="w-full" id="modal-team">
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
                                </FormField>
                                <FormField
                                    className="sm:col-span-2"
                                    htmlFor="modal-notes"
                                    label="Observações"
                                >
                                    <Textarea
                                        id="modal-notes"
                                        {...form.register("notes")}
                                        className="h-24"
                                    />
                                </FormField>
                            </div>
                        </section>

                        <Separator />

                        {/* ========================================= */}
                        {/* Seção: Visibilidade e Acesso Geral        */}
                        {/* ========================================= */}
                        <section className="space-y-4">
                            <SectionTitle>Visibilidade e acesso</SectionTitle>
                            <div className="grid gap-3">
                                <SwitchTile
                                    checked={isActive}
                                    description="Define se o usuário pode acessar o sistema."
                                    id="modal-is-active"
                                    label="Usuário ativo"
                                    onCheckedChange={(val) =>
                                        form.setValue("is_active", val)
                                    }
                                />
                                <SwitchTile
                                    checked={showOnWebsite}
                                    description="Exibir perfil deste usuário na listagem do site de clientes."
                                    id="modal-show-on-website"
                                    label="Mostrar no site"
                                    onCheckedChange={(val) =>
                                        form.setValue("show_on_website", val)
                                    }
                                />
                                <SwitchTile
                                    checked={hasBrokerPage}
                                    description="Habilita uma página pública exclusiva com as captações deste corretor."
                                    id="modal-has-broker-page"
                                    label="Página do corretor"
                                    onCheckedChange={(val) =>
                                        form.setValue("has_broker_page", val)
                                    }
                                />
                            </div>
                        </section>

                        <Separator />

                        {/* ========================================= */}
                        {/* Seção: Credenciais                        */}
                        {/* ========================================= */}
                        <section className="space-y-4">
                            <SectionTitle>Credenciais</SectionTitle>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <FormField
                                    className="sm:col-span-2"
                                    error={errors.username?.message}
                                    htmlFor="modal-username"
                                    label="Login / usuário"
                                    required
                                >
                                    <Input
                                        id="modal-username"
                                        {...form.register("username")}
                                    />
                                </FormField>
                                <FormField
                                    error={errors.password?.message}
                                    hint={isEditing ? "Preencha apenas se quiser alterar." : undefined}
                                    htmlFor="modal-password"
                                    label="Senha"
                                    required={!isEditing}
                                >
                                    <Input
                                        id="modal-password"
                                        type="password"
                                        {...form.register("password")}
                                    />
                                </FormField>
                                <FormField
                                    error={errors.password_confirmation?.message}
                                    htmlFor="modal-password-confirm"
                                    label="Repita a senha"
                                >
                                    <Input
                                        id="modal-password-confirm"
                                        type="password"
                                        {...form.register("password_confirmation")}
                                    />
                                </FormField>
                            </div>
                        </section>

                        <Separator />

                        {/* ========================================= */}
                        {/* Seção: Horários de Acesso                 */}
                        {/* ========================================= */}
                        <section className="space-y-4">
                            <SectionTitle>Horários de acesso</SectionTitle>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-4 rounded-lg border p-4">
                                    <p className="text-xs tracking-wide text-muted-foreground uppercase">
                                        1º período
                                    </p>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FormField htmlFor="modal-wp1-start" label="Entrada">
                                            <Input
                                                id="modal-wp1-start"
                                                type="time"
                                                {...form.register("work_period_1_start")}
                                            />
                                        </FormField>
                                        <FormField
                                            error={errors.work_period_1_end?.message}
                                            htmlFor="modal-wp1-end"
                                            label="Saída"
                                        >
                                            <Input
                                                id="modal-wp1-end"
                                                type="time"
                                                {...form.register("work_period_1_end")}
                                            />
                                        </FormField>
                                    </div>
                                </div>

                                <div className="space-y-4 rounded-lg border p-4">
                                    <p className="text-xs tracking-wide text-muted-foreground uppercase">
                                        2º período
                                    </p>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FormField htmlFor="modal-wp2-start" label="Entrada">
                                            <Input
                                                id="modal-wp2-start"
                                                type="time"
                                                {...form.register("work_period_2_start")}
                                            />
                                        </FormField>
                                        <FormField
                                            error={errors.work_period_2_end?.message}
                                            htmlFor="modal-wp2-end"
                                            label="Saída"
                                        >
                                            <Input
                                                id="modal-wp2-end"
                                                type="time"
                                                {...form.register("work_period_2_end")}
                                            />
                                        </FormField>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* ========================================= */}
                        {/* Seção: Configurações para o Site           */}
                        {/* ========================================= */}
                        <section className="space-y-4">
                            <SectionTitle>Configurações para o site</SectionTitle>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <FormField
                                    className="sm:col-span-2"
                                    htmlFor="modal-website-name"
                                    label="Nome exibido no site"
                                >
                                    <Input
                                        id="modal-website-name"
                                        {...form.register("website_name")}
                                    />
                                </FormField>
                                <FormField
                                    error={errors.facebook_link?.message}
                                    htmlFor="modal-facebook"
                                    label="Link do Facebook"
                                >
                                    <Input
                                        id="modal-facebook"
                                        placeholder="https://facebook.com/..."
                                        {...form.register("facebook_link")}
                                    />
                                </FormField>
                                <FormField
                                    error={errors.instagram_link?.message}
                                    htmlFor="modal-instagram"
                                    label="Link do Instagram"
                                >
                                    <Input
                                        id="modal-instagram"
                                        placeholder="https://instagram.com/..."
                                        {...form.register("instagram_link")}
                                    />
                                </FormField>
                                <FormField
                                    className="sm:col-span-2"
                                    htmlFor="modal-description"
                                    label="Descrição para o site"
                                >
                                    <Textarea
                                        id="modal-description"
                                        className="h-32"
                                        {...form.register("description")}
                                    />
                                </FormField>
                            </div>
                        </section>
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
                            {isLoading
                                ? "Salvando..."
                                : isEditing
                                    ? "Salvar alterações"
                                    : "Criar usuário"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// =============================================================================
// Subcomponentes de apresentação
// =============================================================================

function SectionTitle({ children }: { children: ReactNode }) {
    return <h3 className="text-base text-foreground">{children}</h3>;
}

interface SwitchTileProps {
    id: string;
    label: string;
    description: string;
    checked?: boolean;
    onCheckedChange: (checked: boolean) => void;
}

function SwitchTile({ id, label, description, checked, onCheckedChange }: SwitchTileProps) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
                <Label htmlFor={id}>{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch
                checked={checked}
                id={id}
                onCheckedChange={onCheckedChange}
            />
        </div>
    );
}
