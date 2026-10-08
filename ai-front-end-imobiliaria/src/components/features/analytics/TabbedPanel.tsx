"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface PanelTab {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabbedPanelProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tabs: PanelTab[];
  className?: string;
}

/**
 * Card de seção com abas. O conteúdo de cada aba encosta nas bordas do card,
 * então tabelas e rodapés trazem o próprio recuo.
 */
export function TabbedPanel({ title, description, icon, tabs, className }: TabbedPanelProps) {
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <SectionHeader description={description} icon={icon} title={title} />
      <Tabs className="gap-0" defaultValue={tabs[0]?.value}>
        <div className="border-b px-4 py-3 sm:px-5">
          <TabsList className="flex-wrap">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
