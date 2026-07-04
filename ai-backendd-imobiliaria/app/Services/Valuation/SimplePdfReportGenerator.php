<?php

namespace App\Services\Valuation;

use App\Domain\Valuation\ResidentialType;
use App\Models\PropertyValuation;

class SimplePdfReportGenerator
{
    private array $pages = [];

    private array $commands = [];

    private float $y = 760;

    private int $pageNumber = 0;

    private ?PropertyValuation $valuation = null;

    public function generate(PropertyValuation $valuation): string
    {
        $this->pages = [];
        $this->commands = [];
        $this->pageNumber = 0;
        $this->valuation = $valuation;

        $this->newPage();
        $this->title('RELATÓRIO DE AVALIAÇÃO DE MERCADO');
        $this->center('Parecer administrativo de valor baseado em imóveis comparáveis', 12);
        $this->y -= 28;

        $this->identification($valuation);
        $this->summary($valuation);
        $this->characteristics($valuation);
        $this->methodology($valuation);
        $this->comparables($valuation);
        $this->calculation($valuation);
        $this->finalOpinion($valuation);
        $this->signatures($valuation);
        $this->finishPage();

        return $this->buildPdf();
    }

    private function identification(PropertyValuation $valuation): void
    {
        $this->section('1. Identificação do documento');
        $this->table([
            [
                ['Número da avaliação', $valuation->code],
                ['Data do parecer', $valuation->created_at?->format('d/m/Y') ?? '-'],
                ['Responsável', $valuation->user?->name ?? '-'],
            ],
            [
                ['Imobiliária', $valuation->agency?->name ?? '-'],
                ['Cidade/UF', $this->locationLabel($valuation->city)],
                ['Versão', '1.0'],
            ],
        ]);
    }

    private function summary(PropertyValuation $valuation): void
    {
        $summary = $valuation->sample_summary ?? [];

        $this->section('2. RESUMO EXECUTIVO');
        $this->table([
            [
                ['Tipo do imóvel', ResidentialType::label($valuation->residential_type)],
                ['Endereço / referência', $this->locationLabel($valuation->neighborhood).', '.$this->locationLabel($valuation->city)],
            ],
            [
                ['Área privativa / útil', $this->number((float) $valuation->area).' m²'],
                ['Valor estimado de mercado', $this->money((float) $valuation->final_central_value)],
            ],
            [
                ['Faixa de negociação', 'De '.$this->money((float) $valuation->final_min_value).' a '.$this->money((float) $valuation->final_max_value)],
                ['Liquidez esperada', $this->liquidityLabel((int) ($summary['used_count'] ?? 0))],
            ],
        ]);
    }

    private function characteristics(PropertyValuation $valuation): void
    {
        $this->section('3. Características principais');
        $this->table([
            [
                ['Dormitórios', (string) $valuation->bedrooms],
                ['Banheiros', (string) $valuation->bathrooms],
                ['Vagas', (string) $valuation->garage_spaces],
            ],
            [
                ['Risco de enchente', $valuation->flood_risk ? 'Sim' : 'Não'],
                ['Ajuste aplicado', $valuation->flood_adjustment_percent === null ? 'Não aplicado' : '-'.$valuation->flood_adjustment_percent.'%'],
                ['Status', 'Calculada'],
            ],
        ]);
    }

    private function methodology(PropertyValuation $valuation): void
    {
        $summary = $valuation->sample_summary ?? [];

        $this->section('4. Metodologia de avaliação');
        $this->paragraph('Método comparativo direto de dados de mercado, utilizando imóveis semelhantes na mesma cidade e bairro, com seleção por tipo residencial, dormitórios, vagas, banheiros e proximidade de área. A faixa usa p25, mediana e p75 do valor por metro quadrado dos comparáveis válidos.');
        $this->table([
            [
                ['Comparáveis encontrados', (string) ($summary['total_found'] ?? 0)],
                ['Inválidos removidos', (string) ($summary['invalid_count'] ?? 0)],
                ['Outliers removidos', (string) ($summary['outlier_count'] ?? 0)],
                ['Usados na avaliação', (string) ($summary['used_count'] ?? 0)],
            ],
        ]);
    }

