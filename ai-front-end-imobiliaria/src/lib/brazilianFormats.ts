/**
 * Masks and checks for Brazilian data typed into forms (phone, CPF, CNPJ) and
 * for URLs. Masks only format what the user types; the checks are what the
 * zod rules in src/schemas/commonFieldRules.ts use.
 */

export function onlyDigits(value: string): string {
    return value.replace(/\D/g, "");
}

/** National digits of a phone: a leading +55 country code is dropped. */
function nationalPhoneDigits(value: string): string {
    const digits = onlyDigits(value);
    return digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
}

/** "(11) 9999-9999" or "(11) 99999-9999" while typing; never more than 11 digits. */
export function formatPhoneBR(value: string): string {
    const digits = nationalPhoneDigits(value).slice(0, 11);
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;

    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    // Mobile numbers (9 digits) split 5-4; landlines (8 digits) split 4-4.
    const splitAt = digits.length === 11 ? 5 : 4;
    if (rest.length <= splitAt) return `(${ddd}) ${rest}`;
    return `(${ddd}) ${rest.slice(0, splitAt)}-${rest.slice(splitAt)}`;
}

/** DDD + 8-digit landline or DDD + 9-digit mobile starting with 9. */
export function isValidPhoneBR(value: string): boolean {
    const digits = nationalPhoneDigits(value);
    if (digits.length !== 10 && digits.length !== 11) return false;
    const ddd = Number(digits.slice(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    if (digits.length === 11 && digits[2] !== "9") return false;
    return true;
}

function allSameDigit(digits: string): boolean {
    return /^(\d)\1+$/.test(digits);
}

export function isValidCpf(value: string): boolean {
    const digits = onlyDigits(value);
    if (digits.length !== 11 || allSameDigit(digits)) return false;

    const checkDigit = (length: number) => {
        let sum = 0;
        for (let index = 0; index < length; index++) {
            sum += Number(digits[index]) * (length + 1 - index);
        }
        const rest = (sum * 10) % 11;
        return rest === 10 ? 0 : rest;
    };

    return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10]);
}

export function isValidCnpj(value: string): boolean {
    const digits = onlyDigits(value);
    if (digits.length !== 14 || allSameDigit(digits)) return false;

    const checkDigit = (length: number) => {
        const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    };

    return checkDigit(12) === Number(digits[12]) && checkDigit(13) === Number(digits[13]);
}

/** "000.000.000-00" up to 11 digits, "00.000.000/0000-00" beyond. */
export function formatCpfCnpj(value: string): string {
    const digits = onlyDigits(value).slice(0, 14);
    if (digits.length <= 11) {
        return digits
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
    }
    return digits
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** Absolute http(s) URL with a dotted host, the shape Laravel's `url` rule accepts in practice. */
export function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
    } catch {
        return false;
    }
}
