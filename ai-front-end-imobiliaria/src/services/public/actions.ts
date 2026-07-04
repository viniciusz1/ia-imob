"use server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface LeadResult {
    success: boolean;
    error?: string;
}

export async function submitLead(host: string, formData: FormData): Promise<LeadResult> {
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;
    const propertyId = formData.get("property_id") as string | null;

    const origin = API_URL.replace(/\/api(?:\/v\d+)?\/?$/, "");
    const url = `${origin}/api/v1/public/leads`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Agency-Host": host,
                Accept: "application/json",
            },
            body: JSON.stringify({
                name,
                phone,
                email: email || undefined,
                message,
                property_id: propertyId || undefined,
            }),
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { success: false, error: body.message ?? "Erro ao enviar mensagem." };
        }

        return { success: true };
    } catch {
        return { success: false, error: "Erro de conexão. Tente novamente." };
    }
}