    private function comparables(PropertyValuation $valuation): void
    {
        $this->section('5. AMOSTRAS COMPARATIVAS');
        $headers = ['Item', 'Status', 'Fonte', 'Bairro', 'Tipo', 'Área m²', 'R$/m²', 'Valor'];
        $rows = [$headers];

        foreach (array_slice($valuation->comparable_evidence ?? [], 0, 12) as $index => $comparable) {
            $rows[] = [
                (string) ($index + 1),
                $this->reviewStatusLabel($comparable['review_status'] ?? null),
                (string) ($comparable['agency'] ?? '-'),
                (string) ($comparable['neighborhood'] ?? '-'),
                (string) ($comparable['raw_type'] ?? '-'),
                $this->number((float) ($comparable['area'] ?? 0)),
                $this->money((float) ($comparable['price_per_square_meter'] ?? 0)),
                $this->money((float) ($comparable['price'] ?? 0)),
            ];
        }

        $this->grid($rows);
    }

    private function calculation(PropertyValuation $valuation): void
    {
        $this->section('6. Cálculo do valor');
        $this->table([
            [
                ['Indicador', 'Faixa mínima sugerida'],
                ['Valor / fórmula', $this->money((float) $valuation->final_min_value)],
                ['Observação', 'Base inferior do valor por m² aplicado à área do imóvel.'],
            ],
            [
                ['Indicador', 'Valor estimado de mercado'],
                ['Valor / fórmula', $this->money((float) $valuation->final_central_value)],
                ['Observação', 'Mediana ajustada do valor por m² aplicada à área do imóvel.'],
            ],
            [
                ['Indicador', 'Faixa máxima sugerida'],
                ['Valor / fórmula', $this->money((float) $valuation->final_max_value)],
                ['Observação', 'Base superior do valor por m² aplicado à área do imóvel.'],
            ],
        ]);
    }

    private function finalOpinion(PropertyValuation $valuation): void
    {
        $this->section('7. Parecer final');
        $this->paragraph('Com base nas amostras comparativas disponíveis na data-base da avaliação, o valor estimado de mercado é '.$this->money((float) $valuation->final_central_value).', com faixa sugerida entre '.$this->money((float) $valuation->final_min_value).' e '.$this->money((float) $valuation->final_max_value).'.');
        $this->section('8. Observações, limitações e responsabilidade');
        $this->paragraph('Esta avaliação depende da qualidade dos dados disponíveis, da amostra comparativa preservada e das condições de mercado na data do parecer. Não substitui laudo técnico ou pericial quando exigido por norma, banco ou decisão judicial.');
    }

    private function signatures(PropertyValuation $valuation): void
    {
        $this->section('9. Assinaturas');
        $this->table([
            [
                ['Responsável pela avaliação', "Assinatura: ______________________\nNome: ".($valuation->user?->name ?? '-')."\nData: ____/____/________"],
                ['Solicitante / Cliente', "Assinatura: ______________________\nNome: ____________________________\nData: ____/____/________"],
            ],
        ]);
    }

    private function newPage(): void
    {
        if ($this->commands !== []) {
            $this->finishPage();
        }

        $this->pageNumber++;
        $this->commands = [];
        $this->header();
        $this->footer();
        $this->y = 744;
    }

    private function finishPage(): void
    {
        if ($this->commands === []) {
            return;
        }

        $this->pages[] = implode("\n", $this->commands);
        $this->commands = [];
    }

    private function header(): void
    {
        $agencyName = $this->valuation?->agency?->name ?? 'Imobiliária';
        $this->text(45, 805, $agencyName, 'F1', 9);
        $this->text(350, 805, 'Relatório de Avaliação de Mercado', 'F1', 9);
        $this->line(45, 792, 550, 792);
    }

