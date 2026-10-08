"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, LayoutTemplate, Loader2, Palette, Save, Settings, Share2 } from "lucide-react";
import {
    type SiteSettingsData,
    type SiteSettingsPayload,
    getSiteSettings,
    updateSiteSettings,
} from "@/services/siteSettingsService";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const PAGE_TITLE = "Configurações do site";
const PAGE_DESCRIPTION = "Personalize a aparência e o conteúdo do seu site público.";

const COLOR_FIELDS: { key: keyof SiteSettingsPayload; label: string }[] = [
    { key: "color_primary", label: "Cor primária" },
    { key: "color_secondary", label: "Cor secundária" },
    { key: "color_accent", label: "Cor de destaque" },
    { key: "color_bg", label: "Fundo da página" },
    { key: "color_surface", label: "Superfície (cards)" },
    { key: "color_text", label: "Texto" },
    { key: "color_muted", label: "Texto secundário" },
];

export function SiteSettingsPanel() {
    const [settings, setSettings] = useState<SiteSettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getSiteSettings()
            .then(setSettings)
            .catch(() => toast.error("Erro ao carregar configurações."))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <section aria-busy="true" className="space-y-6" role="status">
                <span className="sr-only">Carregando configurações…</span>
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </div>
                <div className="grid gap-6 xl:grid-cols-2">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
                <Skeleton className="h-56 rounded-xl" />
                <Skeleton className="h-56 rounded-xl" />
            </section>
        );
    }

    if (!settings) {
        return (
            <div className="space-y-6">
                <PageHeader description={PAGE_DESCRIPTION} title={PAGE_TITLE} />
                <EmptyState icon={Settings} title="Nenhuma configuração encontrada." />
            </div>
        );
    }

    function update<K extends keyof SiteSettingsPayload>(key: K, value: SiteSettingsPayload[K]) {
        setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    }

    async function handleSave() {
        if (!settings) return;
        setSaving(true);

        const payload: SiteSettingsPayload = {
            logo_path: settings.logo_path,
            favicon_path: settings.favicon_path,
            color_primary: settings.color_primary,
            color_secondary: settings.color_secondary,
            color_accent: settings.color_accent,
            color_bg: settings.color_bg,
            color_surface: settings.color_surface,
            color_text: settings.color_text,
            color_muted: settings.color_muted,
            default_whatsapp: settings.default_whatsapp,
            facebook_url: settings.facebook_url,
            instagram_url: settings.instagram_url,
            google_analytics_id: settings.google_analytics_id,
            meta_pixel_id: settings.meta_pixel_id,
            hero_title: settings.hero_title,
            hero_subtitle: settings.hero_subtitle,
            about_text: settings.about_text,
        };

        try {
            const updated = await updateSiteSettings(payload);
            setSettings(updated);
            toast.success("Configurações salvas com sucesso!");
        } catch {
            toast.error("Erro ao salvar configurações.");
        } finally {
            setSaving(false);
        }
    }

    const saveButton = (
        <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Salvar
        </Button>
    );

    return (
        <div className="space-y-6">
            <PageHeader actions={saveButton} description={PAGE_DESCRIPTION} title={PAGE_TITLE} />

            <div className="grid gap-6 xl:grid-cols-2">
                {/* Branding */}
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="size-4 text-muted-foreground" />
                            Identidade visual
                        </CardTitle>
                        <CardDescription>Logotipo e ícone que aparecem no seu site.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField htmlFor="logo" label="URL do logotipo">
                            <Input
                                id="logo"
                                value={settings.logo_path ?? ""}
                                onChange={(e) => update("logo_path", e.target.value || null)}
                                placeholder="https://exemplo.com/logo.png"
                            />
                        </FormField>
                        <FormField htmlFor="favicon" label="URL do favicon">
                            <Input
                                id="favicon"
                                value={settings.favicon_path ?? ""}
                                onChange={(e) => update("favicon_path", e.target.value || null)}
                                placeholder="https://exemplo.com/favicon.ico"
                            />
                        </FormField>
                    </CardContent>
                </Card>

                {/* Content */}
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <LayoutTemplate className="size-4 text-muted-foreground" />
                            Conteúdo da página inicial
                        </CardTitle>
                        <CardDescription>Título e texto exibidos no topo da página inicial do seu site.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FormField htmlFor="hero_title" label="Título do hero">
                            <Input
                                id="hero_title"
                                value={settings.hero_title ?? ""}
                                onChange={(e) => update("hero_title", e.target.value || null)}
                                placeholder="Encontre o imóvel dos seus sonhos"
                            />
                        </FormField>
                        <FormField htmlFor="hero_subtitle" label="Subtítulo do hero">
                            <Input
                                id="hero_subtitle"
                                value={settings.hero_subtitle ?? ""}
                                onChange={(e) => update("hero_subtitle", e.target.value || null)}
                                placeholder="Imóveis selecionados à venda e para alugar."
                            />
                        </FormField>
                        <FormField className="sm:col-span-2" htmlFor="about_text" label="Sobre a imobiliária">
                            <Textarea
                                id="about_text"
                                rows={4}
                                value={settings.about_text ?? ""}
                                onChange={(e) => update("about_text", e.target.value || null)}
                                placeholder="Breve descrição da imobiliária..."
                            />
                        </FormField>
                    </CardContent>
                </Card>
            </div>

            {/* Colors */}
            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="size-4 text-muted-foreground" />
                        Cores da marca
                    </CardTitle>
                    <CardDescription>Paleta aplicada ao site público. Escolha no seletor ou digite o código hex.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {COLOR_FIELDS.map(({ key, label }) => (
                        <FormField key={key} htmlFor={key} label={label}>
                            <div className="flex gap-2">
                                <input
                                    id={key}
                                    type="color"
                                    value={String(settings[key] ?? "")}
                                    onChange={(e) => update(key, e.target.value)}
                                    className="size-10 shrink-0 cursor-pointer rounded-lg border border-input bg-background p-1"
                                />
                                <Input
                                    aria-label={`${label} (hex)`}
                                    value={String(settings[key] ?? "")}
                                    onChange={(e) => update(key, e.target.value)}
                                    className="flex-1 font-mono uppercase"
                                />
                            </div>
                        </FormField>
                    ))}
                </CardContent>
            </Card>

            {/* Social & Analytics */}
            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Share2 className="size-4 text-muted-foreground" />
                        Redes sociais e analytics
                    </CardTitle>
                    <CardDescription>Links de contato e códigos de rastreamento.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    <FormField htmlFor="whatsapp" label="WhatsApp padrão">
                        <Input
                            id="whatsapp"
                            value={settings.default_whatsapp ?? ""}
                            onChange={(e) => update("default_whatsapp", e.target.value || null)}
                            placeholder="(47) 99999-0000"
                        />
                    </FormField>
                    <FormField htmlFor="facebook" label="Facebook">
                        <Input
                            id="facebook"
                            value={settings.facebook_url ?? ""}
                            onChange={(e) => update("facebook_url", e.target.value || null)}
                            placeholder="https://facebook.com/suapagina"
                        />
                    </FormField>
                    <FormField htmlFor="instagram" label="Instagram">
                        <Input
                            id="instagram"
                            value={settings.instagram_url ?? ""}
                            onChange={(e) => update("instagram_url", e.target.value || null)}
                            placeholder="https://instagram.com/seuperfil"
                        />
                    </FormField>
                    <FormField htmlFor="ga" label="Google Analytics ID">
                        <Input
                            id="ga"
                            value={settings.google_analytics_id ?? ""}
                            onChange={(e) => update("google_analytics_id", e.target.value || null)}
                            placeholder="G-XXXXXXXXXX"
                        />
                    </FormField>
                    <FormField htmlFor="pixel" label="Meta Pixel ID">
                        <Input
                            id="pixel"
                            value={settings.meta_pixel_id ?? ""}
                            onChange={(e) => update("meta_pixel_id", e.target.value || null)}
                            placeholder="1234567890"
                        />
                    </FormField>
                </CardContent>
            </Card>

            <div className="flex flex-wrap justify-end gap-3">{saveButton}</div>
        </div>
    );
}
