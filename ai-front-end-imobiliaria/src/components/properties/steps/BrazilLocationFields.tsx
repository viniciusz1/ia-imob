"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const BRAZILIAN_STATES = [
    { uf: "AC", name: "Acre" },
    { uf: "AL", name: "Alagoas" },
    { uf: "AP", name: "Amapá" },
    { uf: "AM", name: "Amazonas" },
    { uf: "BA", name: "Bahia" },
    { uf: "CE", name: "Ceará" },
    { uf: "DF", name: "Distrito Federal" },
    { uf: "ES", name: "Espírito Santo" },
    { uf: "GO", name: "Goiás" },
    { uf: "MA", name: "Maranhão" },
    { uf: "MT", name: "Mato Grosso" },
    { uf: "MS", name: "Mato Grosso do Sul" },
    { uf: "MG", name: "Minas Gerais" },
    { uf: "PA", name: "Pará" },
    { uf: "PB", name: "Paraíba" },
    { uf: "PR", name: "Paraná" },
    { uf: "PE", name: "Pernambuco" },
    { uf: "PI", name: "Piauí" },
    { uf: "RJ", name: "Rio de Janeiro" },
    { uf: "RN", name: "Rio Grande do Norte" },
    { uf: "RS", name: "Rio Grande do Sul" },
    { uf: "RO", name: "Rondônia" },
    { uf: "RR", name: "Roraima" },
    { uf: "SC", name: "Santa Catarina" },
    { uf: "SP", name: "São Paulo" },
    { uf: "SE", name: "Sergipe" },
    { uf: "TO", name: "Tocantins" },
] as const;

interface StateSelectProps {
    id: string;
    value: string;
    onValueChange: (uf: string) => void;
    invalid?: boolean;
}

/** UF picker with the 27 Brazilian states. */
export function StateSelect({ id, value, onValueChange, invalid }: StateSelectProps) {
    const normalized = value.toUpperCase();

    return (
        <Select onValueChange={onValueChange} value={normalized || undefined}>
            <SelectTrigger aria-invalid={invalid || undefined} className="w-full" id={id}>
                <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
                {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state.uf} value={state.uf}>
                        <span className="font-semibold tabular-nums">{state.uf}</span>
                        <span className="text-muted-foreground">{state.name}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

interface IbgeMunicipality {
    nome: string;
}

async function fetchMunicipalities(uf: string): Promise<string[]> {
    const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`,
    );
    if (!response.ok) throw new Error(`IBGE ${response.status}`);
    const data: IbgeMunicipality[] = await response.json();
    return data.map((municipality) => municipality.nome);
}

function normalizeName(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLocaleLowerCase("pt-BR")
        .trim();
}

interface CityComboboxProps {
    id: string;
    uf: string;
    value: string;
    onValueChange: (city: string) => void;
    invalid?: boolean;
}

/**
 * City picker fed by the IBGE municipalities of the chosen UF (cached per UF).
 * If IBGE can't be reached the field falls back to free text, so the form is
 * never blocked by the external service.
 */
export function CityCombobox({ id, uf, value, onValueChange, invalid }: CityComboboxProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const normalizedUf = uf.toUpperCase();
    const hasUf = BRAZILIAN_STATES.some((state) => state.uf === normalizedUf);

    const municipalities = useQuery({
        queryKey: ["ibge-municipalities", normalizedUf],
        queryFn: () => fetchMunicipalities(normalizedUf),
        enabled: hasUf,
        staleTime: Infinity,
        gcTime: Infinity,
        retry: 1,
    });

    const options = useMemo(() => {
        const list = municipalities.data ?? [];
        const term = normalizeName(search);
        return term ? list.filter((city) => normalizeName(city).includes(term)) : list;
    }, [municipalities.data, search]);

    if (municipalities.isError) {
        return (
            <Input
                aria-invalid={invalid || undefined}
                id={id}
                onChange={(event) => onValueChange(event.target.value)}
                placeholder="Digite a cidade"
                value={value}
            />
        );
    }

    const disabled = !hasUf;

    return (
        <Popover
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) setSearch("");
            }}
            open={open}
        >
            <PopoverTrigger asChild>
                <button
                    aria-haspopup="listbox"
                    className="flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-field px-3.5 text-left text-sm shadow-xs shadow-black/5 transition-colors outline-none hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid=true]:border-destructive data-[state=open]:border-primary data-[state=open]:ring-[3px] data-[state=open]:ring-primary/25"
                    data-invalid={invalid || undefined}
                    disabled={disabled}
                    id={id}
                    type="button"
                >
                    <span className={cn("truncate", !value && "text-muted-foreground/70")}>
                        {value || (hasUf ? "Selecione a cidade" : "Escolha a UF primeiro")}
                    </span>
                    {municipalities.isFetching ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-(--radix-popover-trigger-width) min-w-64 overflow-hidden p-0"
                onOpenAutoFocus={(event) => event.preventDefault()}
            >
                <div className="relative border-b">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        aria-label="Buscar cidade"
                        className="h-11 w-full bg-transparent pr-3 pl-10 text-sm outline-none placeholder:text-muted-foreground/70"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar cidade"
                        type="search"
                        value={search}
                    />
                </div>
                <div className="max-h-64 overflow-y-auto" role="listbox">
                    {municipalities.isPending ? (
                        <p className="flex items-center justify-center gap-2 px-3.5 py-6 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Carregando cidades...
                        </p>
                    ) : options.length === 0 ? (
                        <p className="px-3.5 py-6 text-center text-sm text-muted-foreground">Nenhuma cidade encontrada.</p>
                    ) : (
                        options.map((city) => {
                            const selected = normalizeName(city) === normalizeName(value);
                            return (
                                <button
                                    aria-selected={selected}
                                    className={cn(
                                        "flex w-full cursor-pointer items-center justify-between gap-3 border-b px-3.5 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-secondary",
                                        selected && "font-medium text-primary",
                                    )}
                                    key={city}
                                    onClick={() => {
                                        onValueChange(city);
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                    role="option"
                                    type="button"
                                >
                                    <span className="truncate">{city}</span>
                                    {selected && <Check className="size-4 shrink-0 text-primary" />}
                                </button>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
