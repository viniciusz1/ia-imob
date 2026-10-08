import { ExternalLink, Link2 } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listDiscoverySnapshotUrls } from "@/services/crawlerService";

interface DiscoverySnapshotPageProps {
  params: Promise<{ id: string }>;
}

export default async function DiscoverySnapshotPage({ params }: DiscoverySnapshotPageProps) {
  const { id } = await params;
  const urls = await listDiscoverySnapshotUrls(Number(id));

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/crawler/operations"
        badge={<Badge className="tabular-nums" variant="muted">{urls.meta.total} URLs</Badge>}
        description="URLs encontradas por este Snapshot imutável de Discovery."
        title={`Snapshot de Discovery #${id}`}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader
          description={`Exibindo ${urls.data.length} de ${urls.meta.total} URLs`}
          icon={Link2}
          title="URLs descobertas"
        />
        {urls.data.length === 0 ? (
          <EmptyState icon={Link2} title="Este Snapshot não contém URLs." variant="inline" />
        ) : (
          <ul className="divide-y">
            {urls.data.map((item) => (
              <li className="flex items-center gap-2 px-4 py-3 sm:px-5" key={item.id}>
                <a
                  className="min-w-0 truncate text-sm text-primary hover:underline"
                  href={item.url}
                  rel="noreferrer"
                  target="_blank"
                  title={item.url}
                >
                  {item.url}
                </a>
                <ExternalLink aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
