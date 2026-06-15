<?php

namespace App\Http\Resources;

use App\Domain\Valuation\ResidentialType;
use App\Models\PropertyValuation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ValuationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var PropertyValuation $valuation */
        $valuation = $this->resource;

        return [
            'id' => $valuation->id,
            'code' => $valuation->code,
            'status' => $valuation->status,
            'status_label' => $valuation->status === PropertyValuation::STATUS_CALCULATED
                ? 'Calculada'
                : 'Amostra insuficiente',
            'subject_property' => [
                'city' => $this->locationLabel($valuation->city),
                'neighborhood' => $this->locationLabel($valuation->neighborhood),
                'residential_type' => $valuation->residential_type,
                'residential_type_label' => ResidentialType::label($valuation->residential_type),
                'area' => (float) $valuation->area,
                'bedrooms' => $valuation->bedrooms,
                'bathrooms' => $valuation->bathrooms,
                'garage_spaces' => $valuation->garage_spaces,
                'flood_risk' => $valuation->flood_risk,
            ],
            'base_range' => $this->range($valuation, 'base'),
            'final_range' => $this->range($valuation, 'final'),
            'flood_adjustment_percent' => $valuation->flood_adjustment_percent,
            'sample_summary' => $valuation->sample_summary ?? [],
            'comparable_evidence' => $valuation->comparable_evidence ?? [],
            'can_download_report' => $valuation->status === PropertyValuation::STATUS_CALCULATED,
            'calculation_summary' => $this->summary($valuation),
            'created_by' => $this->whenLoaded('user', fn () => [
                'id' => $valuation->user?->id,
                'name' => $valuation->user?->name,
                'email' => $valuation->user?->email,
            ]),
            'created_at' => $valuation->created_at?->toISOString(),
        ];
    }

    private function locationLabel(?array $values): string
    {
        if (empty($values)) {
            return '-';
        }

        return implode(', ', array_slice($values, 0, 3)).(count($values) > 3 ? '...' : '');
    }

    private function range(PropertyValuation $valuation, string $prefix): ?array
    {
        $min = $valuation->{$prefix.'_min_value'};
        $central = $valuation->{$prefix.'_central_value'};
        $max = $valuation->{$prefix.'_max_value'};

        if ($min === null || $central === null || $max === null) {
            return null;
        }

        return [
            'min' => (float) $min,
            'central' => (float) $central,
            'max' => (float) $max,
            'display' => [
                'min' => $this->money((float) $min),
                'central' => $this->money((float) $central),
                'max' => $this->money((float) $max),
            ],
        ];
    }

    private function summary(PropertyValuation $valuation): string
    {
        $summary = $valuation->sample_summary ?? [];

        if ($valuation->status !== PropertyValuation::STATUS_CALCULATED) {
            return sprintf(
                'Não há imóveis comparáveis válidos suficientes no mesmo bairro e cidade. Foram encontrados %d comparáveis e o mínimo necessário é %d.',
                (int) ($summary['total_found'] ?? 0),
                (int) ($summary['minimum_required'] ?? 5),
            );
        }

        $text = sprintf(
            'A avaliação usa %d imóveis comparáveis no mesmo bairro e cidade. A faixa de mercado usa p25, mediana e p75 do valor por metro quadrado.',
            (int) ($summary['used_count'] ?? 0),
        );

        if ((int) ($summary['invalid_count'] ?? 0) > 0 || (int) ($summary['outlier_count'] ?? 0) > 0) {
            $text .= sprintf(
                ' Foram excluídos %d registros inválidos e %d outliers.',
                (int) ($summary['invalid_count'] ?? 0),
                (int) ($summary['outlier_count'] ?? 0),
            );
        }

        if ((int) ($summary['rejected_count'] ?? 0) > 0) {
            $rejected = (int) $summary['rejected_count'];
            $text .= sprintf(
                ' %s rejeitado%s %d candidato%s comparável%s na revisão manual.',
                $rejected === 1 ? 'Foi' : 'Foram',
                $rejected === 1 ? '' : 's',
                $rejected,
                $rejected === 1 ? '' : 's',
                $rejected === 1 ? '' : 's',
            );
        }

        if ($valuation->flood_adjustment_percent !== null) {
            $text .= sprintf(' Foi aplicado ajuste de -%d%% por risco de enchente informado.', $valuation->flood_adjustment_percent);
        }

        return $text;
    }

    private function money(float $value): string
    {
        $rounded = round($value / 1000) * 1000;

        return 'R$ '.number_format($rounded, 0, ',', '.');
    }
}
