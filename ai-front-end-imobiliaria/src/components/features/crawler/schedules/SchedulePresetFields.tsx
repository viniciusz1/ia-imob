import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  return <div className="grid gap-4 md:grid-cols-2">
    <div className="space-y-2">
      <Label htmlFor={`${presetLabel}-preset`}>{presetLabel}</Label>
      <select
        aria-label={presetLabel}
        className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        disabled={disabled}
        id={`${presetLabel}-preset`}
        onChange={(event) => onPresetChange(event.target.value as SchedulePreset)}
        value={preset}
      >
        {Object.entries(schedulePresetLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    <div className="space-y-2">
      <Label htmlFor={`${timezoneLabel}-timezone`}>{timezoneLabel}</Label>
      <Input
        aria-label={timezoneLabel}
        disabled={disabled}
        id={`${timezoneLabel}-timezone`}
        onChange={(event) => onTimezoneChange(event.target.value)}
        placeholder="America/Sao_Paulo"
        value={timezone}
      />
    </div>
  </div>;
}
