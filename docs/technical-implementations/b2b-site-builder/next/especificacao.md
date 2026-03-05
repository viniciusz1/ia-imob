# Especificação Técnica: Frontend (Next.js) - Gerador B2B de Sites

## 1. Visão Geral
Este documento define a arquitetura Frontend (Next.js 15+ App Router) da plataforma White-Label *(B2B Multi-Tenant)* para geração de sites de imobiliárias. Operaremos estritamente sob as regras descritas no `tech-nextjs.md`.

---

## 2. A Alma da Interface B2B: Roteamento Edge Dinâmico e RSC

### 2.1 Middleware Roteador (Multi-Tenancy por Host)
O `middleware.ts` operará no "Edge", sendo a porta de entrada única. Sua função é mapear `www.imobiliariamoderna.com.br` para uma rota interna do Next.js sem causar redirecionamento visível (Rewrite).
*   **Regra (`tech-nextjs.md` Item 1):** O padrão deve suportar a arquitetura "Multi-zone" ou agrupamentos App Router (ex: `app/[domain]/layout.tsx`).
*   **Implementação:** O Middleware interceptará e reescreverá para `/sites/[domain]`.

### 2.2 Server Components como Fonte de Verdade
No subdiretório raiz do site injetado (`app/sites/[domain]/layout.tsx`), um React Server Component chamará a API Pública (`fetch /api/public/site-settings` passando origin no cabeçalho `X-Domain`).
*   **Benefício:** Se o domínio for inválido (404), a falha ocorre no servidor e já levanta o `notFound()`, jamais vazando a página genérica (`tech-nextjs.md` Item 6).
*   **CSS Dinâmico na Raiz:** As cores carregadas (`primary_color`, `secondary_color`) são embutidas em `<style>` globais ou variáveis SCSS dentro do layout pai: `style={{ '--primary': settings.primary_color } as React.CSSProperties}`.
*   **Tailwind Merge:** O `tailwind.config.ts` será atualizado para suportar `colors: { primary: 'var(--primary)', secondary: 'var(--secondary)' }`. A paleta passa a operar dinamicamente cliente-a-cliente sem corromper as utilidades utilitárias nativas.

---

## 3. Motor de Temas e UI Condicionada

### 3.1 Gestão de Componentização Modular (RSC vs. Client)
*   **Theme Switcher Dinâmico:** Se a imobiliária optar por temas, o layout raiz usará o `settings.theme_slug` (validado pelo Backend e Next `Types`) para carregar o componente apropriado de um pool estático via `dynamic()` imports (lazy loading) ou condicional padrão do React Server Components.
*   *Exemplo:* `return settings.theme === 'modern' ? <ModernHome /> : <ClassicHome />`. Todas ramificações de componentes criados na pasta `/components/themes/` (*Conforme Arquitetura `tech-nextjs.md` Item 5*).

### 3.2 Fetch Nativo de Propriedades e UX Incremental
*   No Server Component de `/imoveis/page.tsx` passará os search params da URL (ex: `?cidade=SP&preco=3000000`) direto para o proxy da API pública no Fetch.
*   **Tratamento UX Eficiente:** O arquivo de limite `loading.tsx` será usado englobando o Suspense de Skeleton de Imóveis (usando blocos e cor sólida da marca com opacidade baixa) operados puramente em CSR (Client Side state) e Fetch Nativo.

---

## 4. Otimização Obrigatória: SEO e Web Vitals ("A grande Vantagem B2B")

Aqui é onde o SaaS agrega valor às imobiliárias. A codificação não deve usar táticas simplórias do React 17.

### 4.1 Schema.org Microdados Estruturados
Dentro de `app/sites/[domain]/imoveis/[slug]/page.tsx` (Single View de Imóvel):
- Retornar `<script type="application/ld+json">` contendo `{"@context": "https://schema.org", "@type": "RealEstateListing", "name": property.title, ...}` populando campos vitais do Google (GeoCoords, Ofertas/Moeda R$, Tamanho_m2). Inserção no layout estritamente de Servidor (SSR).

### 4.2 Dynamic Metadata API (Tag Title e OG)
Exportar a função assíncrona mandatória do Next15+:
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const property = await getProperty(params.slug);
  return {
    title: `${property.type} em ${property.neighborhood} - ${property.title} | Imobiliária Base`,
    description: property.excerpt,
    openGraph: { images: [{ url: property.cover_image, width: 1200, height: 630 }] }
  }
}
```
*   Issó obriga que o link do site no WhatsApp abra uma placa formativa gigantesca e indexe dezenas de miniaturas no cache do Facebook Sharing Engine.

### 4.3 Imagens Otimizadas de Upload Bruto (WebP Transform)
Garantir o uso de `tech-nextjs.md` Item 6 restritamente:
- A `import Image from 'next/image'` usará parâmetros obrigatórios: `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"`.
- Um loader otimizado nativo do Vercel/Next converterá os banners brutos dos corretores (`.jpg` pesados do form do CRM) em formatros AVIF ou WEBP limpos para diminuir TTI (Time to Interactive).

### 4.4 Sitemap Dinâmico Opcional Exponencial
Em `app/sitemap.ts`:
*   Receber o `Host` do Next Server e injetar na requisição para que a rota retorne todos os *Slugs* pertencentes à imobiliária. O Sitemap devolvido será customizado dinamicamente.

---

## 5. Validações e Formulários Seguros Frontend (Módulo CRM)
O SaaS exigirá adaptação do CRM base atual para permitir configuração das cores (Gestão de Templates).
*   **Zod System (Schema Source of Truth - `tech-nextjs.md` Item 3):**
    *   Formulário de *"Meu Site"* com `z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "HEX Inválido")`.
    *   `theme_slug: z.enum(['modern-glass', 'classic-luxury'])`. Se o Array fugir, o React Hook form bloqueia via CSR.
*   **Mutações por Server Actions:** O save das cores do construtor usará `useTransition` e um Server Action que bate de forma segura no Controller validado do Laravel Privado (`SiteSettingController`).

---

## 6. Workflow Integrado: API Contract Sync
**Prevenindo Bugs Silenciosos:**
*   Em caso do Laravel suprimir campos críticos de estilo (`theme_slug`, `#cores`) de seus Responses de `SiteSettingResource`, ou alterar nomenclaturas de domínios.
*   O Trigger automático das esteiras cruzarão os Types de Next.js (`types/b2b-site-settings.ts`) com a doc validando *Missing Types* e classificados como severidade `[ERRO]` no relatorio de Sync do modulo "Site B2B".
