"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          inputMode="numeric"
          placeholder={minPlaceholder}
          value={format(minValue)}
          onChange={(event) => onChange({ min: toDigits(event.target.value), max: maxValue })}
        />
        <Input
          inputMode="numeric"
          placeholder={maxPlaceholder}
          value={format(maxValue)}
          onChange={(event) => onChange({ min: minValue, max: toDigits(event.target.value) })}
        />
      </div>
    </div>
  );
}
