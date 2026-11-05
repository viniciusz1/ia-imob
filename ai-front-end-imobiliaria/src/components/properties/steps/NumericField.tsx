"use client";

import { Controller, useFormContext } from "react-hook-form";

import { InputAdornment } from "@/components/properties/steps/FieldLayout";
import { FormField } from "@/components/ui/form-field";
import { DecimalInput, IntegerInput, MoneyInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";
import type { PropertyFormValues } from "@/schemas/propertySchema";

function toNumber(value: unknown): number | null {
    if (typeof value === "number") return Number.isNaN(value) ? null : value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
}

type NumericFieldName = {
    [Key in keyof PropertyFormValues]: PropertyFormValues[Key] extends number | null ? Key : never;
}[keyof PropertyFormValues];

type NumericKind =
    | { kind: "money" }
    | { kind: "decimal"; decimals?: number; maxIntegerDigits?: number; allowNegative?: boolean; grouping?: boolean }
    | { kind: "integer"; maxDigits?: number; allowNegative?: boolean; grouping?: boolean };

type NumericFieldProps = NumericKind & {
    name: NumericFieldName;
    label: string;
    className?: string;
    prefix?: string;
    suffix?: string;
    placeholder?: string;
    /** Counts like bedrooms can't be empty: an emptied field goes back to 0. */
    emptyAsZero?: boolean;
};

/**
 * A formatted number field bound to the property form. It validates itself
 * when the user leaves it (and again while typing once it shows an error),
 * so a wrong year or coordinate is flagged on its own step, not only when
 * the last step is submitted.
 */
export function NumericField({
    name,
    label,
    className,
    prefix,
    suffix,
    placeholder,
    emptyAsZero = false,
    ...numeric
}: NumericFieldProps) {
    const { control, trigger } = useFormContext<PropertyFormValues>();

    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => {
                const inputProps = {
                    "aria-invalid": fieldState.invalid || undefined,
                    className: cn(prefix && "pl-11", suffix && "pr-12"),
                    id: name,
                    name: field.name,
                    onBlur: () => {
                        field.onBlur();
                        void trigger(name);
                    },
                    onValueChange: (next: number | null) => {
                        field.onChange(next === null && emptyAsZero ? 0 : next);
                        if (fieldState.invalid) void trigger(name);
                    },
                    placeholder,
                    ref: field.ref,
                    value: toNumber(field.value),
                };

                const input =
                    numeric.kind === "money" ? (
                        <MoneyInput {...inputProps} />
                    ) : numeric.kind === "decimal" ? (
                        <DecimalInput
                            {...inputProps}
                            allowNegative={numeric.allowNegative}
                            decimals={numeric.decimals}
                            grouping={numeric.grouping}
                            maxIntegerDigits={numeric.maxIntegerDigits}
                        />
                    ) : (
                        <IntegerInput
                            {...inputProps}
                            allowNegative={numeric.allowNegative}
                            grouping={numeric.grouping}
                            maxDigits={numeric.maxDigits}
                        />
                    );

                return (
                    <FormField className={className} error={fieldState.error?.message} htmlFor={name} label={label}>
                        {prefix || suffix ? (
                            <InputAdornment prefix={prefix} suffix={suffix}>
                                {input}
                            </InputAdornment>
                        ) : (
                            input
                        )}
                    </FormField>
                );
            }}
        />
    );
}
