import { describe, expect, it } from "vitest";

import { formatCpfCnpj, formatPhoneBR, isHttpUrl, isValidCnpj, isValidCpf, isValidPhoneBR } from "../brazilianFormats";

describe("formatPhoneBR", () => {
    it("formats mobile and landline numbers while typing", () => {
        expect(formatPhoneBR("1")).toBe("(1");
        expect(formatPhoneBR("1199")).toBe("(11) 99");
        expect(formatPhoneBR("1133334444")).toBe("(11) 3333-4444");
        expect(formatPhoneBR("11999998888")).toBe("(11) 99999-8888");
        expect(formatPhoneBR("119999988887")).toBe("(11) 99999-8888");
    });

    it("drops a +55 country code", () => {
        expect(formatPhoneBR("+55 47 99999-0000")).toBe("(47) 99999-0000");
    });
});

describe("isValidPhoneBR", () => {
    it("accepts DDD plus 8 or 9 digits", () => {
        expect(isValidPhoneBR("(11) 3333-4444")).toBe(true);
        expect(isValidPhoneBR("(11) 99999-8888")).toBe(true);
        expect(isValidPhoneBR("+55 (47) 99999-0000")).toBe(true);
    });

    it("rejects short numbers, invalid DDD and 9-digit numbers not starting with 9", () => {
        expect(isValidPhoneBR("9999-8888")).toBe(false);
        expect(isValidPhoneBR("(01) 3333-4444")).toBe(false);
        expect(isValidPhoneBR("(11) 89999-8888")).toBe(false);
    });
});

describe("CPF and CNPJ", () => {
    it("checks the verification digits", () => {
        expect(isValidCpf("529.982.247-25")).toBe(true);
        expect(isValidCpf("529.982.247-24")).toBe(false);
        expect(isValidCpf("111.111.111-11")).toBe(false);
        expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
        expect(isValidCnpj("11.222.333/0001-80")).toBe(false);
    });

    it("masks as CPF up to 11 digits and as CNPJ beyond", () => {
        expect(formatCpfCnpj("52998224725")).toBe("529.982.247-25");
        expect(formatCpfCnpj("11222333000181")).toBe("11.222.333/0001-81");
    });
});

describe("isHttpUrl", () => {
    it("requires an http(s) address with a dotted host", () => {
        expect(isHttpUrl("https://instagram.com/perfil")).toBe(true);
        expect(isHttpUrl("instagram.com/perfil")).toBe(false);
        expect(isHttpUrl("ftp://site.com")).toBe(false);
        expect(isHttpUrl("https://localhost")).toBe(false);
    });
});
