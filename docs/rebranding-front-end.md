# Rebranding do front-end

Branch: `rebranding-front-end` (a partir da `main`).

## Objetivo

As telas estão sem padrão: cada componente tem o próprio título, espaçamento,
estilo de card, de tabela e de select. A meta é aplicar ao front-end inteiro a
mesma estrutura visual do RH Fácil (`../rhfacil`), mantendo as cores da marca
(paleta "Midnight Galaxy" em `src/app/theme.css`).

O que copiamos do RH Fácil é a **estrutura**: fundo branco, sidebar preenchida
com a cor da marca, topbar branca com breadcrumbs, e todos os cards, botões,
inputs, tabelas e badges seguindo uma única escala de altura, raio e espaçamento.

## Regras do design system

### Tipografia

- Fonte única: Questrial, peso 400, com `font-synthesis: none`. Peso em negrito
  não existe; a hierarquia vem só de **tamanho** e **cor**.
- Título de página: `text-2xl tracking-tight sm:text-[1.75rem]`.
- Subtítulo de página: `text-sm text-muted-foreground`.
- Título de card/seção: `text-base`, com subtítulo `text-xs text-muted-foreground`.
- Valor de KPI: `text-3xl leading-none tracking-tight tabular-nums`.
- Corpo e tabela: `text-sm`; metadados: `text-xs text-muted-foreground`.
- Rótulo de seção: `text-xs uppercase tracking-wide text-muted-foreground`.
- Números sempre com `tabular-nums`.

### Cores (tokens em `src/app/theme.css`)

- `background` e `card` brancos; `border` neutra e clara; `muted` cinza-lavanda.
- `primary` = azul cósmico da marca; `sidebar` = mesma cor do primary, com texto
  branco e item ativo em pílula branca.
- Novos tokens de status: `success`, `warning`, `info` (+ `*-foreground`) e
  `destructive-foreground`. Fim do `emerald-*`, `amber-*` e `red-*` hardcoded.
- Telas usam apenas tokens (`bg-card`, `bg-muted`, `text-muted-foreground`...).
  Nada de `bg-white`, `text-gray-*`, `bg-slate-*` ou hex soltos.

### Escala de tamanhos

- Raio base `0.5rem`: cards `rounded-xl`; botões, inputs e itens de menu
  `rounded-lg`; menus/popovers `rounded-md`; badges `rounded-full`.
- Alturas de controle (nunca sobrescrever `h-*` em Button/Input/Select):
  `h-10` padrão, `h-9` sm e filtros, `h-8` xs e icon-sm, `h-11` lg.
- Padding da área de conteúdo: `p-4 sm:p-6 lg:p-8`, sem `max-w` (largura total).
- Espaçamento entre blocos da página: `space-y-6`. Grade de KPIs: `gap-4`.
  Grades de conteúdo: `gap-6`. Toolbars: `gap-3`. Ações do cabeçalho: `gap-2`.
- Card: `p-6` (o Card do shadcn já usa `py-6 px-6`). StatCard `p-5`.
  Células de tabela `px-4 py-3`.
- Ícones: `size-4` padrão; `size-3.5` em sub-itens e chevrons; `size-5` em KPIs.

### Componentes compartilhados

| Componente | Onde | Função |
| --- | --- | --- |
| `AppShell` | `components/layout` | Sidebar + topbar + main, usado por admin e CRM |
| `Breadcrumbs` | `components/layout` | Trilha na topbar a partir da URL |
| `PageHeader` | `components/layout` | Título, descrição, badge, ações e botão voltar |
| `SectionHeader` | `components/layout` | Cabeçalho de card com ícone, título e link |
| `StatCard` | `components/layout` | KPI com ícone tingido |
| `EmptyState` | `components/layout` | Estado vazio (card tracejado ou compacto) |
| `NativeSelect` | `components/ui` | `<select>` nativo com o mesmo visual do Input |
| `PaginationFooter` | `components/layout` | Rodapé de paginação (10 por página, "Exibindo X–Y de Z", números) |
| `SidebarNav*` | `components/layout` | Itens do menu lateral, iguais no admin e no CRM |
| `FormField` | `components/ui` | Label + campo + erro/ajuda com espaçamento padrão |
| `SidebarBrand`, `SidebarUserCard` | `components/layout` | Logo e usuário no sidebar |
| `LifecycleBadge`, `HealthBadge`, `OperationStateBadge` | `features/crawler/CrawlerStatusBadges` | Estados do Crawler com rótulo em pt-BR |

`NativeSelect` existe porque os testes do Crawler dependem do `<select>` nativo
(`getByRole("combobox")` + `fireEvent.change`). O visual fica igual ao Select do
Radix sem quebrar esses testes.

