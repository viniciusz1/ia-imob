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
import { Card, CardContent } from "@/components/ui/card";
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
        <Card className="mb-6">
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input
                        placeholder="Filtrar por Código..."
                        value={filterId}
                        onChange={(e) => setFilterId(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <Input
                        placeholder="Filtrar por Nome..."
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <Input
                        placeholder="Filtrar por Usuário (login)..."
                        value={filterUsername}
                        onChange={(e) => setFilterUsername(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />

                    <Select
                        value={searchParams.get("filterStatus") || ""}
                        onValueChange={(val) => handleSelectChange("filterStatus", val)}
                    >
                        <SelectTrigger>
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
                        <SelectTrigger>
                            <SelectValue placeholder="Mostrar no Site" />
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
                        <SelectTrigger>
                            <SelectValue placeholder="Status Online" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" disabled>
                                Selecione
                            </SelectItem>
                            <SelectItem value="true">Online</SelectItem>
                            <SelectItem value="false">Offline</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex gap-2 w-full lg:col-span-2">
                        <Button
                            className="flex-1"
                            variant="default"
                            onClick={applyTextFilters}
                        >
                            <Search className="h-4 w-4 mr-2" />
                            Filtrar
                        </Button>
                        <Button className="flex-1" variant="outline" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-2" />
                            Limpar
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
