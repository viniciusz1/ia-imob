"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";

import { useCreateRole, useUpdateRole, usePermissions } from "@/hooks/useRoles";
import { roleFormSchema, RoleFormValues } from "@/schemas/roleSchema";
import type { Role } from "@/types/role";

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
                    "Ocorreu um erro ao salvar o grupo de usuários."
                );
            }
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md lg:max-w-2xl">
                <DialogHeader className="px-1">
                    <DialogTitle>
                        {isEditing ? "Editar Grupo de Usuários" : "Novo Grupo de Usuários"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Atualize o nome ou as permissões do grupo."
                            : "Crie um novo grupo de usuários e atribua as permissões necessárias."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4 px-1 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="modal-role-name">
                                Nome do Grupo *
                            </Label>
                            <Input
                                id="modal-role-name"
                                placeholder="ex: Administrador"
                                {...form.register("name")}
                            />
                            {form.formState.errors.name && (
                                <p className="text-sm text-red-500">
                                    {form.formState.errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Label>Permissões *</Label>
                            <div className="rounded-md border p-4">
                                {isLoadingPermissions ? (
                                    <p className="text-sm text-muted-foreground">Carregando permissões...</p>
                                ) : (
                                    <ScrollArea className="h-48 rounded-md">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {availablePermissions?.map((permission) => (
                                                <Controller
                                                    key={permission.id}
                                                    name="permissions"
                                                    control={form.control}
                                                    render={({ field }) => {
                                                        const isChecked = field.value?.includes(permission.id);
                                                        return (
                                                            <div className="flex items-start space-x-3">
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
                                                                    className="text-sm font-normal cursor-pointer leading-tight"
                                                                >
                                                                    {permission.name}
                                                                </Label>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                            ))}
                                            {availablePermissions?.length === 0 && (
                                                <p className="text-sm text-muted-foreground">
                                                    Nenhuma permissão encontrada.
                                                </p>
                                            )}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                            {form.formState.errors.permissions && (
                                <p className="text-sm text-red-500">
                                    {form.formState.errors.permissions.message}
                                </p>
                            )}
                        </div>
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
                            {isLoading
                                ? "Salvando..."
                                : isEditing
                                    ? "Salvar Alterações"
                                    : "Criar Grupo"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