    private function footer(): void
    {
        $this->line(45, 38, 550, 38);
        $this->text(45, 22, 'Observação: este relatório é administrativo e não substitui laudo técnico quando exigido.', 'F1', 8);
        $this->text(514, 22, 'Página '.$this->pageNumber, 'F1', 8);
    }

    private function title(string $text): void
    {
        $this->center($text, 22, 'F2');
        $this->y -= 8;
    }

    private function center(string $text, int $size, string $font = 'F1'): void
    {
        $ascii = $this->ascii($text);
        $width = strlen($ascii) * $size * 0.5;
        $this->text((595 - $width) / 2, $this->y, $text, $font, $size);
        $this->y -= $size + 8;
    }

    private function section(string $text): void
    {
        $this->ensure(28);
        $this->text(50, $this->y, $text, 'F2', 14);
        $this->y -= 18;
    }

    private function paragraph(string $text): void
    {
        $lines = $this->wrap($text, 505, 10);
        $this->ensure((count($lines) * 13) + 8);

        foreach ($lines as $line) {
            $this->text(50, $this->y, $line, 'F1', 10);
            $this->y -= 13;
        }

        $this->y -= 6;
    }

    private function table(array $rows): void
    {
        $left = 45;
        $width = 505;

        foreach ($rows as $row) {
            $columnCount = count($row);
            $cellWidth = $width / $columnCount;
            $height = 0;
            $wrapped = [];

            foreach ($row as $cell) {
                [$label, $value] = $cell;
                $labelLines = $this->wrap($label, $cellWidth - 12, 9);
                $valueLines = [];

                foreach (explode("\n", $value) as $line) {
                    $valueLines = array_merge($valueLines, $this->wrap($line, $cellWidth - 12, 9));
                }

                $wrapped[] = [$labelLines, $valueLines];
                $height = max($height, 18 + ((count($labelLines) + count($valueLines)) * 11));
            }

            $height = max(42, $height);
            $this->ensure($height + 4);

            foreach ($wrapped as $index => [$labelLines, $valueLines]) {
                $x = $left + ($index * $cellWidth);
                $this->rect($x, $this->y - $height, $cellWidth, $height);
                $lineY = $this->y - 14;

                foreach ($labelLines as $line) {
                    $this->text($x + 5, $lineY, $line, 'F2', 9);
                    $lineY -= 11;
                }

                foreach ($valueLines as $line) {
                    $this->text($x + 5, $lineY, $line, 'F1', 9);
                    $lineY -= 11;
                }
            }

            $this->y -= $height;
        }

        $this->y -= 14;
    }

    private function grid(array $rows): void
    {
        $left = 45;
        $width = 505;
        $columnCount = count($rows[0]);
        $cellWidth = $width / $columnCount;

        foreach ($rows as $rowIndex => $row) {
            $height = $rowIndex === 0 ? 24 : 30;
            $this->ensure($height + 2);

            foreach ($row as $columnIndex => $value) {
                $x = $left + ($columnIndex * $cellWidth);

                if ($rowIndex === 0) {
                    $this->fillRect($x, $this->y - $height, $cellWidth, $height, '0.90');
                }

                $this->rect($x, $this->y - $height, $cellWidth, $height);
                $font = $rowIndex === 0 ? 'F2' : 'F1';
                $size = $rowIndex === 0 ? 7 : 7;
                $lines = array_slice($this->wrap($value, $cellWidth - 6, $size), 0, 2);
                $lineY = $this->y - 10;

                foreach ($lines as $line) {
                    $this->text($x + 3, $lineY, $line, $font, $size);
                    $lineY -= 8;
                }
            }

            $this->y -= $height;
        }

        $this->y -= 14;
    }

    private function ensure(float $needed): void
    {
        if (($this->y - $needed) < 56) {
            $this->newPage();
        }
    }

    private function text(float $x, float $y, string $text, string $font = 'F1', int $size = 10): void
    {
        $this->commands[] = sprintf(
            'BT /%s %d Tf 1 0 0 1 %.2F %.2F Tm (%s) Tj ET',
            $font,
            $size,
            $x,
            $y,
            $this->escape($text)
        );
    }

