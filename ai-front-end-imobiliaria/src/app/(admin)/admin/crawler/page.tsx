import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  ["Visão Geral", "/admin/crawler"],
  ["Prospecção", "/admin/crawler/prospects"],
  ["Crawl Agencies", "/admin/crawler/agencies"],
  ["Operações", "/admin/crawler/operations"],
  ["Qualidade", "/admin/crawler/quality"],
  ["Configurações", "/admin/crawler/settings"],
];

export default function CrawlerOverviewPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Operações do Crawler</h2>
        <p className="text-muted-foreground">
          Gerencie fontes, execuções e publicação de dados de mercado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map(([section, href]) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="text-base"><Link href={href}>{section}</Link></CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Acesse e acompanhe {section.toLocaleLowerCase("pt-BR")}.
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
