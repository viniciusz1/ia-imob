# Detalhamento de Execução: Plataforma White-Label B2B (Módulo de Sites)

Este documento traduz o plano estrutural ("O que fazer") num **Guia de Execução Técnica ("Como fazer")**, totalmente alinhado com as regras do sistema prescritas em `.agents/rules/`.

---

## FASE 1: Fundação Multi-Tenant (Backend - Laravel)
*Regras aplicáveis: `tech-laravel.md` (item 1, 4 e 5)*

**Ojetivo:** Preparar o banco de dados e as models para suportar múliplas imobiliárias isoladas sem vazar dados entre elas.

### 1. Modelagem Inicial
- Criar a entity `Tenant`:
  - `php artisan make:model Tenant -m`
  - Migration: `id`, `name`, `document` (CNPJ), `email` (contato), `is_active`, `timestamps`, `softDeletes`.
- Criar a entity `TenantDomain`:
  - `php artisan make:model TenantDomain -m`
  - Migration: `id`, `tenant_id`, `domain` (ex: `www.imobizi.com`), `is_primary` (boolean), `is_verified` (boolean), `ssl_status`.

### 2. Isolamento de Escopo (Global Scopes)
- Alterar as principais Migrations (`users`, `properties`, `leads`) para incluir um `$table->foreignId('tenant_id')->constrained()`.
- Criar uma Trait `BelongsToTenant`:
  ```php
  trait BelongsToTenant {
      protected static function booted() {
          static::addGlobalScope('tenant', function (Builder $builder) {
              if (auth()->check()) {
                  $builder->where('tenant_id', auth()->user()->tenant_id);
              }
              // Opcional: Se a requisição vier da API pública (site), o tenant_id é resolvido via Header/QueryParam injetado pelo Middleware.
          });
      }
  }
  ```
- Aplicar a Trait nos Models: `User`, `Property`, `Lead`.

---

## FASE 2: API de Gestão do Site no CRM (Backend - Laravel)
*Regras aplicáveis: `tech-laravel.md` (item 1, 2, 3 e 6)*

**Objetivo:** Fornecer endpoints protegidos pelo Sanctum onde o gestor da imobiliária personalize o site.

### 1. Customização (TenantSiteSetting)
- Migration: `id`, `tenant_id`, `theme_slug` (enum/string - validado via `system_enums`), `primary_color`, `secondary_color`, `logo_path`, `favicon_path`, `facebook_url`, `instagram_url`, `whatsapp_number`, `google_analytics_id`.
- Criar `SystemEnumSeeder` para temas:
  ```php
  SystemEnum::updateOrCreate(['tag' => 'site_themes'], [
      'data' => [
          ['value' => 'modern-glass', 'label' => 'Modern Glass'],
          ['value' => 'classic-luxury', 'label' => 'Classic Luxury'],
      ]
  ]);
  ```

### 2. Arquitetura (Action/Service/Repository)
- **Controller Magro:** `TenantSiteSettingController`
- **Form Request:** `UpdateSiteSettingRequest` validando cores com regex HEX, URLs com `url`, e uploads via rules exclusivas para imagens (`mimes:jpeg,png,svg`). Validar `theme_slug` forçando que ele exista na tag `site_themes` do `system_enums`.
- **Action:** `UpdateTenantSiteSettingsAction` encarregada de gerir os arquivos no `$storage->put('tenants/{id}/public/...` e salvar as strings/HEX na model de Settings.
- **Resource:** `TenantSiteSettingResource` montando o response mapeado.

---

## FASE 3: API Aberta (API Pública para o Frontend Next.js B2B)
*Regras aplicáveis: `tech-laravel.md` (item 3 e 8)*

**Objetivo:** Servir os dados para o Next.js público sem o uso de tokens Sanctum por visitante, mas com validação rigorosa via domínio.

### 1. Roteamento Público e Middleware
- Criar rota `routes/public.php` (ou prefixo em `api.php`).
- Criar Middleware `IdentifyTenantByDomain`:
  - Lê o cabeçalho passado pelo Next.js (ex: `X-Domain: www.site-da-imob.com.br`).
  - Busca na model `TenantDomain` -> Descobre o `tenant_id`.
  - Se não achar, aborta 404 (domínio descadastrado).
  - Guarda o `Tenant` atual num Service Container ou injeta o escopo global.

