"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

export function UserFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Local state for responsive input before applying to URL
    const [filterId, setFilterId] = useState(searchParams.get("filterId") || "");
    const [filterName, setFilterName] = useState(
        searchParams.get("filterName") || ""
    );
    const [filterUsername, setFilterUsername] = useState(
        searchParams.get("filterUsername") || ""
    );

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(name, value);
            } else {
                params.delete(name);
            }
            return params.toString();
        },
        [searchParams]
    );

    const handleSelectChange = (name: string, value: string) => {
        router.push(`${pathname}?${createQueryString(name, value)}`);
    };

    const applyTextFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        if (filterId) params.set("filterId", filterId);
        else params.delete("filterId");

        if (filterName) params.set("filterName", filterName);
        else params.delete("filterName");

        if (filterUsername) params.set("filterUsername", filterUsername);
        else params.delete("filterUsername");

        // Reset pagination when applying new filters
        params.delete("page");

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            applyTextFilters();
        }
    };

    const clearFilters = () => {
        setFilterId("");
        setFilterName("");
        setFilterUsername("");
        router.push(pathname);
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    aria-label="Filtrar por nome"
                    className="pl-9"
                    placeholder="Buscar por nome..."
                    size="sm"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <Input
                aria-label="Filtrar por código"
                className="w-full sm:w-24"
                placeholder="Código"
                size="sm"
                value={filterId}
                onChange={(e) => setFilterId(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <Input
                aria-label="Filtrar por usuário (login)"
                className="w-full sm:w-40"
                placeholder="Usuário (login)"
                size="sm"
                value={filterUsername}
                onChange={(e) => setFilterUsername(e.target.value)}
                onKeyDown={handleKeyDown}
            />

            <Select
                value={searchParams.get("filterStatus") || ""}
                onValueChange={(val) => handleSelectChange("filterStatus", val)}
            >
                <SelectTrigger aria-label="Status" className="w-full sm:w-32" size="sm">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none" disabled>
                        Selecione um status
                    </SelectItem>
                    <SelectItem value="1">Ativo</SelectItem>
                    <SelectItem value="0">Inativo</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={searchParams.get("filterSite") || ""}
                onValueChange={(val) => handleSelectChange("filterSite", val)}
            >
                <SelectTrigger aria-label="Mostrar no site" className="w-full sm:w-40" size="sm">
                    <SelectValue placeholder="Mostrar no site" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none" disabled>
                        Selecione
                    </SelectItem>
                    <SelectItem value="1">Sim</SelectItem>
                    <SelectItem value="0">Não</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={searchParams.get("filterOnline") || ""}
                onValueChange={(val) => handleSelectChange("filterOnline", val)}
            >
                <SelectTrigger aria-label="Status online" className="w-full sm:w-36" size="sm">
                    <SelectValue placeholder="Status online" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none" disabled>
                        Selecione
                    </SelectItem>
                    <SelectItem value="true">Online</SelectItem>
                    <SelectItem value="false">Offline</SelectItem>
                </SelectContent>
            </Select>

            <div className="flex gap-2">
                <Button size="sm" variant="default" onClick={applyTextFilters}>
                    <Search />
                    Filtrar
                </Button>
                <Button size="sm" variant="ghost" onClick={clearFilters}>
                    <X />
                    Limpar
                </Button>
            </div>
        </div>
    );
}
