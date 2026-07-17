"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NeighborhoodMetric } from "@/types/offerMap";

interface NeighborhoodComparePanelProps {
  neighborhoods: NeighborhoodMetric[];
}

function formatCurrency(value: number | null): string {
  if (value === null) return "-";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function NeighborhoodComparePanel({
  neighborhoods,
}: NeighborhoodComparePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comparar bairros</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Métrica</TableHead>
              {neighborhoods.map((neighborhood) => (
                <TableHead key={neighborhood.name}>{neighborhood.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Anúncios</TableCell>
              {neighborhoods.map((neighborhood) => (
                <TableCell key={neighborhood.name}>{neighborhood.count}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Participação</TableCell>
              {neighborhoods.map((neighborhood) => (
                <TableCell key={neighborhood.name}>
                  {neighborhood.city_share_percent}%
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Mediana</TableCell>
              {neighborhoods.map((neighborhood) => (
                <TableCell key={neighborhood.name}>
                  {formatCurrency(neighborhood.median_price)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">P25 - P75</TableCell>
              {neighborhoods.map((neighborhood) => (
                <TableCell key={neighborhood.name}>
                  {formatCurrency(neighborhood.p25_price)} -{" "}
                  {formatCurrency(neighborhood.p75_price)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Tipo predominante</TableCell>
              {neighborhoods.map((neighborhood) => (
                <TableCell key={neighborhood.name}>
                  {neighborhood.predominant_type ?? "-"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Faixa anunciada</TableCell>
              {neighborhoods.map((neighborhood) => (
                <TableCell key={neighborhood.name}>
                  {neighborhood.predominant_price_range ?? "-"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Perfil típico</TableCell>
              {neighborhoods.map((neighborhood) => (
                <TableCell key={neighborhood.name}>
                  {neighborhood.typical_bedrooms ?? "-"} qts /{" "}
                  {neighborhood.typical_garage_spaces ?? "-"} vagas /{" "}
                  {neighborhood.typical_area ?? "-"} m²
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Concentração relativa</TableCell>
              {neighborhoods.map((neighborhood) => (
                <TableCell key={neighborhood.name}>
                  {neighborhood.concentration?.level === "above"
                    ? "Acima do padrão"
                    : neighborhood.concentration?.level === "below"
                      ? "Abaixo do padrão"
                      : neighborhood.concentration?.level === "neutral"
                        ? "Neutra"
                        : "Amostra insuficiente"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Amostra</TableCell>
              {neighborhoods.map((neighborhood) => (
                <TableCell key={neighborhood.name}>
                  {neighborhood.sample_size} anúncios
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
