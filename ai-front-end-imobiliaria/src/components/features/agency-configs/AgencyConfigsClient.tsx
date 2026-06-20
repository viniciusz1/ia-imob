"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Database, Edit, Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
    useAgencyConfigs,
    useCreateAgencyConfig,
    useCreateAgencyExtractor,
    useDeleteAgencyConfig,
    useDeleteAgencyExtractor,
    useUpdateAgencyConfig,
    useUpdateAgencyExtractor,
} from "@/hooks/useAgencyConfigs";
import { usePermission } from "@/hooks/usePermission";
import type {
    AgencyConfig,
    AgencyFieldExtractor,
    AgencyFieldExtractorPayload,
    AgencyPayload,
    AgencyType,
    ExtractorOutputType,
    ExtractorSourceType,
    SitemapAgencyPayload,
    WsmAgencyPayload,
} from "@/types/agencyConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";


const FIELD_NAMES = [
    "tipo", "valor", "bairro", "cidade", "link_imovel", "imagem", "descricao",
    "quartos", "suites", "banheiros", "vagas", "area", "aceita_permuta",
    "financiamento", "piscina", "churrasqueira", "academia", "salao_festas",
    "playground", "sacada", "mobiliado", "ar_condicionado", "lavanderia",
    "escritorio", "closet", "elevador", "portaria_24h", "andar",
    "posicao_solar", "ano_construcao",
];

const SOURCE_TYPES: ExtractorSourceType[] = ["xpath", "css", "og", "jsonld", "literal"];
const OUTPUT_TYPES: ExtractorOutputType[] = ["text", "number", "boolean", "image_url", "link_url"];

type AgencyFormState = {
    name: string;
    domain: string;
    sitemap_url: string;
    allowed_url_patterns: string;
    url: string;
    url_pagination_template: string;
    total_pages_selector_type: ExtractorSourceType;
    total_pages_selector_value: string;
    total_pages_formula: string;
    cards_to_iterate_selector_type: ExtractorSourceType;
    cards_to_iterate_selector_value: string;
    is_active: boolean;
    expected_min_items: string;
};

type ExtractorFormState = {
    field_name: string;
    priority: string;
    source_type: ExtractorSourceType;
    selector_value: string;
    selector_index: string;
    selector_params: string;
    selector_join: boolean;
    pipeline: string;
    output_type: ExtractorOutputType;
    is_optional: boolean;
};

const emptyAgencyForm: AgencyFormState = {
    name: "",
    domain: "",
    sitemap_url: "",
    allowed_url_patterns: "",
    url: "",
    url_pagination_template: "",
    total_pages_selector_type: "xpath",
    total_pages_selector_value: "",
    total_pages_formula: "",
    cards_to_iterate_selector_type: "xpath",
    cards_to_iterate_selector_value: "",
    is_active: true,
    expected_min_items: "",
};

const emptyExtractorForm: ExtractorFormState = {
    field_name: "tipo",
    priority: "1",
    source_type: "xpath",
    selector_value: "",
    selector_index: "",
    selector_params: "",
    selector_join: false,
    pipeline: "",
    output_type: "text",
    is_optional: false,
};

