import { SiteSettingsPanel } from "@/components/features/site-settings/SiteSettingsPanel";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Configurações do site",
};

export default function SiteSettingsPage() {
    return <SiteSettingsPanel />;
}
