<?php

namespace App\Services\Valuation;

use App\Domain\Valuation\ResidentialType;
use App\Models\PropertyValuation;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class WordValuationReportGenerator
{
    public function generate(PropertyValuation $valuation): string
    {
        $logo = $this->logo($valuation);
        $path = tempnam(sys_get_temp_dir(), 'valuation-docx-');
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::OVERWRITE);

        $zip->addFromString('[Content_Types].xml', $this->contentTypes($logo !== null));
        $zip->addFromString('_rels/.rels', $this->packageRelationships());
        $zip->addFromString('word/document.xml', $this->document($valuation));
        $zip->addFromString('word/styles.xml', $this->styles());
        $zip->addFromString('word/header1.xml', $this->header($valuation, $logo !== null));
        $zip->addFromString('word/footer1.xml', $this->footer());
        $zip->addFromString('word/_rels/document.xml.rels', $this->documentRelationships());

        if ($logo !== null) {
            $zip->addFromString('word/media/logo.'.$logo['extension'], $logo['contents']);
            $zip->addFromString('word/_rels/header1.xml.rels', $this->headerRelationships($logo['extension']));
        }

        $zip->close();

        $contents = file_get_contents($path);
        unlink($path);

        return $contents === false ? '' : $contents;
    }

    private function document(PropertyValuation $valuation): string
    {
        $summary = $valuation->sample_summary ?? [];
        $comparables = $valuation->comparable_evidence ?? [];
        $body = [
            $this->paragraph('RELATÓRIO DE AVALIAÇÃO DE MERCADO', 'Title'),
            $this->paragraph('Parecer administrativo de valor baseado em imóveis comparáveis preservados na avaliação salva.', 'Subtitle'),
            $this->paragraph(''),
            $this->section('1. Identificação do documento'),
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
            ]),
            $this->section('2. Resumo executivo'),
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
            ]),
            $this->section('3. Características principais'),
            $this->table([
                [
                    ['Dormitórios', (string) $valuation->bedrooms],
                    ['Banheiros', (string) $valuation->bathrooms],
                    ['Vagas', (string) $valuation->garage_spaces],
                ],
                [
                    ['Risco de enchente', $valuation->flood_risk ? 'Sim' : 'Não'],
                    ['Ajuste aplicado', $valuation->flood_adjustment_percent === null ? 'Não aplicado' : '-'.$valuation->flood_adjustment_percent.'%'],
                    ['Status', $valuation->status === PropertyValuation::STATUS_CALCULATED ? 'Calculada' : 'Amostra insuficiente'],
                ],
            ]),
            $this->section('4. Metodologia de avaliação'),
            $this->paragraph('Método comparativo direto de dados de mercado, utilizando imóveis semelhantes na mesma cidade e bairro, com seleção por tipo residencial, dormitórios, vagas, banheiros e proximidade de área. A faixa usa p25, mediana e p75 do valor por metro quadrado dos comparáveis válidos.'),
            $this->table([
                [
                    ['Comparáveis encontrados', (string) ($summary['total_found'] ?? 0)],
                    ['Inválidos removidos', (string) ($summary['invalid_count'] ?? 0)],
                    ['Outliers removidos', (string) ($summary['outlier_count'] ?? 0)],
                    ['Usados na avaliação', (string) ($summary['used_count'] ?? 0)],
                ],
            ]),
            $this->section('5. Amostras comparativas de mercado'),
            $this->comparablesTable($comparables),
            $this->section('6. Cálculo do valor'),
            $this->table([
                [
                    ['Indicador', 'Valor / fórmula', 'Observação'],
                ],
                [
                    ['Faixa mínima sugerida', $this->money((float) $valuation->final_min_value), 'Base inferior do valor por m² aplicado à área do imóvel.'],
                ],
                [
                    ['Valor estimado de mercado', $this->money((float) $valuation->final_central_value), 'Mediana ajustada do valor por m² aplicada à área do imóvel.'],
                ],
                [
                    ['Faixa máxima sugerida', $this->money((float) $valuation->final_max_value), 'Base superior do valor por m² aplicado à área do imóvel.'],
                ],
            ]),
            $this->section('7. Parecer final'),
            $this->paragraph('Com base nas amostras comparativas disponíveis na data-base da avaliação, o valor estimado de mercado é '.$this->money((float) $valuation->final_central_value).', com faixa sugerida entre '.$this->money((float) $valuation->final_min_value).' e '.$this->money((float) $valuation->final_max_value).'.'),
            $this->section('8. Observações, limitações e responsabilidade'),
            $this->paragraph('Esta avaliação depende da qualidade dos dados disponíveis, da amostra comparativa preservada e das condições de mercado na data do parecer. Não substitui laudo técnico ou pericial quando exigido por norma, banco ou decisão judicial.'),
            $this->section('9. Assinaturas'),
            $this->signatureTable($valuation),
        ];

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<w:body>'.implode('', $body)
            .'<w:sectPr>'
            .'<w:headerReference w:type="default" r:id="rIdHeader1"/>'
            .'<w:footerReference w:type="default" r:id="rIdFooter1"/>'
            .'<w:pgSz w:w="11906" w:h="16838"/>'
            .'<w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="450" w:footer="450" w:gutter="0"/>'
            .'</w:sectPr></w:body></w:document>';
    }

    private function header(PropertyValuation $valuation, bool $hasLogo): string
    {
        $logo = $hasLogo ? '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">'
            .'<wp:extent cx="914400" cy="457200"/><wp:docPr id="1" name="Logo"/>'
            .'<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            .'<pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="logo"/><pic:cNvPicPr/></pic:nvPicPr>'
            .'<pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
            .'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/></a:xfrm><a:prstGeom prst="rect"/></pic:spPr>'
            .'</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>' : '';

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            .'<w:p><w:pPr><w:jc w:val="both"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="111827"/></w:pBdr></w:pPr>'
            .$logo
            .$this->run($valuation->agency?->name ?? 'Imobiliária', true)
            .$this->run('    Documento administrativo de avaliação de mercado')
            .'</w:p></w:hdr>';
    }

    private function footer(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            .'<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="111827"/></w:pBdr></w:pPr>'
            .$this->run('Observação: este relatório é administrativo e não substitui laudo técnico quando exigido.', false, 18)
            .'</w:p></w:ftr>';
    }

    private function comparablesTable(array $comparables): string
    {
        $rows = [
            [
                ['Item', ''],
                ['Status', ''],
                ['Fonte / link', ''],
                ['Bairro', ''],
                ['Tipo', ''],
                ['Área m²', ''],
                ['R$/m²', ''],
                ['Valor anunciado', ''],
            ],
        ];

        foreach (array_slice($comparables, 0, 12) as $index => $comparable) {
            $rows[] = [
                [(string) ($index + 1), ''],
                [$this->reviewStatusLabel($comparable['review_status'] ?? null), ''],
                [(string) ($comparable['agency'] ?? $comparable['link'] ?? '-'), ''],
                [(string) ($comparable['neighborhood'] ?? '-'), ''],
                [(string) ($comparable['raw_type'] ?? '-'), ''],
                [$this->number((float) ($comparable['area'] ?? 0)), ''],
                [$this->money((float) ($comparable['price_per_square_meter'] ?? 0)), ''],
                [$this->money((float) ($comparable['price'] ?? 0)), ''],
            ];
        }

        return $this->table($rows, true);
    }

    private function signatureTable(PropertyValuation $valuation): string
    {
        return $this->table([
            [
                ['Responsável pela avaliação', "Assinatura: _______________________________\nNome: ".($valuation->user?->name ?? '____________________________________')."\nData: ____/____/________"],
                ['Solicitante / Cliente', "Assinatura: _______________________________\nNome: ____________________________________\nData: ____/____/________"],
            ],
        ]);
    }

    private function table(array $rows, bool $firstRowHeader = false): string
    {
        $xml = '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>'
            .'<w:top w:val="single" w:sz="4" w:color="111827"/><w:left w:val="single" w:sz="4" w:color="111827"/>'
            .'<w:bottom w:val="single" w:sz="4" w:color="111827"/><w:right w:val="single" w:sz="4" w:color="111827"/>'
            .'<w:insideH w:val="single" w:sz="4" w:color="111827"/><w:insideV w:val="single" w:sz="4" w:color="111827"/>'
            .'</w:tblBorders></w:tblPr>';

        foreach ($rows as $rowIndex => $row) {
            $xml .= '<w:tr>';
            foreach ($row as $cell) {
                [$label, $value] = $cell;
                $isHeader = $firstRowHeader && $rowIndex === 0;
                $xml .= '<w:tc><w:tcPr><w:tcW w:w="'.(int) floor(10000 / max(1, count($row))).'" w:type="pct"/>'
                    .($isHeader ? '<w:shd w:fill="E5E7EB"/>' : '')
                    .'</w:tcPr>';
                $xml .= $this->paragraph($label, $isHeader ? 'TableHeader' : 'CellLabel');

                if ($value !== '') {
                    foreach (explode("\n", $value) as $line) {
                        $xml .= $this->paragraph($line, 'CellText');
                    }
                }

                $xml .= '</w:tc>';
            }
            $xml .= '</w:tr>';
        }

        return $xml.'</w:tbl>'.$this->paragraph('');
    }

    private function section(string $text): string
    {
        return $this->paragraph($text, 'Heading');
    }

    private function paragraph(string $text, string $style = 'Normal'): string
    {
        $styleId = match ($style) {
            'Title' => 'Title',
            'Subtitle' => 'Subtitle',
            'Heading' => 'Heading1',
            'CellLabel' => 'CellLabel',
            'CellText' => 'CellText',
            'TableHeader' => 'TableHeader',
            default => 'Normal',
        };

        return '<w:p><w:pPr><w:pStyle w:val="'.$styleId.'"/></w:pPr>'.$this->run($text, in_array($style, ['Heading', 'CellLabel', 'TableHeader'], true)).'</w:p>';
    }

    private function run(string $text, bool $bold = false, int $size = 22): string
    {
        return '<w:r><w:rPr>'.($bold ? '<w:b/>' : '').'<w:sz w:val="'.$size.'"/></w:rPr><w:t xml:space="preserve">'.$this->escape($text).'</w:t></w:r>';
    }

    private function logo(PropertyValuation $valuation): ?array
    {
        $path = $valuation->agency?->siteSettings?->logo_path;

        if (! is_string($path) || $path === '' || filter_var($path, FILTER_VALIDATE_URL)) {
            return null;
        }

        if (! Storage::disk('public')->exists($path)) {
            return null;
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if (! in_array($extension, ['png', 'jpg', 'jpeg'], true)) {
            return null;
        }

        return [
            'extension' => $extension === 'jpg' ? 'jpeg' : $extension,
            'contents' => Storage::disk('public')->get($path),
        ];
    }

    private function contentTypes(bool $hasLogo): string
    {
        $imageTypes = $hasLogo ? '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>' : '';

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            .'<Default Extension="xml" ContentType="application/xml"/>'.$imageTypes
            .'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            .'<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
            .'<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
            .'<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
            .'</Types>';
    }

    private function packageRelationships(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            .'</Relationships>';
    }

    private function documentRelationships(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            .'<Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
            .'<Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
            .'</Relationships>';
    }

    private function headerRelationships(string $extension): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.'.$extension.'"/>'
            .'</Relationships>';
    }

    private function styles(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            .$this->style('Normal', 'Calibri', 22, false)
            .$this->style('Title', 'Calibri', 36, true, 'center')
            .$this->style('Subtitle', 'Calibri', 24, false, 'center')
            .$this->style('Heading1', 'Calibri', 28, true)
            .$this->style('CellLabel', 'Calibri', 21, true)
            .$this->style('CellText', 'Calibri', 20, false)
            .$this->style('TableHeader', 'Calibri', 20, true)
            .'</w:styles>';
    }

    private function style(string $id, string $font, int $size, bool $bold, ?string $align = null): string
    {
        return '<w:style w:type="paragraph" w:styleId="'.$id.'"><w:name w:val="'.$id.'"/>'
            .'<w:pPr>'.($align ? '<w:jc w:val="'.$align.'"/>' : '').'</w:pPr>'
            .'<w:rPr><w:rFonts w:ascii="'.$font.'" w:hAnsi="'.$font.'"/>'.($bold ? '<w:b/>' : '').'<w:sz w:val="'.$size.'"/></w:rPr>'
            .'</w:style>';
    }

    private function liquidityLabel(int $usedCount): string
    {
        if ($usedCount >= 15) {
            return 'Alta';
        }

        return $usedCount >= 8 ? 'Média' : 'Baixa';
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

    private function locationLabel(?array $values): string
    {
        if (empty($values)) {
            return '-';
        }

        return implode(', ', array_slice($values, 0, 3)).(count($values) > 3 ? '...' : '');
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
    }
}
