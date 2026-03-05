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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

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
                                ) : availablePermissions?.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Nenhuma permissão encontrada.</p>
                                ) : (
                                    <ScrollArea className="h-[350px] rounded-md border p-4 bg-background">
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
                                                    <div className="flex items-center space-x-3 mb-4 p-3 bg-secondary/30 rounded-md border border-border">
                                                        <Checkbox
                                                            id="select-all-system"
                                                            checked={isAllSystemSelected}
                                                            onCheckedChange={handleToggleAllSystem}
                                                        />
                                                        <Label htmlFor="select-all-system" className="text-sm font-semibold cursor-pointer text-primary">
                                                            Selecionar Todas as Permissões do Sistema
                                                        </Label>
                                                    </div>
                                                );
                                            }}
                                        />

                                        <Accordion type="multiple" className="w-full">
                                            {groupedPermissions.map(({ groupName, permissions }) => (
                                                <AccordionItem key={groupName} value={groupName} className="border-b-0 mb-3 border rounded-md relative bg-card shadow-sm pl-10 pr-1">
                                                    
                                                    {/* Checkbox na esquerda (absoluto) */}
                                                    <div className="absolute left-3 top-0 bottom-0 flex items-center h-12 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                                        <Controller
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
                                                                    <div className="flex items-center">
                                                                        <Checkbox
                                                                            id={`select-group-${groupName}`}
                                                                            checked={isAllGroupSelected}
                                                                            onCheckedChange={handleToggleGroup}
                                                                            className="w-5 h-5 rounded-[4px]"
                                                                        />
                                                                    </div>
                                                                );
                                                            }}
                                                        />
                                                    </div>

                                                    <AccordionTrigger className="hover:no-underline py-3.5 text-sm font-semibold text-left transition-colors hover:text-primary">
                                                        <span>
                                                            {groupName}
                                                            <span className="text-xs font-normal text-muted-foreground ml-2">({permissions.length})</span>
                                                        </span>
                                                    </AccordionTrigger>
                                                    
                                                    <AccordionContent className="pb-4 pt-4 border-t border-border/50 mt-1 bg-muted/20 -ml-10 -mr-1 px-4">
                                                        <Controller
                                                            name="permissions"
                                                            control={form.control}
                                                            render={({ field }) => (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {permissions.map((permission) => {
                                                                        const isChecked = field.value?.includes(permission.id);
                                                                        return (
                                                                            <div className="flex items-start space-x-3 bg-background p-2.5 px-3 rounded-md border border-border/40 shadow-sm transition-colors hover:border-primary/50" key={permission.id}>
                                                                                <Checkbox
                                                                                    id={`permission-${permission.id}`}
                                                                                    checked={isChecked}
                                                                                    onCheckedChange={(checked) => {
                                                                                        const updatedPermissions = checked
                                                                                            ? [...(field.value || []), permission.id]
                                                                                            : field.value?.filter((val) => val !== permission.id);
                                                                                        field.onChange(updatedPermissions);
                                                                                    }}
                                                                                    className="mt-0.5"
                                                                                />
                                                                                <Label
                                                                                    htmlFor={`permission-${permission.id}`}
                                                                                    className="text-sm font-normal cursor-pointer leading-tight pt-0.5 flex-1"
                                                                                >
                                                                                    {permission.label ?? permission.name}
                                                                                </Label>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        />
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
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