export function AgencyConfigsClient() {
    const router = useRouter();
    const canRefineExtractors = usePermission("agency_configs.refine");
    const { data, isLoading, error } = useAgencyConfigs();
    const createAgency = useCreateAgencyConfig();
    const updateAgency = useUpdateAgencyConfig();
    const deleteAgency = useDeleteAgencyConfig();
    const createExtractor = useCreateAgencyExtractor();
    const updateExtractor = useUpdateAgencyExtractor();
    const deleteExtractor = useDeleteAgencyExtractor();

    const [activeType, setActiveType] = useState<AgencyType>("sitemap");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [agencyModalOpen, setAgencyModalOpen] = useState(false);
    const [agencyModalType, setAgencyModalType] = useState<AgencyType>("sitemap");
    const [editingAgency, setEditingAgency] = useState<AgencyConfig | null>(null);
    const [agencyForm, setAgencyForm] = useState<AgencyFormState>(emptyAgencyForm);
    const [extractorModalOpen, setExtractorModalOpen] = useState(false);
    const [editingExtractor, setEditingExtractor] = useState<AgencyFieldExtractor | null>(null);
    const [extractorForm, setExtractorForm] = useState<ExtractorFormState>(emptyExtractorForm);

    const agencies = useMemo(() => {
        if (!data) return [];
        return activeType === "sitemap" ? data.sitemap_agencies : data.wsm_agencies;
    }, [activeType, data]);

    const selectedAgency = agencies.find((agency) => agency.id === selectedId) ?? agencies[0] ?? null;

    const openCreateAgency = (type: AgencyType) => {
        setAgencyModalType(type);
        setEditingAgency(null);
        setAgencyForm(emptyAgencyForm);
        setAgencyModalOpen(true);
    };

    const openEditAgency = (agency: AgencyConfig) => {
        setAgencyModalType(agency.agency_type);
        setEditingAgency(agency);
        setAgencyForm(formFromAgency(agency));
        setAgencyModalOpen(true);
    };

    const submitAgency = async () => {
        try {
            const payload = agencyPayloadFromForm(agencyModalType, agencyForm);
            if (editingAgency) {
                await updateAgency.mutateAsync({
                    agencyType: editingAgency.agency_type,
                    agencyId: editingAgency.id,
                    payload,
                });
                toast.success("Agência atualizada.");
            } else {
                const created = await createAgency.mutateAsync({ agencyType: agencyModalType, payload });
                setActiveType(agencyModalType);
                setSelectedId(created.id);
                toast.success("Agência criada.");
            }
            setAgencyModalOpen(false);
        } catch (err: unknown) {
            toast.error(errorMessage(err, "Erro ao salvar agência."));
        }
    };

    const removeAgency = async (agency: AgencyConfig) => {
        if (!confirm(`Remover agência "${agency.name}" e todos os extractors?`)) return;
        try {
            await deleteAgency.mutateAsync({ agencyType: agency.agency_type, agencyId: agency.id });
            setSelectedId(null);
            toast.success("Agência removida.");
        } catch (err: unknown) {
            toast.error(errorMessage(err, "Erro ao remover agência."));
        }
    };

    const toggleAgencyStatus = async () => {
        if (!selectedAgency) return;
        try {
            const payload = agencyPayloadFromConfig(selectedAgency);
            await updateAgency.mutateAsync({
                agencyType: selectedAgency.agency_type,
                agencyId: selectedAgency.id,
                payload: { ...payload, is_active: !selectedAgency.is_active },
            });
            toast.success(selectedAgency.is_active ? "Agência desativada." : "Agência ativada.");
        } catch (err: unknown) {
            toast.error(errorMessage(err, "Erro ao alterar status da agência."));
        }
    };

    const openCreateExtractor = () => {
        setEditingExtractor(null);
        setExtractorForm(emptyExtractorForm);
        setExtractorModalOpen(true);
    };

    const openEditExtractor = (extractor: AgencyFieldExtractor) => {
        setEditingExtractor(extractor);
        setExtractorForm(formFromExtractor(extractor));
        setExtractorModalOpen(true);
    };

    const submitExtractor = async () => {
        if (!selectedAgency && !editingExtractor) return;

        try {
            const payload = extractorPayloadFromForm(extractorForm);
            if (editingExtractor) {
                await updateExtractor.mutateAsync({ extractorId: editingExtractor.id, payload });
                toast.success("Extractor atualizado.");
            } else if (selectedAgency) {
                await createExtractor.mutateAsync({
                    agencyType: selectedAgency.agency_type,
                    agencyId: selectedAgency.id,
                    payload,
                });
                toast.success("Extractor criado.");
            }
            setExtractorModalOpen(false);
        } catch (err: unknown) {
            toast.error(errorMessage(err, "Erro ao salvar extractor."));
        }
    };

    const removeExtractor = async (extractor: AgencyFieldExtractor) => {
        if (!confirm(`Remover extractor "${extractor.field_name}"?`)) return;
        try {
            await deleteExtractor.mutateAsync(extractor.id);
            toast.success("Extractor removido.");
        } catch (err: unknown) {
            toast.error(errorMessage(err, "Erro ao remover extractor."));
        }
    };

    const openExtractorRefinement = () => {
        if (!selectedAgency) return;
        router.push(`/agencias-importadas/${selectedAgency.agency_type}/${selectedAgency.id}/verificar-extratores`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Database className="h-6 w-6" />
                        <h1 className="text-3xl font-bold tracking-tight">Agências importadas</h1>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Visualize e edite configurações DB-driven usadas pelos spiders.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openCreateAgency("sitemap")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Sitemap
                    </Button>
                    <Button onClick={() => openCreateAgency("wsm")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova WSM
                    </Button>
                </div>
            </div>

            <Tabs value={activeType} onValueChange={(value) => {
                setActiveType(value as AgencyType);
                setSelectedId(null);
            }}>
                <TabsList>
                    <TabsTrigger value="sitemap">Sitemap ({data?.sitemap_agencies.length ?? 0})</TabsTrigger>
                    <TabsTrigger value="wsm">WSM ({data?.wsm_agencies.length ?? 0})</TabsTrigger>
                </TabsList>
            </Tabs>

            {isLoading && <Card><CardContent>Carregando agências...</CardContent></Card>}
            {error && <Card><CardContent className="text-red-600">Erro ao carregar agências.</CardContent></Card>}

            {!isLoading && !error && (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agências</CardTitle>
                            <CardDescription>
                                Selecione uma agência para ver e editar seus extractors.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Domínio</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Extractors</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {agencies.map((agency) => (
                                            <TableRow
                                                key={`${agency.agency_type}-${agency.id}`}
                                                className={selectedAgency?.id === agency.id ? "bg-muted/60" : ""}
                                                onClick={() => setSelectedId(agency.id)}
                                            >
                                                <TableCell className="font-medium">{agency.name}</TableCell>
                                                <TableCell>{agency.domain || "-"}</TableCell>
                                                <TableCell>
                                                    <Badge variant={agency.is_active ? "default" : "secondary"}>
                                                        {agency.is_active ? "Ativa" : "Inativa"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{agency.extractors.length}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="outline" onClick={(event) => {
                                                            event.stopPropagation();
                                                            openEditAgency(agency);
                                                        }}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={(event) => {
                                                            event.stopPropagation();
                                                            removeAgency(agency);
                                                        }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {agencies.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                    Nenhuma agência {activeType.toUpperCase()} cadastrada.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <CardTitle>Extractors</CardTitle>
                                    <CardDescription>
                                        {selectedAgency ? selectedAgency.name : "Selecione uma agência"}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    {canRefineExtractors && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={!selectedAgency}
                                            onClick={openExtractorRefinement}
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            Verificar extratores
                                        </Button>
                                    )}
                                    {selectedAgency && (
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id="agency-status"
                                                size="sm"
                                                checked={selectedAgency.is_active}
                                                onCheckedChange={toggleAgencyStatus}
                                                disabled={updateAgency.isPending}
                                            />
                                            <Label htmlFor="agency-status" className="text-sm text-muted-foreground">
                                                {selectedAgency.is_active ? "Ativa" : "Inativa"}
                                            </Label>
                                        </div>
                                    )}
                                    <Button size="sm" disabled={!selectedAgency} onClick={openCreateExtractor}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Novo
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Campo</TableHead>
                                            <TableHead>Fonte</TableHead>
                                            <TableHead>Output</TableHead>
                                            <TableHead>Opcional</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(selectedAgency?.extractors ?? []).map((extractor) => (
                                            <TableRow key={extractor.id}>
                                                <TableCell>
                                                    <div className="font-medium">{extractor.field_name}</div>
                                                    <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                                                        {extractor.selector_value}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{extractor.source_type}</TableCell>
                                                <TableCell>{extractor.output_type}</TableCell>
                                                <TableCell>{extractor.is_optional ? "Sim" : "Não"}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => openEditExtractor(extractor)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => removeExtractor(extractor)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!selectedAgency || selectedAgency.extractors.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                    Nenhum extractor cadastrado.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <AgencyDialog
                open={agencyModalOpen}
                agencyType={agencyModalType}
                editingAgency={editingAgency}
                form={agencyForm}
                setForm={setAgencyForm}
                onOpenChange={setAgencyModalOpen}
                onSubmit={submitAgency}
                isPending={createAgency.isPending || updateAgency.isPending}
            />

            <ExtractorDialog
                open={extractorModalOpen}
                editingExtractor={editingExtractor}
                form={extractorForm}
                setForm={setExtractorForm}
                onOpenChange={setExtractorModalOpen}
                onSubmit={submitExtractor}
                isPending={createExtractor.isPending || updateExtractor.isPending}
            />

        </div>
    );
}

function AgencyDialog({
    open,
    agencyType,
    editingAgency,
    form,
    setForm,
    onOpenChange,
    onSubmit,
    isPending,
}: {
    open: boolean;
    agencyType: AgencyType;
    editingAgency: AgencyConfig | null;
    form: AgencyFormState;
    setForm: (form: AgencyFormState) => void;
    onOpenChange: (open: boolean) => void;
    onSubmit: () => void;
    isPending: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{editingAgency ? "Editar agência" : `Nova agência ${agencyType.toUpperCase()}`}</DialogTitle>
                    <DialogDescription>Configuração usada pelo spider DB-driven.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nome">
                        <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                    </Field>
                    <Field label="Domínio">
                        <Input value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value })} />
                    </Field>

                    {agencyType === "sitemap" ? (
                        <>
                            <Field label="Sitemap URL">
                                <Input value={form.sitemap_url} onChange={(event) => setForm({ ...form, sitemap_url: event.target.value })} />
                            </Field>
                            <Field label="Allowed URL patterns">
                                <Input value={form.allowed_url_patterns} onChange={(event) => setForm({ ...form, allowed_url_patterns: event.target.value })} />
                            </Field>
                        </>
                    ) : (
                        <>
                            <Field label="URL inicial">
                                <Input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} />
                            </Field>
                            <Field label="Template paginação">
                                <Input value={form.url_pagination_template} onChange={(event) => setForm({ ...form, url_pagination_template: event.target.value })} />
                            </Field>
                            <Field label="Tipo selector total páginas">
                                <SimpleSelect value={form.total_pages_selector_type} values={["xpath", "css", "literal"]} onChange={(value) => setForm({ ...form, total_pages_selector_type: value as ExtractorSourceType })} />
                            </Field>
                            <Field label="Selector total páginas">
                                <Input value={form.total_pages_selector_value} onChange={(event) => setForm({ ...form, total_pages_selector_value: event.target.value })} />
                            </Field>
                            <Field label="Fórmula total páginas">
                                <Input value={form.total_pages_formula} onChange={(event) => setForm({ ...form, total_pages_formula: event.target.value })} />
                            </Field>
                            <Field label="Tipo selector cards">
                                <SimpleSelect value={form.cards_to_iterate_selector_type} values={["xpath", "css"]} onChange={(value) => setForm({ ...form, cards_to_iterate_selector_type: value as ExtractorSourceType })} />
                            </Field>
                            <Field label="Selector cards">
                                <Input value={form.cards_to_iterate_selector_value} onChange={(event) => setForm({ ...form, cards_to_iterate_selector_value: event.target.value })} />
                            </Field>
                        </>
                    )}

                    <Field label="Expected min items">
                        <Input type="number" value={form.expected_min_items} onChange={(event) => setForm({ ...form, expected_min_items: event.target.value })} />
                    </Field>
                    <div className="flex items-center gap-3 pt-6">
                        <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
                        <Label>Ativa</Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={onSubmit} disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ExtractorDialog({
    open,
    editingExtractor,
    form,
    setForm,
    onOpenChange,
    onSubmit,
    isPending,
}: {
    open: boolean;
    editingExtractor: AgencyFieldExtractor | null;
    form: ExtractorFormState;
    setForm: (form: ExtractorFormState) => void;
    onOpenChange: (open: boolean) => void;
    onSubmit: () => void;
    isPending: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{editingExtractor ? "Editar extractor" : "Novo extractor"}</DialogTitle>
                    <DialogDescription>Regra usada para extrair um campo do imóvel.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Campo">
                        <SimpleSelect value={form.field_name} values={FIELD_NAMES} onChange={(value) => setForm({ ...form, field_name: value })} />
                    </Field>
                    <Field label="Prioridade">
                        <Input type="number" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} />
                    </Field>
                    <Field label="Source type">
                        <SimpleSelect value={form.source_type} values={SOURCE_TYPES} onChange={(value) => setForm({ ...form, source_type: value as ExtractorSourceType })} />
                    </Field>
                    <Field label="Output type">
                        <SimpleSelect value={form.output_type} values={OUTPUT_TYPES} onChange={(value) => setForm({ ...form, output_type: value as ExtractorOutputType })} />
                    </Field>
                    <Field label="Selector index">
                        <Input type="number" value={form.selector_index} onChange={(event) => setForm({ ...form, selector_index: event.target.value })} />
                    </Field>
                    <Field label="Pipeline">
                        <Input value={form.pipeline} onChange={(event) => setForm({ ...form, pipeline: event.target.value })} />
                    </Field>
                    <div className="md:col-span-2">
                        <Field label="Selector value">
                            <Textarea value={form.selector_value} onChange={(event) => setForm({ ...form, selector_value: event.target.value })} />
                        </Field>
                    </div>
                    <div className="md:col-span-2">
                        <Field label="Selector params JSON">
                            <Textarea value={form.selector_params} onChange={(event) => setForm({ ...form, selector_params: event.target.value })} placeholder='{"name":"Piscina"}' />
                        </Field>
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch checked={form.selector_join} onCheckedChange={(checked) => setForm({ ...form, selector_join: checked })} />
                        <Label>Join resultados</Label>
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch checked={form.is_optional} onCheckedChange={(checked) => setForm({ ...form, is_optional: checked })} />
                        <Label>Opcional</Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={onSubmit} disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function SimpleSelect({ value, values, onChange }: { value: string; values: string[]; onChange: (value: string) => void }) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {values.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function formFromAgency(agency: AgencyConfig): AgencyFormState {
    return {
        ...emptyAgencyForm,
        name: agency.name,
        domain: agency.domain ?? "",
        is_active: agency.is_active,
        expected_min_items: agency.expected_min_items?.toString() ?? "",
        ...(agency.agency_type === "sitemap"
            ? {
                sitemap_url: agency.sitemap_url,
                allowed_url_patterns: agency.allowed_url_patterns ?? "",
            }
            : {
                url: agency.url,
                url_pagination_template: agency.url_pagination_template,
                total_pages_selector_type: agency.total_pages_selector_type,
                total_pages_selector_value: agency.total_pages_selector_value,
                total_pages_formula: agency.total_pages_formula ?? "",
                cards_to_iterate_selector_type: agency.cards_to_iterate_selector_type,
                cards_to_iterate_selector_value: agency.cards_to_iterate_selector_value,
            }),
    };
}

function agencyPayloadFromConfig(agency: AgencyConfig): AgencyPayload {
    const common = {
        name: agency.name,
        domain: agency.domain,
        is_active: agency.is_active,
        expected_min_items: agency.expected_min_items,
    };

    if (agency.agency_type === "sitemap") {
        return {
            ...common,
            domain: agency.domain,
            sitemap_url: agency.sitemap_url,
            allowed_url_patterns: agency.allowed_url_patterns,
        } satisfies SitemapAgencyPayload;
    }

    return {
        ...common,
        url: agency.url,
        url_pagination_template: agency.url_pagination_template,
        total_pages_selector_type: agency.total_pages_selector_type,
        total_pages_selector_value: agency.total_pages_selector_value,
        total_pages_formula: agency.total_pages_formula,
        cards_to_iterate_selector_type: agency.cards_to_iterate_selector_type,
        cards_to_iterate_selector_value: agency.cards_to_iterate_selector_value,
    } satisfies WsmAgencyPayload;
}

function agencyPayloadFromForm(agencyType: AgencyType, form: AgencyFormState): AgencyPayload {
    const common = {
        name: form.name,
        domain: nullable(form.domain),
        is_active: form.is_active,
        expected_min_items: nullableNumber(form.expected_min_items),
    };

    if (agencyType === "sitemap") {
        return {
            ...common,
            domain: form.domain,
            sitemap_url: form.sitemap_url,
            allowed_url_patterns: nullable(form.allowed_url_patterns),
        } satisfies SitemapAgencyPayload;
    }

    return {
        ...common,
        url: form.url,
        url_pagination_template: form.url_pagination_template,
        total_pages_selector_type: form.total_pages_selector_type,
        total_pages_selector_value: form.total_pages_selector_value,
        total_pages_formula: nullable(form.total_pages_formula),
        cards_to_iterate_selector_type: form.cards_to_iterate_selector_type,
        cards_to_iterate_selector_value: form.cards_to_iterate_selector_value,
    } satisfies WsmAgencyPayload;
}

function formFromExtractor(extractor: AgencyFieldExtractor): ExtractorFormState {
    return {
        field_name: extractor.field_name,
        priority: extractor.priority.toString(),
        source_type: extractor.source_type,
        selector_value: extractor.selector_value,
        selector_index: extractor.selector_index?.toString() ?? "",
        selector_params: extractor.selector_params ? JSON.stringify(extractor.selector_params, null, 2) : "",
        selector_join: extractor.selector_join,
        pipeline: extractor.pipeline ?? "",
        output_type: extractor.output_type,
        is_optional: extractor.is_optional,
    };
}

function extractorPayloadFromForm(form: ExtractorFormState): AgencyFieldExtractorPayload {
    return {
        field_name: form.field_name,
        priority: Number(form.priority) || 1,
        source_type: form.source_type,
        selector_value: form.selector_value,
        selector_index: nullableNumber(form.selector_index),
        selector_params: parseJsonObject(form.selector_params),
        selector_join: form.selector_join,
        pipeline: nullable(form.pipeline),
        output_type: form.output_type,
        is_optional: form.is_optional,
    };
}

function nullable(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function nullableNumber(value: string): number | null {
    const trimmed = value.trim();
    return trimmed.length ? Number(trimmed) : null;
}

function parseJsonObject(value: string): Record<string, unknown> | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = JSON.parse(trimmed);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error("selector_params must be a JSON object.");
    }
    return parsed as Record<string, unknown>;
}

function errorMessage(error: unknown, fallback: string): string {
    if (
        error
        && typeof error === "object"
        && "response" in error
        && typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === "string"
    ) {
        return (error as { response: { data: { message: string } } }).response.data.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return fallback;
}
