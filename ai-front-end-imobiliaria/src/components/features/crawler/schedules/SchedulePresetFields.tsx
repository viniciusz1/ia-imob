import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { SchedulePreset } from "@/types/crawler";

export const schedulePresetLabels: Record<SchedulePreset, string> = {
  manual: "Somente manual",
  daily: "Diário",
  twice_weekly: "Duas vezes por semana",
  weekly: "Semanal",
};

export function SchedulePresetFields({
  disabled = false,
  preset,
  presetLabel,
  timezone,
  timezoneLabel,
  onPresetChange,
  onTimezoneChange,
}: {
  disabled?: boolean;
  preset: SchedulePreset;
  presetLabel: string;
  timezone: string;
  timezoneLabel: string;
  onPresetChange: (preset: SchedulePreset) => void;
  onTimezoneChange: (timezone: string) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormField htmlFor={`${presetLabel}-preset`} label={presetLabel}>
        <NativeSelect
          aria-label={presetLabel}
          disabled={disabled}
          id={`${presetLabel}-preset`}
          onChange={(event) => onPresetChange(event.target.value as SchedulePreset)}
          value={preset}
        >
          {Object.entries(schedulePresetLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField htmlFor={`${timezoneLabel}-timezone`} label={timezoneLabel}>
        <Input
          aria-label={timezoneLabel}
          disabled={disabled}
          id={`${timezoneLabel}-timezone`}
          onChange={(event) => onTimezoneChange(event.target.value)}
          placeholder="America/Sao_Paulo"
          value={timezone}
        />
      </FormField>
    </div>
  );
}
