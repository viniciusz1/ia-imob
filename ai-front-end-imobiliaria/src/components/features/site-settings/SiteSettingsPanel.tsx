"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Globe, Palette, Share2 } from "lucide-react";
import {
    type SiteSettingsData,
    type SiteSettingsPayload,
    getSiteSettings,
    updateSiteSettings,
} from "@/services/siteSettingsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
            <div className="flex items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!settings) {
        return <p className="py-8 text-center text-muted-foreground">Nenhuma configuração encontrada.</p>;
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

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Configurações do Site</h1>
                    <p className="text-sm text-muted-foreground">
                        Personalize a aparência e o conteúdo do seu site público.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                    Salvar
                </Button>
            </div>

            {/* Branding */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="size-5" /> Identidade visual
                    </CardTitle>
                    <CardDescription>Logotipo e cores da sua marca.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="logo">URL do logotipo</Label>
                            <Input
                                id="logo"
                                value={settings.logo_path ?? ""}
                                onChange={(e) => update("logo_path", e.target.value || null)}
                                placeholder="https://exemplo.com/logo.png"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="favicon">URL do favicon</Label>
                            <Input
                                id="favicon"
                                value={settings.favicon_path ?? ""}
                                onChange={(e) => update("favicon_path", e.target.value || null)}
                                placeholder="https://exemplo.com/favicon.ico"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                        {COLOR_FIELDS.map(({ key, label }) => (
                            <div key={key} className="space-y-2">
                                <Label htmlFor={key}>{label}</Label>
                                <div className="flex gap-2">
                                    <input
                                        id={key}
                                        type="color"
                                        value={String(settings[key] ?? "")}
                                        onChange={(e) => update(key, e.target.value)}
                                        className="h-9 w-9 cursor-pointer rounded border"
                                    />
                                    <Input
                                        value={String(settings[key] ?? "")}
                                        onChange={(e) => update(key, e.target.value)}
                                        className="flex-1 font-mono text-xs"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Content */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="size-5" /> Conteúdo da página inicial
                    </CardTitle>
                    <CardDescription>Título e texto exibidos no topo da página inicial do seu site.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="hero_title">Título do hero</Label>
                        <Input
                            id="hero_title"
                            value={settings.hero_title ?? ""}
                            onChange={(e) => update("hero_title", e.target.value || null)}
                            placeholder="Encontre o imóvel dos seus sonhos"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="hero_subtitle">Subtítulo do hero</Label>
                        <Input
                            id="hero_subtitle"
                            value={settings.hero_subtitle ?? ""}
                            onChange={(e) => update("hero_subtitle", e.target.value || null)}
                            placeholder="Imóveis selecionados à venda e para alugar."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="about_text">Sobre a imobiliária</Label>
                        <Textarea
                            id="about_text"
                            rows={4}
                            value={settings.about_text ?? ""}
                            onChange={(e) => update("about_text", e.target.value || null)}
                            placeholder="Breve descrição da imobiliária..."
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Social & Analytics */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Share2 className="size-5" /> Redes sociais e analytics
                    </CardTitle>
                    <CardDescription>Links de contato e códigos de rastreamento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp padrão</Label>
                        <Input
                            id="whatsapp"
                            value={settings.default_whatsapp ?? ""}
                            onChange={(e) => update("default_whatsapp", e.target.value || null)}
                            placeholder="(47) 99999-0000"
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="facebook">Facebook</Label>
                            <Input
                                id="facebook"
                                value={settings.facebook_url ?? ""}
                                onChange={(e) => update("facebook_url", e.target.value || null)}
                                placeholder="https://facebook.com/suapagina"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="instagram">Instagram</Label>
                            <Input
                                id="instagram"
                                value={settings.instagram_url ?? ""}
                                onChange={(e) => update("instagram_url", e.target.value || null)}
                                placeholder="https://instagram.com/seuperfil"
                            />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="ga">Google Analytics ID</Label>
                            <Input
                                id="ga"
                                value={settings.google_analytics_id ?? ""}
                                onChange={(e) => update("google_analytics_id", e.target.value || null)}
                                placeholder="G-XXXXXXXXXX"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pixel">Meta Pixel ID</Label>
                            <Input
                                id="pixel"
                                value={settings.meta_pixel_id ?? ""}
                                onChange={(e) => update("meta_pixel_id", e.target.value || null)}
                                placeholder="1234567890"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
