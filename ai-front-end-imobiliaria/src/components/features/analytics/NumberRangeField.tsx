"use client";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { toDigits } from "./numberInput";

interface NumberRangeFieldProps {
  id: string;
  label: string;
  format: (value: string) => string;
  minValue: string;
  maxValue: string;
  minPlaceholder: string;
  maxPlaceholder: string;
  onChange: (range: { min: string; max: string }) => void;
}

export function NumberRangeField({
  id,
  label,
  format,
  minValue,
  maxValue,
  minPlaceholder,
  maxPlaceholder,
  onChange,
}: NumberRangeFieldProps) {
  return (
    <FormField htmlFor={id} label={label}>
      <div className="flex gap-2">
        <Input
          id={id}
          className="min-w-0"
          size="sm"
          inputMode="numeric"
          placeholder={minPlaceholder}
          value={format(minValue)}
          onChange={(event) => onChange({ min: toDigits(event.target.value), max: maxValue })}
        />
        <Input
          className="min-w-0"
          size="sm"
          inputMode="numeric"
          placeholder={maxPlaceholder}
          value={format(maxValue)}
          onChange={(event) => onChange({ min: minValue, max: toDigits(event.target.value) })}
        />
      </div>
    </FormField>
  );
}
