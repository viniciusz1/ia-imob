"use client";

import { useState } from "react";
import { Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { submitLead } from "@/services/public/actions";

interface Props {
    host: string;
    propertyId?: string;
}

export function ContactForm({ host, propertyId }: Props) {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [pending, setPending] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setServerError(null);

        const form = event.currentTarget;
        const formData = new FormData(form);

        const newErrors: Record<string, string> = {};
        const name = formData.get("name") as string;
        const phone = formData.get("phone") as string;

        if (!name?.trim()) newErrors.name = "Nome é obrigatório";
        if (!phone?.trim()) newErrors.phone = "Telefone é obrigatório";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setPending(true);

        const result = await submitLead(host, formData);
        setPending(false);

        if (result.success) {
            setSuccess(true);
        } else {
            setServerError(result.error ?? "Erro ao enviar mensagem.");
        }
    }

    if (success) {
        return (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="size-12 text-green-500" aria-hidden />
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Mensagem enviada!</h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                    Entraremos em contato em breve pelo telefone informado.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="property_id" value={propertyId ?? ""} />

            <div>
                <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-[var(--brand-text)]">
                    Nome *
                </label>
                <input
                    id="contact-name"
                    name="name"
                    type="text"
                    className="w-full rounded-lg border border-[var(--brand-muted)]/20 bg-[var(--brand-bg)] px-4 py-2.5 text-[var(--brand-text)] outline-none focus:border-[var(--brand-primary)]"
                    placeholder="Seu nome completo"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
                <label htmlFor="contact-phone" className="mb-1 block text-sm font-medium text-[var(--brand-text)]">
                    Telefone / WhatsApp *
                </label>
                <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    className="w-full rounded-lg border border-[var(--brand-muted)]/20 bg-[var(--brand-bg)] px-4 py-2.5 text-[var(--brand-text)] outline-none focus:border-[var(--brand-primary)]"
                    placeholder="(47) 99999-0000"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>

            <div>
                <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-[var(--brand-text)]">
                    E-mail
                </label>
                <input
                    id="contact-email"
                    name="email"
                    type="email"
                    className="w-full rounded-lg border border-[var(--brand-muted)]/20 bg-[var(--brand-bg)] px-4 py-2.5 text-[var(--brand-text)] outline-none focus:border-[var(--brand-primary)]"
                    placeholder="seu@email.com"
                />
            </div>

            <div>
                <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-[var(--brand-text)]">
                    Mensagem
                </label>
                <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    className="w-full rounded-lg border border-[var(--brand-muted)]/20 bg-[var(--brand-bg)] px-4 py-2.5 text-[var(--brand-text)] outline-none focus:border-[var(--brand-primary)]"
                    placeholder="Olá, tenho interesse neste imóvel..."
                />
            </div>

            {serverError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                    <AlertCircle className="size-4" aria-hidden />
                    {serverError}
                </div>
            )}

            <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
                {pending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                    <Send className="size-4" aria-hidden />
                )}
                {pending ? "Enviando..." : "Enviar mensagem"}
            </button>
        </form>
    );
}
