<?php

namespace Database\Seeders;

use App\Models\Crawler\MarketDataContractVersion;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class LegacyMarketDataContractSeeder extends Seeder
{
    /**
     * Seeds the market-data contract that was configured in the Python crawler
     * before contracts became manageable from the Admin Area.
     */
    public function run(): void
    {
        $actor = User::query()
            ->where('email', 'platform@imobiliaria.com')
            ->firstOrFail();
        $fields = $this->legacyFields();

        DB::transaction(function () use ($actor, $fields): void {
            $contracts = MarketDataContractVersion::query()
                ->lockForUpdate()
                ->get();

            if ($contracts->contains(fn (MarketDataContractVersion $contract): bool => $this->hasFields($contract, $fields))) {
                return;
            }

            $hasActiveContract = $contracts->contains(
                fn (MarketDataContractVersion $contract): bool => $contract->status === 'active'
            );

            MarketDataContractVersion::query()->create([
                'version' => ((int) $contracts->max('version')) + 1,
                'status' => $hasActiveContract ? 'draft' : 'active',
                'fields' => $fields,
                'compatibility' => $hasActiveContract ? null : 'additive_optional',
                'affected_agency_ids' => [],
                'created_by' => $actor->id,
                'activated_by' => $hasActiveContract ? null : $actor->id,
                'activated_at' => $hasActiveContract ? null : now(),
            ]);
        });
    }

    /**
     * @return list<array{name: string, description: string, type: string, required: bool, normalization: list<string>, coerce: string}>
     */
    private function legacyFields(): array
    {
        return [
            $this->field('url', 'URL da página do imóvel', 'url', true, ['url'], 'string'),
            $this->field('imagem', 'URL da imagem principal do imóvel', 'url', true, ['image_url'], 'string'),
            $this->field('tipo_imovel', 'Tipo do imóvel (apartamento, casa, terreno, sala comercial)', 'string', true, ['property_type'], 'string'),
            $this->field('quartos', 'Número de quartos', 'integer', false, ['integer'], 'int'),
            $this->field('sala', 'Número de salas', 'integer', false, ['integer'], 'int'),
            $this->field('banheiros', 'Número de banheiros', 'integer', false, ['integer'], 'int'),
            $this->field('suites', 'Número de suítes', 'integer', false, ['integer'], 'int'),
            $this->field('vagas', 'Número de vagas de garagem', 'integer', false, ['integer'], 'int'),
            $this->field('ano', 'Ano de construção', 'integer', false, ['year'], 'int'),
            $this->field('valor', 'Valor do imóvel', 'decimal', true, ['currency_brl'], 'currency'),
            $this->field('area_privada', 'Área privada em metros quadrados', 'decimal', false, ['area_m2'], 'float'),
            $this->field('area_util', 'Área útil em metros quadrados', 'decimal', false, ['area_m2'], 'float'),
            $this->field('detalhes', 'Descrição detalhada do imóvel', 'string', false, ['trim'], 'string'),
            $this->field('bairro', 'Bairro onde o imóvel está localizado', 'string', true, ['trim'], 'string'),
            $this->field('cidade', 'Cidade onde o imóvel está localizado', 'string', true, ['trim'], 'string'),
            $this->field('piscina', 'Indica se o imóvel possui piscina', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('churrasqueira', 'Indica se o imóvel possui churrasqueira', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('academia', 'Indica se o imóvel ou condomínio possui academia', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('salao_festas', 'Indica se o imóvel ou condomínio possui salão de festas', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('playground', 'Indica se o imóvel ou condomínio possui playground', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('sacada', 'Indica se o imóvel possui sacada', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('mobiliado', 'Indica se o imóvel está mobiliado', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('ar_condicionado', 'Indica se o imóvel possui ar condicionado', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('lavanderia', 'Indica se o imóvel possui lavanderia', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('escritorio', 'Indica se o imóvel possui escritório', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('closet', 'Indica se o imóvel possui closet', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('elevador', 'Indica se o imóvel ou condomínio possui elevador', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('portaria_24h', 'Indica se o imóvel ou condomínio possui portaria 24h', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('aceita_permuta', 'Indica se o imóvel aceita permuta', 'boolean', false, ['boolean'], 'boolean'),
            $this->field('financiamento', 'Indica se o imóvel aceita financiamento', 'boolean', false, ['boolean'], 'boolean'),
        ];
    }

    /**
     * @return array{name: string, description: string, type: string, required: bool, normalization: list<string>, coerce: string}
     */
    private function field(string $name, string $description, string $type, bool $required, array $normalization, string $coerce): array
    {
        return compact('name', 'description', 'type', 'required', 'normalization', 'coerce');
    }

    /**
     * PostgreSQL JSONB does not preserve object key order, so compare each
     * field as canonical JSON instead of comparing PHP arrays directly.
     *
     * @param  list<array<string, mixed>>  $fields
     */
    private function hasFields(MarketDataContractVersion $contract, array $fields): bool
    {
        $canonicalize = fn (array $field): string => json_encode(Arr::sortRecursive($field), JSON_THROW_ON_ERROR);

        return collect($contract->fields)
            ->map($canonicalize)
            ->sort()
            ->values()
            ->all() === collect($fields)
            ->map($canonicalize)
            ->sort()
            ->values()
            ->all();
    }
}
