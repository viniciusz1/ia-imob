import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listDiscoverySnapshotUrls } from "@/services/crawlerService";

interface DiscoverySnapshotPageProps {
  params: Promise<{ id: string }>;
}

export default async function DiscoverySnapshotPage({ params }: DiscoverySnapshotPageProps) {
  const { id } = await params;
  const urls = await listDiscoverySnapshotUrls(Number(id));

  return (
    <section className="space-y-4">
      <Link className="text-sm underline" href="/admin/crawler/operations">Voltar para Operações</Link>
      <Card><CardHeader><CardTitle>Snapshot de Discovery #{id}</CardTitle></CardHeader><CardContent><ul className="divide-y">{urls.map((item) => <li className="break-all py-2" key={item.id}>{item.url}</li>)}</ul></CardContent></Card>
    </section>
  );
}
