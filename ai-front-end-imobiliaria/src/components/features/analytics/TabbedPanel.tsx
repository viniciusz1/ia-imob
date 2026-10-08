"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface PanelTab {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabbedPanelProps {
  title: string;
  description?: string;
  tabs: PanelTab[];
  className?: string;
}

export function TabbedPanel({ title, description, tabs, className }: TabbedPanelProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description === undefined ? null : (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={tabs[0]?.value}>
          <TabsList className="mb-4 flex-wrap">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
