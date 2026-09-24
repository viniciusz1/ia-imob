<?php

namespace Tests\Unit\Valuation;

use App\Models\PropertyValuation;
use App\Services\Valuation\ComparableEvidenceExcelGenerator;
use App\Services\Valuation\SimplePdfReportGenerator;
use App\Services\Valuation\WordValuationReportGenerator;
use DOMDocument;
use DOMXPath;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use ZipArchive;

class ValuationReportsTest extends TestCase
{
    public static function purposes(): array
    {
        return ['rent' => ['rent'], 'sale' => ['sale']];
    }

    #[DataProvider('purposes')]
    public function test_pdf_preserves_estimate_and_comparable_amounts_with_the_correct_period(string $purpose): void
    {
        $pdf = (new SimplePdfReportGenerator)->generate($this->valuation($purpose));
        $this->assertStringStartsWith('%PDF-', $pdf);
        preg_match_all('/\((.*)\) Tj ET/', $pdf, $matches);
        $text = preg_replace('/\s+/', ' ', implode(' ', $matches[1]));

        if ($purpose === 'rent') {
            $this->assertStringContainsString('Aluguel mensal estimado', $text);
            foreach (['2.812,35', '4.374,76', '5.937,17', '2.350,50', '23,51'] as $amount) {
                $this->assertStringContainsString('R$ '.$amount.' /mes', $text);
            }
            $this->assertStringContainsString('R$/m2/mes', $text);
        } else {
            $this->assertStringContainsString('R$ 720.000', $text);
            $this->assertStringNotContainsString('/mes', $text);
            $this->assertStringNotContainsString('Aluguel mensal', $text);
        }
    }

    #[DataProvider('purposes')]
    public function test_word_identifies_monthly_prices_in_the_summary_and_comparable_table(string $purpose): void
    {
        $files = $this->officeFiles((new WordValuationReportGenerator)->generate($this->valuation($purpose)), ['word/document.xml']);
        $document = new DOMDocument;
        $this->assertTrue($document->loadXML($files['word/document.xml']));
        $text = $document->textContent;
        if ($purpose === 'rent') {
            $this->assertStringContainsString('Aluguel mensal estimado', $text);
            $this->assertStringContainsString('R$/m²/mês', $text);
            foreach (['2.812,35', '4.374,76', '5.937,17', '2.350,50', '23,51'] as $amount) {
                $this->assertStringContainsString('R$ '.$amount.' /mês', $text);
            }
        } else {
            $this->assertStringContainsString('R$ 720.000', $text);
            $this->assertStringNotContainsString('/mês', $text);
            $this->assertStringNotContainsString('Aluguel mensal', $text);
        }
    }

    #[DataProvider('purposes')]
    public function test_excel_keeps_numeric_cells_and_applies_monthly_formats_to_rent_only(string $purpose): void
    {
        $files = $this->officeFiles((new ComparableEvidenceExcelGenerator)->generate($this->valuation($purpose)), [
            'xl/worksheets/sheet1.xml', 'xl/styles.xml', 'xl/sharedStrings.xml',
        ]);
        $sheet = $this->spreadsheetXml($files['xl/worksheets/sheet1.xml']);
        $styles = $this->spreadsheetXml($files['xl/styles.xml']);
        $strings = $this->spreadsheetXml($files['xl/sharedStrings.xml']);

        // Column L contains the comparable price; M contains its price per m².
        foreach (['L5' => 2350.50, 'M5' => 23.505, 'C9' => 2812.35, 'D9' => 4374.76, 'E9' => 5937.17] as $ref => $expected) {
            $cell = $sheet->query('//s:c[@r="'.$ref.'"]')->item(0);
            $this->assertNotNull($cell);
            $this->assertNotSame('s', $cell->getAttribute('t'), 'Amounts must remain usable in Excel formulas.');
            if ($purpose === 'rent') {
                $this->assertEqualsWithDelta($expected, (float) $cell->textContent, 0.000001);
            }
            $style = $styles->query('//s:cellXfs/s:xf')->item((int) $cell->getAttribute('s'));
            $format = $styles->query('//s:numFmt[@numFmtId="'.$style->getAttribute('numFmtId').'"]')->item(0)->getAttribute('formatCode');
            if ($purpose === 'rent') {
                $this->assertStringContainsString($ref === 'M5' ? '/m²/mês' : '/mês', $format);
                $this->assertStringContainsString('#,##0.00', $format);
            } else {
                $this->assertStringNotContainsString('/mês', $format);
            }
        }
        $text = $strings->document->textContent;
        $this->assertStringContainsString($purpose === 'rent' ? 'Faixa de aluguel mensal estimada' : 'Faixa de venda estimada', $text);
    }

    public function test_pdf_does_not_truncate_large_monthly_comparable_prices(): void
    {
        $valuation = $this->valuation('rent');
        $evidence = $valuation->comparable_evidence;
        $evidence[0]['price'] = 123456789.12;
        $valuation->comparable_evidence = $evidence;
        $pdf = (new SimplePdfReportGenerator)->generate($valuation);
        preg_match_all('/\((.*)\) Tj ET/', $pdf, $matches);
        $text = preg_replace('/\s+/', ' ', implode(' ', $matches[1]));
        $this->assertStringContainsString('R$ 123.456.789,12 /mes', $text);
    }

    private function valuation(string $purpose): PropertyValuation
    {
        $valuation = new PropertyValuation([
            'code' => 'AVL-REPORT-TEST', 'purpose' => $purpose, 'status' => 'calculated',
            'city' => ['Cidade Teste'], 'neighborhood' => ['Centro'], 'residential_type' => 'house',
            'area' => 123.45, 'bedrooms' => 3, 'bathrooms' => 2, 'garage_spaces' => 1,
            'flood_risk' => false, 'sample_summary' => ['used_count' => 1],
            'final_min_value' => $purpose === 'rent' ? 2812.35 : 660000,
            'final_central_value' => $purpose === 'rent' ? 4374.76 : 720000,
            'final_max_value' => $purpose === 'rent' ? 5937.17 : 780000,
            'comparable_evidence' => [[
                // Purpose is taken from the saved valuation, even without per-item metadata.
                'area' => 100, 'price' => $purpose === 'rent' ? 2350.50 : 600000,
                'price_per_square_meter' => $purpose === 'rent' ? 23.505 : 6000,
                'review_status' => 'approved', 'raw_type' => 'Casa',
            ]],
        ]);
        $valuation->setRelation('agency', null);
        $valuation->setRelation('user', null);

        return $valuation;
    }

    private function officeFiles(string $contents, array $names): array
    {
        $path = tempnam(sys_get_temp_dir(), 'valuation-test-');
        file_put_contents($path, $contents);
        $zip = new ZipArchive;
        try {
            $this->assertTrue($zip->open($path));
            $files = [];
            foreach ($names as $name) {
                $files[$name] = $zip->getFromName($name);
                $this->assertIsString($files[$name]);
            }

            return $files;
        } finally {
            $zip->close();
            unlink($path);
        }
    }

    private function spreadsheetXml(string $xml): DOMXPath
    {
        $document = new DOMDocument;
        $this->assertTrue($document->loadXML($xml));
        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('s', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        return $xpath;
    }
}