### 2. Endpoints e Performance (Prevenindo N+1)
- `GET /api/public/site-settings`: Retorna cores, logo e tema escolhido (`TenantSiteSettingResource`). Cacheável no backend ou na CDN.
- `GET /api/public/properties`: Repository isolado (`PublicPropertyRepository`). 
  - Regra dura: `where('is_published', true)`.
  - Eager Loading Obrigatório (`tech-laravel.md` Item 8): `$query->with(['images' => fn($q) => $q->where('is_cover', true)->orderBy('order')])`.
  - Filtros traduzidos diretamente do Request param (price min/max, type, etc).
- `GET /api/public/properties/{reference_code}`: Endpoint base para o SSR das páginas detalhadas dos imóveis.

---

## FASE 4: Frontend Público (Motor B2B em Next.js 15+)
*Regras aplicáveis: `tech-nextjs.md` (item 1, 2, 4, 6, 7)*

**Objetivo:** Um repositório à parte (ou projeto isolado com Next Router próprio) encarregado unicamente de servir os sites gerados.

### 1. Middleware e Roteamento Edge (O Coração do SaaS)
- O arquivo `middleware.ts` do Next.js será usado para ler o Host request.
- Padrão **Rewrite no Edge**:
  ```typescript
  export default async function middleware(req: NextRequest) {
      const hostname = req.headers.get('host');
      // Reescreve internamente para uma rota dinâmica [domain]
      return NextResponse.rewrite(new URL(`/sites/${hostname}${req.nextUrl.pathname}`, req.url));
  }
  ```
- Estrutura de Rotas (RSC por padrão - `tech-nextjs.md` Item 1): `app/sites/[domain]/page.tsx` e `app/sites/[domain]/imoveis/[slug]/page.tsx`.

### 2. Injeção de Temas e UI Dinâmica
- **Busca de Dados Nativa (`fetch` com caching):** No `layout.tsx` de raiz de `[domain]`, executar:
  ```typescript
  const settings = await fetch(`https://api.system.com/api/public/site-settings`, { 
      headers: { 'X-Domain': domain } 
  }).then(r => r.json());
  ```
- **Injetar Variáveis CSS:** No body / html encapsular as cores retornadas em Tag `<style>` ou props CSS (ex: `--primary-color: ${settings.primary_color}`). O Tailwind ('`tech-nextjs.md` Item 7) será mapeado no config para ler o valor de `var(--primary_color)`.
- Renderizar condicionalmente os blocos baseados no `settings.theme_slug` carregando importações preguiçosas/dinâmicas para não inchar o bundle.

### 3. SEO Profundo e SSG/SSR Obrigatório
- **Metadados Dinâmicos:**
  - `generateMetadata({ params })` em `/imoveis/[slug]/page.tsx`.
  - Buscar e mapear o Título do Imóvel para a tag `<title>`. Descrição rica para `<meta name="description">`. Tag OG Images preenchida obrigatoriamente para WhatsApp.
- **Microdados JSON-LD (Schema.org):** Integrar React Server Components e retornar um bloco estático de JSON no topo das páginas detalhadas mapeando preçoe  tipologia para "Rich Snippets" orgânicos do Google.
- **Sitemap Dinâmico:** Utilizar `app/sitemap.ts` recebendo o Header do host para devolver pro Google Robot uma lista exclusiva apenas com URLs relativas àquele subdomínio/cliente.
- **Componente `<Image />`:** Uso proibido de tags `<img />` tradicionais em galerias de fotos. Obrigatoriedade de `next/image` (`tech-nextjs.md` Item 6) usando URLs do Storage resolvidas como loader para converter JPGs não compactados dos corretores nos leves Webp em real-time.

---

## FASE 5: Contratos de Integração e Workflow
*Regra aplicável: workflow `api-contract-sync.md`*

Ao iniciar a codificação desta documentação, o fluxo da API Sync deve ser estritamente rodado. 

**Como funcionará a manutenção deste módulo no workflow de Sync:**
- Os arquivos do backend no repositório gerarão documentação para `docs/technical-implementations/site-b2b/laravel/public-api.md`.
- Os contratos requeridos pela camada do Next Server (`types`) irão constar em `docs/technical-implementations/site-b2b/next/specs.md`.
- A trigger rodará cruzando via `SYNC_REPORT` se propriedades vitais como `theme_slug` no frontend exigidas para montagem visual do tema estão sendo mapeadas nula/indefinida ou não-tipadas na entrega REST da Public API. Se houver mismatch, os relatórios alertarão no formato `[ERRO]` já instruído.