    private function line(float $x1, float $y1, float $x2, float $y2): void
    {
        $this->commands[] = sprintf('0.5 w %.2F %.2F m %.2F %.2F l S', $x1, $y1, $x2, $y2);
    }

    private function rect(float $x, float $y, float $width, float $height): void
    {
        $this->commands[] = sprintf('0.5 w %.2F %.2F %.2F %.2F re S', $x, $y, $width, $height);
    }

    private function fillRect(float $x, float $y, float $width, float $height, string $gray): void
    {
        $this->commands[] = sprintf('q %s g %.2F %.2F %.2F %.2F re f Q', $gray, $x, $y, $width, $height);
    }

    private function buildPdf(): string
    {
        $objects = [];
        $pageObjectIds = [];
        $nextObjectId = 5;

        foreach ($this->pages as $content) {
            $pageObjectId = $nextObjectId++;
            $contentObjectId = $nextObjectId++;
            $pageObjectIds[] = $pageObjectId;
            $stream = $content."\n";

            $objects[$pageObjectId] = "{$pageObjectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {$contentObjectId} 0 R >>\nendobj\n";
            $objects[$contentObjectId] = "{$contentObjectId} 0 obj\n<< /Length ".strlen($stream)." >>\nstream\n$stream\nendstream\nendobj\n";
        }

        $objects[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        $objects[2] = '2 0 obj'."\n<< /Type /Pages /Kids [".implode(' ', array_map(fn (int $id): string => "{$id} 0 R", $pageObjectIds)).'] /Count '.count($pageObjectIds)." >>\nendobj\n";
        $objects[3] = "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
        $objects[4] = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";
        ksort($objects);

        $pdf = "%PDF-1.4\n";
        $offsets = [0];

        foreach ($objects as $id => $object) {
            $offsets[$id] = strlen($pdf);
            $pdf .= $object;
        }

        $xrefOffset = strlen($pdf);
        $maxObjectId = max(array_keys($objects));
        $pdf .= "xref\n0 ".($maxObjectId + 1)."\n";
        $pdf .= "0000000000 65535 f \n";

        for ($i = 1; $i <= $maxObjectId; $i++) {
            $pdf .= str_pad((string) ($offsets[$i] ?? 0), 10, '0', STR_PAD_LEFT)." 00000 n \n";
        }

        $pdf .= "trailer\n<< /Size ".($maxObjectId + 1)." /Root 1 0 R >>\n";
        $pdf .= "startxref\n$xrefOffset\n%%EOF";

        return $pdf;
    }

    private function wrap(string $text, float $width, int $fontSize): array
    {
        $ascii = $this->ascii($text);
        $maxChars = max(8, (int) floor($width / ($fontSize * 0.48)));
        $wrapped = wordwrap($ascii, $maxChars, "\n", true);

        return explode("\n", $wrapped);
    }

    private function money(float $value): string
    {
        $rounded = round($value / 1000) * 1000;

        return 'R$ '.number_format($rounded, 0, ',', '.');
    }

    private function number(float $value): string
    {
        return number_format($value, 2, ',', '.');
    }

    private function reviewStatusLabel(mixed $status): string
    {
        return match ($status) {
            'approved' => 'Válido',
            'rejected' => 'Inválido',
            default => '-',
        };
    }

    private function liquidityLabel(int $usedCount): string
    {
        if ($usedCount >= 15) {
            return 'Alta';
        }

        return $usedCount >= 8 ? 'Média' : 'Baixa';
    }

    private function escape(string $value): string
    {
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $this->ascii($value));
    }

    private function locationLabel(?array $values): string
    {
        if (empty($values)) {
            return '-';
        }

        return implode(', ', array_slice($values, 0, 3)).(count($values) > 3 ? '...' : '');
    }

    private function ascii(string $value): string
    {
        return iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
    }
}
