"use client";

import { useForm, Controller, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect } from "react";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { useCreateRole, useUpdateRole, usePermissions } from "@/hooks/useRoles";
import { roleFormSchema, RoleFormValues } from "@/schemas/roleSchema";
import type { Role, Permission } from "@/types/role";

// =============================================================================
// Props
// =============================================================================

interface RoleFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: Role | null;
}

// =============================================================================
// Valores padrão do formulário
// =============================================================================

function getDefaultValues(role?: Role | null): RoleFormValues {
    return {
        name: role?.name || "",
        permissions: role?.permissions?.map((p) => p.id) || [],
    };
}

// =============================================================================
// Agrupamento de Permissões
// =============================================================================
const groupLabels: Record<string, string> = {
    users: "Usuários",
    properties: "Imóveis",
    roles: "Grupos e Permissões",
    leads: "Leads",
    system: "Sistema",
};

function getPermissionGroupName(permissionName: string): string {
    const parts = permissionName.split(".");
    const pfx = parts[0];
    return groupLabels[pfx] || pfx.charAt(0).toUpperCase() + pfx.slice(1);
}

// =============================================================================
// Componente
// =============================================================================

export function RoleFormModal({
    open,
    onOpenChange,
    initialData,
}: RoleFormModalProps) {
    const isEditing = !!initialData;

    const createMutation = useCreateRole();
    const updateMutation = useUpdateRole(initialData?.id || 0);

    // Fetch das permissões disponíveis para exibir como checkboxes
    const { data: availablePermissions, isLoading: isLoadingPermissions } = usePermissions();

    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleFormSchema),
        defaultValues: getDefaultValues(initialData),
    });

    // Reset do formulário quando o modal abre/fecha ou quando initialData muda
    useEffect(() => {
        if (open) {
            form.reset(getDefaultValues(initialData));
        }
    }, [open, initialData, form]);

    const onSubmit = async (values: RoleFormValues) => {
        try {
            if (isEditing) {
                await updateMutation.mutateAsync(values);
                toast.success("Grupo de usuários atualizado com sucesso!");
            } else {
                await createMutation.mutateAsync(values);
                toast.success("Grupo de usuários criado com sucesso!");
            }

            onOpenChange(false);
        } catch (error: unknown) {
            if (isAxiosError<{ errors?: Record<string, string[]>; message?: string }>(error)
                && error.response?.status === 422
                && error.response.data?.errors) {
                const errors = error.response.data.errors;
                Object.keys(errors).forEach((key) => {
                    form.setError(key as FieldPath<RoleFormValues>, {
                        type: "server",
                        message: errors[key][0],
                    });
                });
                toast.error("Por favor, verifique os campos destacados.");
            } else {
                toast.error(
                    (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) ||
                    "Ocorreu um erro ao salvar o grupo de usuários."
                );
            }
        }
    };

    // Agrupar permissões por prefixo
    const groupedPermissions = Object.values(
        (availablePermissions || []).reduce((acc: Record<string, Permission[]>, perm) => {
            const groupName = getPermissionGroupName(perm.name);
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(perm);
            return acc;
        }, {})
    ).map((perms) => ({
        groupName: getPermissionGroupName(perms[0].name),
        permissions: perms,
    }));

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl">
                <DialogHeader className="gap-1 border-b px-6 py-5 text-left">
                    <DialogTitle>
                        {isEditing ? "Editar grupo de usuários" : "Novo grupo de usuários"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Atualize o nome ou as permissões do grupo."
                            : "Crie um novo grupo de usuários e atribua as permissões necessárias."}
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-1 flex-col overflow-hidden"
                >
                    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                        <FormField
                            error={form.formState.errors.name?.message}
                            htmlFor="modal-role-name"
                            label="Nome do Grupo"
                            required
                        >
                            <Input
                                id="modal-role-name"
                                placeholder="ex: Administrador"
                                {...form.register("name")}
                            />
                        </FormField>

                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm text-foreground">
                                    Permissões <span className="text-destructive">*</span>
                                </p>
                                {availablePermissions && availablePermissions.length > 0 && (
                                    <Controller
                                        name="permissions"
                                        control={form.control}
                                        render={({ field }) => (
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {field.value?.length ?? 0} de {availablePermissions.length} selecionadas
                                            </span>
                                        )}
                                    />
                                )}
                            </div>

                            {isLoadingPermissions ? (
                                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                                    Carregando permissões...
                                </p>
                            ) : availablePermissions?.length === 0 ? (
                                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                                    Nenhuma permissão encontrada.
                                </p>
                            ) : (
                                <>
                                    <Controller
                                        name="permissions"
                                        control={form.control}
                                        render={({ field }) => {
                                            const allPermissionIds = availablePermissions?.map(p => p.id) || [];
                                            const isAllSystemSelected = allPermissionIds.every(id => field.value?.includes(id)) && allPermissionIds.length > 0;

                                            const handleToggleAllSystem = (checked: boolean) => {
                                                field.onChange(checked ? allPermissionIds : []);
                                            };

                                            return (
                                                <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                                                    <Checkbox
                                                        id="select-all-system"
                                                        checked={isAllSystemSelected}
                                                        onCheckedChange={handleToggleAllSystem}
                                                    />
                                                    <Label htmlFor="select-all-system" className="cursor-pointer text-primary">
                                                        Selecionar todas as permissões do sistema
                                                    </Label>
                                                </div>
                                            );
                                        }}
                                    />

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {groupedPermissions.map(({ groupName, permissions }) => (
                                            <Controller
                                                key={groupName}
                                                name="permissions"
                                                control={form.control}
                                                render={({ field }) => {
                                                    const groupIds = permissions.map(p => p.id);
                                                    const selectedInGroup = groupIds.filter(id => field.value?.includes(id));
                                                    const isAllGroupSelected = selectedInGroup.length === permissions.length && permissions.length > 0;

                                                    const handleToggleGroup = (checked: boolean) => {
                                                        const currentValues = new Set(field.value || []);
                                                        if (checked) {
                                                            groupIds.forEach(id => currentValues.add(id));
                                                        } else {
                                                            groupIds.forEach(id => currentValues.delete(id));
                                                        }
                                                        field.onChange(Array.from(currentValues));
                                                    };

                                                    return (
                                                        <div aria-label={groupName} className="space-y-3 rounded-lg border p-4" role="group">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                                                                    {groupName}
                                                                </p>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-muted-foreground tabular-nums">
                                                                        {selectedInGroup.length}/{permissions.length}
                                                                    </span>
                                                                    <Checkbox
                                                                        aria-label={`Selecionar todas de ${groupName}`}
                                                                        id={`select-group-${groupName}`}
                                                                        checked={isAllGroupSelected}
                                                                        onCheckedChange={handleToggleGroup}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2.5 border-t pt-3">
                                                                {permissions.map((permission) => {
                                                                    const isChecked = field.value?.includes(permission.id);
                                                                    return (
                                                                        <div className="flex items-start gap-3" key={permission.id}>
                                                                            <Checkbox
                                                                                id={`permission-${permission.id}`}
                                                                                checked={isChecked}
                                                                                onCheckedChange={(checked) => {
                                                                                    const updatedPermissions = checked
                                                                                        ? [...(field.value || []), permission.id]
                                                                                        : field.value?.filter((val) => val !== permission.id);
                                                                                    field.onChange(updatedPermissions);
                                                                                }}
                                                                            />
                                                                            <Label
                                                                                htmlFor={`permission-${permission.id}`}
                                                                                className="flex-1 cursor-pointer leading-tight"
                                                                            >
                                                                                {permission.label ?? permission.name}
                                                                            </Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                            {form.formState.errors.permissions && (
                                <p className="text-xs text-destructive">
                                    {form.formState.errors.permissions.message}
                                </p>
                            )}
                        </div>
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
                                    : "Criar grupo"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
