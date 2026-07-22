"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { updateCrawlAgencySchedule } from "@/services/crawlerService";
import type { CrawlAgencySchedule, SchedulePreset } from "@/types/crawler";
import { SchedulePresetFields, schedulePresetLabels } from "./SchedulePresetFields";

export function CrawlAgencySchedulePanel({ initialSchedule }: { initialSchedule: CrawlAgencySchedule }) {
  const [schedule, setSchedule] = useState(initialSchedule);
  const [inheritDefault, setInheritDefault] = useState(initialSchedule.inherit_default);
  const [preset, setPreset] = useState<SchedulePreset>(initialSchedule.preset ?? initialSchedule.effective_preset);
  const [timezone, setTimezone] = useState(initialSchedule.timezone ?? initialSchedule.effective_timezone);

  const save = async () => {
    const updated = await updateCrawlAgencySchedule(schedule.crawl_agency_id, {
      inherit_default: inheritDefault,
      ...(!inheritDefault && { preset, timezone }),
    });
    setSchedule(updated);
    toast.success("Agendamento da Crawl Agency atualizado.");
  };

  const nextRun = schedule.next_run_at === null
    ? "Sem próxima execução automática"
    : new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: schedule.effective_timezone,
    }).format(new Date(schedule.next_run_at));

  return <Card id="agendamento">
    <CardHeader className="flex-row items-center justify-between">
      <CardTitle>Agendamento</CardTitle>
      <Badge variant={schedule.suspended ? "destructive" : "secondary"}>{schedule.suspended ? "Suspenso" : "Ativo"}</Badge>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          aria-label="Herdar padrão da plataforma"
          checked={inheritDefault}
          id="inherit-schedule"
          onChange={(event) => setInheritDefault(event.target.checked)}
          type="checkbox"
        />
        <Label htmlFor="inherit-schedule">Herdar padrão da plataforma</Label>
      </div>
      {schedule.inherit_default && <p>Herdando padrão da plataforma: {schedulePresetLabels[schedule.effective_preset]} · {schedule.effective_timezone}</p>}
      <SchedulePresetFields
        disabled={inheritDefault}
        onPresetChange={setPreset}
        onTimezoneChange={setTimezone}
        preset={preset}
        presetLabel="Frequência"
        timezone={timezone}
        timezoneLabel="Fuso horário"
      />
      <p>Próxima execução: {nextRun}</p>
      {schedule.suspended && <p className="text-sm text-destructive">Suspenso após 3 falhas consecutivas de produção. Crawls manuais continuam disponíveis.</p>}
      <Button onClick={() => void save()} type="button">Salvar agendamento</Button>
    </CardContent>
  </Card>;
}
