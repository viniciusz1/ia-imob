"use client";

import { useMemo } from "react";
import { type Control, type FieldValues, useWatch } from "react-hook-form";
import type { z } from "zod";

export interface SchemaValidity {
    /** True when the current values pass the form's own schema. */
    isValid: boolean;
    /** Labels of the fields that still fail, in schema-issue order, without duplicates. */
    missing: string[];
}

/**
 * Runs the form's existing zod schema against the live values so the submit
 * button can stay disabled until the required fields are filled and valid.
 * It only reads; it never marks fields as touched or shows field errors.
 *
 * `labels` maps a top-level field name to the label shown to the user.
 */
export function useSchemaValidity<TValues extends FieldValues>(
    control: Control<TValues>,
    schema: z.ZodType,
    labels: Partial<Record<string, string>>,
): SchemaValidity {
    const values = useWatch({ control });

    return useMemo(() => {
        const result = schema.safeParse(values);
        if (result.success) return { isValid: true, missing: [] };

        const missing: string[] = [];
        for (const issue of result.error.issues) {
            const field = String(issue.path[0] ?? "");
            const label = labels[field] ?? field;
            if (label && !missing.includes(label)) missing.push(label);
        }
        return { isValid: false, missing };
    }, [values, schema, labels]);
}

/** "Preencha: Nome, E-mail" helper text for a disabled submit button. */
export function missingFieldsHint(missing: string[]): string {
    return `Preencha: ${missing.join(", ")}`;
}
