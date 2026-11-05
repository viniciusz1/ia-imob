import { z } from "zod";

import { isHttpUrl, isValidPhoneBR } from "@/lib/brazilianFormats";

/**
 * Field rules shared by the registration forms, so every screen validates
 * e-mail, phone, URLs and passwords the same way (and at least as strictly as
 * the Laravel FormRequests behind them).
 */

export const requiredText = (label: string, max = 255) =>
    z
        .string({ message: `${label} é obrigatório` })
        .trim()
        .min(1, `${label} é obrigatório`)
        .max(max, `${label} deve ter no máximo ${max} caracteres`);

export const requiredEmail = (label = "E-mail") =>
    z
        .string({ message: `${label} é obrigatório` })
        .trim()
        .min(1, `${label} é obrigatório`)
        .max(255, `${label} deve ter no máximo 255 caracteres`)
        .email("Informe um e-mail válido, como nome@empresa.com.br");

export const optionalEmail = () =>
    z
        .string()
        .trim()
        .max(255, "E-mail deve ter no máximo 255 caracteres")
        .email("Informe um e-mail válido, como nome@empresa.com.br")
        .optional()
        .or(z.literal(""));

export const requiredPhoneBR = (label = "Telefone") =>
    z
        .string({ message: `${label} é obrigatório` })
        .trim()
        .min(1, `${label} é obrigatório`)
        .refine(isValidPhoneBR, "Informe um telefone com DDD, como (11) 99999-9999");

export const optionalPhoneBR = () =>
    z
        .string()
        .trim()
        .refine((value) => value === "" || isValidPhoneBR(value), "Informe um telefone com DDD, como (11) 99999-9999")
        .optional();

export const optionalHttpUrl = (label: string, max = 255) =>
    z
        .string()
        .trim()
        .max(max, `${label} deve ter no máximo ${max} caracteres`)
        .refine((value) => value === "" || isHttpUrl(value), `${label} deve ser um endereço completo, como https://site.com.br`)
        .optional()
        .or(z.literal(""));

/** Login names: no spaces, 3 to `max` characters. */
export const username = (max = 100) =>
    z
        .string({ message: "Usuário é obrigatório" })
        .trim()
        .min(3, "Usuário deve ter pelo menos 3 caracteres")
        .max(max, `Usuário deve ter no máximo ${max} caracteres`)
        .regex(/^\S+$/, "Usuário não pode ter espaços");

export const PASSWORD_MIN = 8;
