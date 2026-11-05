"use client";

import { useState } from "react";

import { MissingFieldsHint, missingFields, timezoneError } from "@/components/features/crawler/requiredFields";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateScheduleDefault } from "@/services/crawlerService";
import type { ScheduleDefault, SchedulePreset } from "@/types/crawler";
import { SchedulePresetFields } from "./SchedulePresetFields";

export function ScheduleDefaultPanel({ initialDefault }: { initialDefault: ScheduleDefault }) {
  const [preset, setPreset] = useState<SchedulePreset>(initialDefault.preset);
  const [timezone, setTimezone] = useState(initialDefault.timezone);

  const [isSaving, setIsSaving] = useState(false);
  // ScheduleDefaultRequest: timezone required and a real IANA zone.
  const timezoneFieldError = timezoneError(timezone);
  const missing = missingFields([["Fuso horário padrão", timezoneFieldError === null]]);

  const save = async () => {
    setIsSaving(true);
    try {
      const updated = await updateScheduleDefault({ preset, timezone });
      setPreset(updated.preset);
      setTimezone(updated.timezone);
      toast.success("Agendamento padrão atualizado.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg tracking-tight text-foreground">Agendamento padrão da plataforma</h2>
        <p className="text-sm text-muted-foreground">Usado pelas Crawl Agencies que herdam o padrão.</p>
      </div>
      <Card>
        <CardContent className="space-y-5">
          <SchedulePresetFields
            onPresetChange={setPreset}
            onTimezoneChange={setTimezone}
            preset={preset}
            presetLabel="Frequência padrão"
            timezone={timezone}
            timezoneError={timezoneFieldError}
            timezoneLabel="Fuso horário padrão"
          />
          <div className="flex flex-wrap items-center justify-end gap-3">
            <MissingFieldsHint className="mr-auto" missing={missing} />
            <Button disabled={isSaving || missing.length > 0} onClick={() => void save()} type="button">
              Salvar agendamento padrão
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
