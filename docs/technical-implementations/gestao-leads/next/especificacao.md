# Especificação Técnica: Frontend (Next.js) - Gestão de Leads

## 1. Visão Geral
Este documento cobre a arquitetura React/Next.js estipulada para o ciclo de vida e a usabilidade do módulo de Gestão de Leads. Tendo como premissa Next.js 15+ (App Router), Server Components (onde viável), Tailwind CSS e extensões Shadcn/UI (e compatibilidade acessível Radix UI).

## 2. A Alma da Interface: Componentização de Base (O Kanban)
A gerência rotineira e central toma a forma de um Board (Quadro) dinâmico onde leads são movidos sob critérios de estagios.

### 2.1 Bibliotecas 
*   Uso orientado do `@dnd-kit/core` (ou `react-beautiful-dnd`) focando no controle granular e otimização por múltiplos painéis/colunas arrastáveis de forma acessível.

### 2.2 Agrupamento de Componentes UI (Pasta: `/src/components/features/leads`)
*   **`<KanbanBoard />`**: Centraliza os Provedores DND e o estado lógico primário do cliente.
*   **`<KanbanColumn />`**: Estrutura reativa referenciando uma etapa. Somatiza o volume de cards na aba (Total de leads) e renderiza de forma visual o total projetado ($) das vendas acumuladas por aquele degrau de maturação do pipeline.
*   **`<LeadCard />`**: Compacto e incisivo. Traz nome da Lead e indicadores automáticos cruciais, destacadamente cronómetros de intermitência "Inativo há X dias" para forçar ações de conversão, priorizando urgência visualmente.

## 3. Estratégia de Estado, Resiliência e Otimismo
*   **SWR ou TanStack Query**: Integrando diretamente pelo cliente. Primordial para prover atualizações de fila rápidas.
*   **Optimistic Updates (Atualizações Otimistas)**: Padrão inegociável do módulo. Ao mover/dropar um `<LeadCard />` noutra `<KanbanColumn />`, a interface reordena visualmente na hora, simulando instantaneidade. Em paralelo (backend viação) se ocorrer negação da request na `API PATCH /leads/{id}/status`, o card é defletido ao estado inicial com um toast de erro subjacente.
*   **Drag Overlay Visivo**: Para contornar rigidez em animações nativas, usar o recurso "drag overlay", de duplicata flutuante provendo acompanhamento do cursor para a máxima performance do ponteiro durante segurar soltar (Hold & Release).

## 4. Contratos e Validação (Zod Schemas)
Em conformidade com as diretrizes do Next.js (tech-nextjs.md), as Server Actions e os Formulários devem possuir uma única fonte da verdade em termos de Schemas/Payloads.

*   `UpdateLeadStatusSchema`: Destinado à movimentação no Kanban (exiginte do painel drag & drop ou Action). Deve requerer a chave validada.
    *   `funnel_step_id: z.number().int().positive()`
*   `CreateLeadSchema`: Base do LeadCard e formatação principal.
    *   `expected_value: z.number().optional()` (Decimal compatível capturado para VGV).

## 5. Análise Focada (Slide-over/Drawer)
Clicar no Card deflagra um Drawer com detalhamentos sem que o usuário transicione ou esvazie páginas. Utilizando `<Sheet />` ou primitivo similar.

### 4.1 Estrutura Interna da "Gaveta de Lead"
*   **`<TimelineViewer />`**: Historiografia vertical contínua alimentada via interação back. Evidencia todos os toques (ligações manuais, anotações de equipe) até a injeção nativa de logs de transição entre colunas ("De -> Para" inserida no motor do Evento backend).
*   **Quick Actions Menus**: Abas rápidas interconectadas de ação com suporte deep-link:
    *   Chamadas velozes apontando a web API `whatsapp://send` ou nativo similar.
    *   Rápida abertura de mail client (`mailto:`).

## 6. Fluxo de Trabalho Integrado e Desacoplado
*   **Requisição Inicial**: O SSR de `page.tsx` no Roteador Next.js emulará uma chamada estrita dos quadros garantindo carga imediata estrutural (Server Load) do formato Kanban e injeção do pacote `initialData` ao client.
*   **Interações de Background**: Recepcionamentos originados de WebHooks externos são inseridos via Service Back; Quando atribuídos os Leads (Distribuidor System), notifica-se o front do respectivo responsável com broadcasts `Socket` ou `Reverb` sinalizando surgimento de um card sem repetição inteira de load na aba cliente ativa.
*   **Acessibilidade e Estilização Segura**: Mapear merges do Tailwind via dupla `clsx` + `tailwind-merge` dentro do arquivo do Card customizável para previnir colisões dos gradientes das etiquetas. Garantir navegação do drag and drop utilizando tabuladores de teclado.
