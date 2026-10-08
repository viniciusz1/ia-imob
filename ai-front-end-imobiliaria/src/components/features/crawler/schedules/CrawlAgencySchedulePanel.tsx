"use client";

import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/usePermission";
import { updateCrawlAgencySchedule } from "@/services/crawlerService";
import type { CrawlAgencySchedule, SchedulePreset } from "@/types/crawler";
import { SchedulePresetFields, schedulePresetLabels } from "./SchedulePresetFields";

export function CrawlAgencySchedulePanel({ initialSchedule }: { initialSchedule: CrawlAgencySchedule }) {
  const canManage = usePermission("crawler.schedules.manage");
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

  return (
    <Card id="agendamento">
      <CardHeader className="border-b">
        <CardTitle>Agendamento</CardTitle>
        <CardDescription>Frequência e fuso horário dos crawls automáticos desta fonte.</CardDescription>
        <CardAction>
          <Badge variant={schedule.suspended ? "destructive" : "success"}>{schedule.suspended ? "Suspenso" : "Ativo"}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        {schedule.suspended && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-foreground">
              Suspenso após 3 falhas consecutivas de produção. Crawls manuais continuam disponíveis.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Discovery dos crawls agendados</p>
            {schedule.discovery_policy ? (
              <p className="text-sm text-foreground">
                {schedule.discovery_policy.name} · v{schedule.discovery_policy.version} · sempre gera snapshot novo
              </p>
            ) : (
              <p className="text-sm text-destructive">Sem Política de Discovery Ativa; nenhum crawl será agendado.</p>
            )}
          </div>
          <div className="space-y-1 rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Execução automática</p>
            <p className="text-sm text-foreground tabular-nums">Próxima execução: {nextRun}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Checkbox
              aria-label="Herdar padrão da plataforma"
              checked={inheritDefault}
              disabled={!canManage}
              id="inherit-schedule"
              onCheckedChange={(checked) => setInheritDefault(checked === true)}
            />
            <Label htmlFor="inherit-schedule">Herdar padrão da plataforma</Label>
          </div>
          {schedule.inherit_default && (
            <p className="text-xs text-muted-foreground">
              Herdando padrão da plataforma: {schedulePresetLabels[schedule.effective_preset]} · {schedule.effective_timezone}
            </p>
          )}
        </div>

        <SchedulePresetFields
          disabled={inheritDefault || !canManage}
          onPresetChange={setPreset}
          onTimezoneChange={setTimezone}
          preset={preset}
          presetLabel="Frequência"
          timezone={timezone}
          timezoneLabel="Fuso horário"
        />

        {canManage && (
          <div className="flex justify-end">
            <Button onClick={() => void save()} type="button">Salvar agendamento</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
