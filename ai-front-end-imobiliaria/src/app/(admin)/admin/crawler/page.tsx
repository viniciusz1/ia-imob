import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  "Visão Geral",
  "Prospecção",
  "Crawl Agencies",
  "Operações",
  "Qualidade",
  "Configurações",
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
        {sections.map((section) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="text-base">{section}</CardTitle>
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
