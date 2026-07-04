<?php

namespace App\Services\Valuation;

use App\Models\PropertyValuation;
use ZipArchive;

class ComparableEvidenceExcelGenerator
{
    public function generate(PropertyValuation $valuation): string
    {
        $strings = [];
        $stringIndexes = [];
        $rows = $this->rows($valuation);
        $path = tempnam(sys_get_temp_dir(), 'valuation-xlsx-');
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::OVERWRITE);

        $zip->addFromString('[Content_Types].xml', $this->contentTypes());
        $zip->addFromString('_rels/.rels', $this->packageRelationships());
        $zip->addFromString('xl/workbook.xml', $this->workbook());
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRelationships());
        $zip->addFromString('xl/styles.xml', $this->styles());
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->worksheet($rows, $strings, $stringIndexes));
        $zip->addFromString('xl/sharedStrings.xml', $this->sharedStrings($strings));
        $zip->close();

        $contents = file_get_contents($path);
        unlink($path);

        return $contents === false ? '' : $contents;
    }

    private function rows(PropertyValuation $valuation): array
    {
        $rows = [
            [
                ['s', 'Imóveis comparáveis'],
                ['s', $valuation->code],
            ],
            [
                ['s', 'Imobiliária'],
                ['s', $valuation->agency?->name ?? '-'],
            ],
            [],
            [
                ['s', 'Item'],
                ['s', 'Status'],
                ['s', 'Imobiliária'],
                ['s', 'Link'],
                ['s', 'Cidade'],
                ['s', 'Bairro'],
                ['s', 'Tipo'],
                ['s', 'Área m²'],
                ['s', 'Quartos'],
                ['s', 'Banheiros'],
                ['s', 'Vagas'],
                ['s', 'Valor anunciado'],
                ['s', 'R$/m²'],
            ],
        ];

        foreach (($valuation->comparable_evidence ?? []) as $index => $comparable) {
            $rows[] = [
                ['n', $index + 1],
                ['s', $this->reviewStatusLabel($comparable['review_status'] ?? null)],
                ['s', (string) ($comparable['agency'] ?? '-')],
                ['s', (string) ($comparable['link'] ?? '-')],
                ['s', (string) ($comparable['city'] ?? '-')],
                ['s', (string) ($comparable['neighborhood'] ?? '-')],
                ['s', (string) ($comparable['raw_type'] ?? '-')],
                ['n', (float) ($comparable['area'] ?? 0)],
                ['n', (int) ($comparable['bedrooms'] ?? 0)],
                ['n', (int) ($comparable['bathrooms'] ?? 0)],
                ['n', (int) ($comparable['garage_spaces'] ?? 0)],
                ['n', (float) ($comparable['price'] ?? 0), 2],
                ['n', (float) ($comparable['price_per_square_meter'] ?? 0), 2],
            ];
        }

        return $rows;
    }

    private function worksheet(array $rows, array &$strings, array &$stringIndexes): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<cols>'
            .'<col min="1" max="1" width="8" customWidth="1"/>'
            .'<col min="2" max="2" width="14" customWidth="1"/>'
            .'<col min="3" max="3" width="28" customWidth="1"/>'
            .'<col min="4" max="4" width="36" customWidth="1"/>'
            .'<col min="5" max="7" width="18" customWidth="1"/>'
            .'<col min="8" max="13" width="14" customWidth="1"/>'
            .'</cols><sheetData>';

        foreach ($rows as $rowIndex => $row) {
            $number = $rowIndex + 1;
            $style = $number === 1 ? 1 : ($number === 4 ? 3 : 0);
            $xml .= '<row r="'.$number.'">';

            foreach ($row as $columnIndex => $cell) {
                [$type, $value] = $cell;
                $cellStyle = $cell[2] ?? $style;
                $ref = $this->columnName($columnIndex + 1).$number;

                if ($type === 's') {
                    $index = $this->sharedStringIndex((string) $value, $strings, $stringIndexes);
                    $xml .= '<c r="'.$ref.'" t="s" s="'.$cellStyle.'"><v>'.$index.'</v></c>';

                    continue;
                }

                $xml .= '<c r="'.$ref.'" s="'.$cellStyle.'"><v>'.$value.'</v></c>';
            }

            $xml .= '</row>';
        }

        return $xml.'</sheetData></worksheet>';
    }

    private function sharedStringIndex(string $value, array &$strings, array &$stringIndexes): int
    {
        if (array_key_exists($value, $stringIndexes)) {
            return $stringIndexes[$value];
        }

        $index = count($strings);
        $strings[] = $value;
        $stringIndexes[$value] = $index;

        return $index;
    }

    private function sharedStrings(array $strings): string
    {
        $items = array_map(fn (string $value): string => '<si><t xml:space="preserve">'.$this->escape($value).'</t></si>', $strings);

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="'.count($strings).'" uniqueCount="'.count($strings).'">'
            .implode('', $items)
            .'</sst>';
    }

    private function styles(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0"/></numFmts>'
            .'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="12"/><name val="Calibri"/></font></fonts>'
            .'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/><bgColor indexed="64"/></patternFill></fill></fills>'
            .'<borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders>'
            .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            .'<cellXfs count="4">'
            .'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            .'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
            .'<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
            .'<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
            .'</cellXfs>'
            .'</styleSheet>';
    }

    private function contentTypes(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            .'<Default Extension="xml" ContentType="application/xml"/>'
            .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            .'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            .'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            .'<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
            .'</Types>';
    }

    private function packageRelationships(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            .'</Relationships>';
    }

    private function workbook(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<sheets><sheet name="Comparáveis" sheetId="1" r:id="rId1"/></sheets>'
            .'</workbook>';
    }

    private function workbookRelationships(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            .'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            .'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>'
            .'</Relationships>';
    }

    private function columnName(int $index): string
    {
        $name = '';

        while ($index > 0) {
            $index--;
            $name = chr(65 + ($index % 26)).$name;
            $index = (int) floor($index / 26);
        }

        return $name;
    }

    private function reviewStatusLabel(mixed $status): string
    {
        return match ($status) {
            'approved' => 'Válido',
            'rejected' => 'Inválido',
            default => '-',
        };
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
    }
}
