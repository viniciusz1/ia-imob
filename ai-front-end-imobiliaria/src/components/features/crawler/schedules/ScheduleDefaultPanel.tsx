"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return <Card>
    <CardHeader><CardTitle>Agendamento padrão da plataforma</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Usado pelas Crawl Agencies que herdam o padrão.</p>
      <SchedulePresetFields
        onPresetChange={setPreset}
        onTimezoneChange={setTimezone}
        preset={preset}
        presetLabel="Frequência padrão"
        timezone={timezone}
        timezoneLabel="Fuso horário padrão"
      />
      <Button onClick={() => void save()} type="button">Salvar agendamento padrão</Button>
    </CardContent>
  </Card>;
}
