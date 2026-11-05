import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { DecimalInput, IntegerInput, MoneyInput } from "../number-input";

type Field = typeof MoneyInput | typeof DecimalInput | typeof IntegerInput;

function Harness({
    Component,
    initial = null,
    onValue,
    extra = {},
}: {
    Component: Field;
    initial?: number | null;
    onValue: (value: number | null) => void;
    extra?: Record<string, unknown>;
}) {
    const [value, setValue] = useState<number | null>(initial);
    return (
        <Component
            aria-label="campo"
            onValueChange={(next) => {
                setValue(next);
                onValue(next);
            }}
            value={value}
            {...extra}
        />
    );
}

function type(text: string) {
    fireEvent.change(screen.getByLabelText("campo"), { target: { value: text } });
}

/** Types one key at a time, appending to whatever the field shows (like a browser). */
function typeKeys(keys: string) {
    for (const key of keys) {
        const field = screen.getByLabelText("campo") as HTMLInputElement;
        fireEvent.change(field, { target: { value: field.value + key } });
    }
}

describe("MoneyInput", () => {
    it("shifts digits in as cents and formats pt-BR", () => {
        const onValue = vi.fn();
        render(<Harness Component={MoneyInput} onValue={onValue} />);

        type("123456789");

        expect(screen.getByLabelText("campo")).toHaveValue("1.234.567,89");
        expect(onValue).toHaveBeenLastCalledWith(1234567.89);
    });

    it("shows an existing value formatted", () => {
        render(<Harness Component={MoneyInput} initial={500000} onValue={vi.fn()} />);

        expect(screen.getByLabelText("campo")).toHaveValue("500.000,00");
    });

    it("clears to null", () => {
        const onValue = vi.fn();
        render(<Harness Component={MoneyInput} initial={10} onValue={onValue} />);

        type("");

        expect(onValue).toHaveBeenLastCalledWith(null);
    });
});

describe("DecimalInput", () => {
    it("groups thousands and keeps the decimal comma", () => {
        const onValue = vi.fn();
        render(<Harness Component={DecimalInput} onValue={onValue} />);

        type("123456,75");

        expect(screen.getByLabelText("campo")).toHaveValue("123.456,75");
        expect(onValue).toHaveBeenLastCalledWith(123456.75);
    });

    it("keeps growing past the thousands grouping when typed key by key", () => {
        const onValue = vi.fn();
        render(<Harness Component={DecimalInput} onValue={onValue} />);

        typeKeys("20000");

        expect(screen.getByLabelText("campo")).toHaveValue("20.000");
        expect(onValue).toHaveBeenLastCalledWith(20000);

        typeKeys(",5");
        expect(screen.getByLabelText("campo")).toHaveValue("20.000,5");
        expect(onValue).toHaveBeenLastCalledWith(20000.5);
    });

    it("reads a pasted grouped number as thousands", () => {
        const onValue = vi.fn();
        render(<Harness Component={DecimalInput} onValue={onValue} />);

        type("10.000");

        expect(screen.getByLabelText("campo")).toHaveValue("10.000");
        expect(onValue).toHaveBeenLastCalledWith(10000);
    });

    it("reads a pasted coordinate with a dot as a negative decimal", () => {
        const onValue = vi.fn();
        render(
            <Harness
                Component={DecimalInput}
                extra={{ allowNegative: true, decimals: 7, grouping: false }}
                onValue={onValue}
            />,
        );

        type("-26.4851234");

        expect(screen.getByLabelText("campo")).toHaveValue("-26,4851234");
        expect(onValue).toHaveBeenLastCalledWith(-26.4851234);
    });
});

describe("IntegerInput", () => {
    it("never takes more digits than allowed", () => {
        const onValue = vi.fn();
        render(<Harness Component={IntegerInput} extra={{ maxDigits: 4 }} onValue={onValue} />);

        type("2388283");

        expect(screen.getByLabelText("campo")).toHaveValue("2388");
        expect(onValue).toHaveBeenLastCalledWith(2388);
    });

    it("drops anything that is not a digit", () => {
        const onValue = vi.fn();
        render(<Harness Component={IntegerInput} onValue={onValue} />);

        type("2a0b2c4");

        expect(screen.getByLabelText("campo")).toHaveValue("2024");
    });
});
