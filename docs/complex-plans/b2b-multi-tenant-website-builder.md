# Plano de Arquitetura: Plataforma White-Label (B2B SaaS) para Imobiliárias

## 1. Visão Geral do Módulo
O sistema deixará de ser apenas um CRM/ERP interno para uma única imobiliária e passará a atuar como um **SaaS Multi-Tenant (B2B)**. As imobiliárias ("Tenants") poderão se cadastrar, gerenciar seus imóveis e **gerar automaticamente um site público (front-end independente)** com seu próprio domínio, identidade visual e templates otimizados para SEO.

---

## 2. Mudanças Estruturais Core (O "Motor" do Sistema)

### 2.1 Multi-Tenancy (Isolamento de Dados)
Para que várias imobiliárias usem o mesmo banco de dados sem misturar os imóveis, será necessário implementar **Multi-Tenancy lógico**.
- **Novo Model `Tenant` (Agência/Imobiliária):** Todo usuário, imóvel, lead e configuração pertencerá a um `tenant_id`.
- **Global Scopes (Laravel):** Aplicar um escopo global no Eloquent para que querys (ex: `Property::all()`) retornem *apenas* os dados do `tenant_id` atrelado ao usuário logado ou ao domínio da requisição pública.
- **Isolamento de Midia:** As imagens/vídeos no S3/Storage precisarão ser separadas por pastas (ex: `/tenants/{id}/properties/`).

### 2.2 Gestão de Domínios Customizados e Roteamento
O Next.js público (site final) precisará saber *qual* imobiliária carregar baseado na URL acessada (ex: `www.imobiliaria-cliente.com.br`).
- **Tabela `domains`:** Vincular um ou mais domínios a um `Tenant`.
- **Next.js Middleware:** Interceptar todas as requisições (`middleware.ts`), ler o cabeçalho `Host` e fazer um "rewrite" para a rota correta da imobiliária (ex: `/sites/[tenant_id]`).
- **Configuração de Infraestrutura:** O servidor DNS e o proxy reverso (Nginx/Vercel/Cloudflare) precisarão aceitar *Wildcard Subdomains* (`*.seusistema.com`) e roteamento de domínios customizados apontando para a aplicação.

---

## 3. Novas Features a Serem Implementadas

### 3.1 Módulo: Gestor de Sites (Site Builder) no CRM
Um painel administrativo onde o dono da imobiliária configurará seu site.
- **Configurações Gerais:** Upload de Logo, Favicon, paleta de cores (variáveis CSS dinâmicas baseadas em Hexadecimal), links de redes sociais, script de Google Analytics/Pixel.
- **Gestão de Domínios:** Interface para a agência cadastrar seu domínio próprio e visualizar as instruções de apontamento DNS (CNAME/A Record).
- **Temas (Templates):** Seleção de templates pré-construídos. O backend armazenará qual o `theme_slug` ativo para o tenant.

### 3.2 Novo Frontend: O Motor de Temas Públicos (Next.js)
Teremos um repositório Next.js separado para o site público.
- **Motor de Renderização Base:** Componentização robusta onde a injeção do tema (cores, fontes) ocorra no nível máximo do Layout.
- **Sistema de Templates:** O código responderá condicionalmente ao `theme_slug` da agência, carregando componentes visuais diferentes (ex: `components/themes/modern-glass/Home.tsx` vs `components/themes/classic-gold/Home.tsx`).
- **Motor de Busca Público:** O site precisa de uma API pública rápida (`GET /api/public/properties?domain=...`) que receba filtros (bairro, cidade, valor, quartos) e devolva apenas os imóveis **publicados** daquela agência.

---

## 4. Otimização Profunda para Google SEO (A Grande Vantagem)

Vender sites exige tráfego orgânico. O Next.js resolverá isso com Server-Side Rendering (SSR) e Static Site Generation (SSG).

### Arquitetura de SEO Obrigatória:
1. **Dynamic Metadata:** As páginas de detalhes do imóvel (ex: `/imovel/venda-apartamento-3-quartos-centro-sp-ref123`) devem gerar as tags `<title>`, `<meta name="description">` dinamicamente baseadas nos dados do imóvel via Server Components (`generateMetadata` do Next.js).
2. **Open Graph & Twitter Cards:** Injeção da foto de capa do imóvel nos cabeçalhos OG para que o compartilhamento no WhatsApp/Redes Sociais seja renderizado com a foto grande.
3. **URL Semântica (Slugs):** Criar uma rotina no backend para gerar "slugs" amigáveis quando o corretor cadastrar o imóvel (ex: `/{finalidade}-{tipo}-{bairro}-{cidade}`). URLs com IDs feios como `/property/152` prejudicam SEO.
4. **Sitemap Dinâmico (Sitemap.xml):** O Next.js deverá gerar sitemaps on-the-fly (`app/sitemap.ts`) batendo na API e listando absolutamente todos os links de imóveis daquela agência.
5. **Schema.org estruturado:** Injeção de marcação JSON-LD em cada imóvel (Type: `RealEstateListing` e `Product`), informando ao robô do Google exatamente onde está o preço, a latitude/longitude, a área e as fotos. Isso permite que o Google crie "Rich Snippets" (exibindo preço direto na busca).
6. **Core Web Vitals:** Para uso das imagens em alta resolução enviadas pelos corretores, é vital utilizar o componente `<Image>` do Next formatando em `WebP`/`AVIF` com loaders proativos.

---

## 5. Próximos Passos (Plano de Execução)

Para transformar a arquitetura atual para este modelo SaaS Multi-tenant, recomendo a seguinte ordem:

1. **Refatoração Multi-Tenant (Backend Base):**
   - Criar model/migration `Tenants`.
   - Modificar a tabela `users` (e as demais atuais) adicionando `tenant_id`.
   - Adicionar o escopo global no Eloquent.

2. **Criação do Módulo Site Builder (Backend e CRM Atual):**
   - Criar as tabelas `tenant_domains` e `tenant_site_settings`.
   - Construir os formulários no painel (Gestão de Cores, Logos, Templates).

3. **Início do Motor Público (Novo Projeto Next.js Frontend):**
   - Desenhar a arquitetura do middleware para detecção de domínios.
   - Criar 1 template funcional completo listando imóveis mockados da API.
   - Implementar os filtros e paginação.

4. **SEO e Polimento Final:**
   - Aplicar SSR, Sitemaps e Schema.org no projeto Next.js público.