## Mapa de telas

### Fase 0: base (afeta tudo)

- [x] Tokens novos em `theme.css` (fundo branco, borda neutra, sidebar da marca, status).
- [x] `globals.css`: `font-synthesis`, scrollbar, tokens de status no `@theme`.
- [x] Primitivos: Button, Input, Textarea, Select, Card, Badge, Tabs, Table,
  Dialog, Checkbox, Skeleton.
- [x] Componentes de layout: AppShell, Breadcrumbs, PageHeader, SectionHeader,
  StatCard, EmptyState, NativeSelect.

### Fase 1: Painel Administrativo (prioridade)

Shell e navegação:

- [x] `(admin)/layout.tsx` passa a usar o `AppShell`.
- [x] `PlatformAdminNavigation`: seções no estilo RH Fácil; o Crawler vira uma
  seção expansível com os sub-itens que hoje estão na barra de abas.
- [x] `crawler/layout.tsx`: remove o banner, as abas e as margens negativas;
  o auto-refresh vira um indicador discreto.
- [x] `error.tsx` do admin com tokens.

Telas de Clientes:

- [x] `/admin`: Visão geral (PageHeader, StatCards, cards de lista).
- [x] `/admin/agencies`: lista de agências (tabela padrão).
- [x] `/admin/agencies/new`: formulário de nova agência.
- [x] `/admin/agencies/[id]`: detalhe da agência e franquia de buscas.

Telas do Crawler:

- [x] `/admin/crawler`: visão geral.
- [x] `/admin/crawler/prospects`: prospecção.
- [x] `/admin/crawler/agencies`: lista de crawl agencies.
- [x] `/admin/crawler/agencies/new`: cadastro.
- [x] `/admin/crawler/agencies/[id]` e sub-telas: workspace, crawls, operação,
  discoveries, onboarding, execução de onboarding, perfis, qualidade, agenda,
  configurações (cabeçalho de contexto + abas da agência).
- [x] `/admin/crawler/operations`: operações.
- [x] `/admin/crawler/discoveries/[id]`: detalhe de discovery.
- [x] `/admin/crawler/quality`: qualidade.
- [x] `/admin/crawler/runs/[id]`: detalhe de execução.
- [x] `/admin/crawler/settings`: catálogos, agenda padrão, contratos e políticas.

Problemas recorrentes a eliminar durante a fase 1:

- Cerca de 25 `<select>` nativos em 9 estilos → `NativeSelect`.
- `CardHeader className="flex-row"` quebrado (o CardHeader é grid) → `CardAction`.
- `CardContent className="pt-6"` duplicando padding.
- Tabelas cruas (`CrawlHistoryPanel`, `CrawlRunDataTable`) → `Table` padrão.
- Títulos `h2 text-lg` / `text-2xl` misturados → `PageHeader` e `SectionHeader`.
- `emerald-*`, `amber-*`, `red-*` → tokens de status.
- Links com 21 variações → `text-primary hover:underline`.

### Fase 2: CRM (dashboard da imobiliária)

- [x] `(dashboard)/layout.tsx` migra para o `AppShell` (substitui o shadcn Sidebar).
- [x] `/`: dashboard.
- [x] `/properties`, `/properties/create`, `/properties/[id]/edit`: imóveis e wizard.
- [x] `/ai-searcher`: buscador por IA.
- [x] `/avaliacoes`: avaliações.
- [x] `/analitico/mercado`, `/analitico/avaliacoes`: analítico.
- [x] `/leiloes`: leilões.
- [x] `/usuarios`, `/grupos`: usuários e grupos.
- [x] `/billing`: assinatura.
- [x] `/configuracoes-do-site`: configurações do site.

### Fase 3: login e site público

- [ ] `/login`: coluna centralizada, campos `h-12`, CTA arredondado.
- [ ] `/site/[host]`, `/site/[host]/imoveis`, `/site/[host]/imovel/[slug]`: site
  white-label (o tema é da agência; aqui só alinhamos espaçamentos e primitivos).

## Como trabalhar

- Commits pequenos e frequentes, em pt-BR, no imperativo, sem trailer de coautoria.
- Um commit por tela ou por grupo pequeno de componentes.
- Antes de cada commit: `npm run lint` e os testes afetados (`npx vitest run <pasta>`).
- Os testes não verificam classes CSS, mas dependem de: `<select>` nativo,
  papéis de heading com nome, `aria-current` nos links de navegação,
  `data-slot="card"` e um `<details>` na timeline do onboarding. Preservar esses
  pontos ou ajustar o teste no mesmo commit.
