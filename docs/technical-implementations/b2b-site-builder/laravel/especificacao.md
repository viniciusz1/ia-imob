# Especificação Técnica: Backend (Laravel) - Gerador B2B de Sites

## 1. Visão Geral
Este documento detalha a arquitetura do backend para suportar a plataforma White-Label *(B2B Multi-Tenant)* de sites imobiliários, permitindo a separação de escopos de dados (Tenants), configuração visual por imobiliária e exposição de uma API Pública isolada. A implementação segue estritamente as diretrizes do `tech-laravel.md`.

---

## 2. Modelagem de Dados e Banco de Dados (Migrations & Models)

### 2.1 Multi-Tenancy Core
*   **Tenant (Agência/Imobiliária)**
    *   `id`, `name`, `document` (CNPJ/CPF único), `email`, `is_active` (boolean).
    *   Traits: `SoftDeletes`. Campos padrões: `created_at`, `updated_at`, `deleted_at`.
*   **Modificações nas Tabelas Existentes (`users`, `properties`, `leads`)**
    *   Adicionar campo obrigatório: `$table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete()`.
    *   *Índices:* Criar indexação em `tenant_id` atrelado a campos de busca (ex: `tenant_id` + `is_published` em `properties`) para máxima performance.

### 2.2 Isolamento de Dados Inteligente (Global Scopes)
Seguindo o princípio de não poluir Controllers com cláusulas `where()`, aplicaremos um Global Scope via Trait `BelongsToTenant`:
```php
trait BelongsToTenant {
    protected static function booted() {
        static::addGlobalScope('tenant', function (Builder $builder) {
            if (auth()->check()) {
                // Modo Administrativo (CRM)
                $builder->where('tenant_id', auth()->user()->tenant_id);
            } elseif (app()->bound('currentTenant')) {
               // Modo API Pública (Resolvido via Middleware de Domínio)
               $builder->where('tenant_id', app('currentTenant')->id);
            }
        });
    }
}
```

### 2.3 Domínios e Configurações de Site (Site Builder)
*   **TenantDomain**
    *   `id`, `tenant_id`, `domain` (ex: `site.com.br`, string única), `is_primary` (bool), `is_verified` (bool).
*   **TenantSiteSetting**
    *   `id`, `tenant_id` (unique no relacionamento 1:1), `theme_slug` (string, validado via enum), `primary_color` (hex), `secondary_color` (hex), `logo_path` (string), `favicon_path` (string), `whatsapp_number` (string), `instagram_url` (string).

---

## 3. Gestão de Enums e Permissões (`system_enums`)

### 3.1 Temas de Site
Adicionar ao `SystemEnumSeeder`:
```php
SystemEnum::updateOrCreate(['tag' => 'site_themes'], [
    'data' => [
        ['value' => 'modern-glass', 'label' => 'Modern Glass'],
        ['value' => 'classic-luxury', 'label' => 'Classic Luxury'],
    ],
]);
```

### 3.2 Novas Permissões (Role & Permission Seeder)
Adicionar ao `PermissionSeeder`:
- `sites.manage`: Permite ao gerente configurar cores, domínios e selecionar temas no painel administrativo.

---

## 4. API Restrita (Para o Painel CRM / Gestão da Imobiliária)
*Autenticação via Sanctum exigida.*

### 4.1. Controller: `SiteSettingController` e `DomainController`
*   **Magros:** Apenas chamam Form Requests e Actions.

### 4.2. Form Requests Rigorosas
*   `UpdateSiteSettingRequest`:
    *   `theme_slug`: Validar iterando a tag `site_themes` da tabela `system_enums` (conforme exigido em `tech-laravel.md`).
    *   `primary_color`, `secondary_color`: Validar formato `regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/`.
    *   Uploads (`logo`, `favicon`): `image|mimes:jpeg,png,svg|max:2048`.

### 4.3. Actions Modulares
*   `UpdateTenantSiteSettingsAction`: Processa a lógica de exclusão caso a imobiliária substitua a Logo atual (chamando o Storage/S3 encapsulado no bucket separando por pasta `tenants/{tenant_id}/public`) antes de salvar as variáveis HEX e do `theme_slug` na Model.

---

## 5. API Pública (Open API para o Fronend Next.js Site Viewer)
*Desacoplada do Sanctum, operada por validação de Middleware via Header `X-Domain`.*

### 5.1 Roteamento e Middleware Resolutor
*   **`routes/public.php`**: Rota limpa, sem validação de sessão em Cookie, injetada no `bootstrap/app.php`.
*   **Middleware `IdentifyTenantByDomain`**:
    *   Capta o header (ou Origin): `$domain = $request->header('X-Domain');`
    *   Busca na Model: `TenantDomain::where('domain', $domain)->where('is_verified', true)->firstOrFail()`.
    *   Acopla a instância em cache do `Tenant` resolvido para que o *Global Scope* atue automaticamente nos selects seguintes: `app()->instance('currentTenant', $tenant)`.

### 5.2 Endpoints Otimizados (Eager Loading para Performance)
*   **`GET /api/public/site-settings`**: Devolve o Resource embutindo a URL absoltuas do Storage para `logo` e envia o `theme_slug`.
*   **`GET /api/public/properties`**:
    *   Delegado ao `PublicPropertyRepository` para paginação e agrupamento de filtros (tipo, cidade, range de preço).
    *   *Core Rule Otimização*: Forçar `where('is_published', true)`.
    *   *Prevenção de N+1:* Obrigatoriedade de rodar `$query->with(['images' => fn($q) => $q->where('is_cover', true)->orderBy('order')])` resolvendo a capa no próprio DB Call.
*   **`GET /api/public/properties/{reference_code}`**: Devolve o agrupamento rico (Comodidades Inclusas via Pivot Eager Loading, Todas a Mídias ordenadas, Dados do Corretor Associado omitindo telefone/email privado dependendo as regras do CRM).

---

## 6. Sincronização e Regras de Qualidade
*   **Formato Consistente:** As respostas públicas usarão `PublicPropertyResource` focado em SEO, mapeando campos vitais previstos para o frontend Next.js estruturar Sitemaps.
*   **Teste Pest Obrigatórios:** Cobrir o fluxo da API Privada (`SiteSettingTest`) provando a validação contra inserção de `theme_slug` inexistente nos `system_enums`. Cobrir o fluxo Público (`PublicApiTest`) forçando requisição sem Headeder `X-Domain` (retornando 400 Bad Request) e consultando imóveis não publicados.
