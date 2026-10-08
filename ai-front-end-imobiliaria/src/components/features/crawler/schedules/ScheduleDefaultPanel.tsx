"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateScheduleDefault } from "@/services/crawlerService";
import type { ScheduleDefault, SchedulePreset } from "@/types/crawler";
import { SchedulePresetFields } from "./SchedulePresetFields";

export function ScheduleDefaultPanel({ initialDefault }: { initialDefault: ScheduleDefault }) {
  const [preset, setPreset] = useState<SchedulePreset>(initialDefault.preset);
  const [timezone, setTimezone] = useState(initialDefault.timezone);

  const save = async () => {
    const updated = await updateScheduleDefault({ preset, timezone });
    setPreset(updated.preset);
    setTimezone(updated.timezone);
    toast.success("Agendamento padrão atualizado.");
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
            timezoneLabel="Fuso horário padrão"
          />
          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={() => void save()} type="button">Salvar agendamento padrão</Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
