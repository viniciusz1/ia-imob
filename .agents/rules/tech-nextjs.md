---
trigger: model_decision
description: Normas técnicas específicas para o Frontend
---

# Padrões de Front-end: Next.js & React
**Stack Principal:** Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS, Shadcn/UI, Zod, React Hook Form, TanStack Query.
## Diretrizes de Arquitetura e Desenvolvimento
### 1. Componentização e Renderização (RSC vs. Client)
* **React Server Components (RSC) por Padrão:** Todo componente (especialmente `page.tsx` e `layout.tsx`) é um Server Component por padrão. Mantenha as requisições de dados mais pesadas, proteção de rotas, SEO e acesso direto a bancos no lado do servidor.
* **Uso Criterioso do `'use client'`:** Mova a diretiva para as "folhas" da árvore (componentes mais propensos ao fim do fluxo renderizado). Use Client Components apenas quando necessitar de:
    * Interatividade via eventos (`onClick`, `onChange`).
    * Hooks do React (`useState`, `useEffect`, `useRef`).
    * APIs exclusivas do navegador (`window`, `localStorage`).
* **Injeção de Children:** Sempre que possível, prefira passar Server Components via propriedade `children` para dentro de um Client Component, ao invés de importar o Server Component diretamente no Client (o que o forçaria a se tornar um Client Component também).
### 2. Estratégia de Fetching e Mutação de Dados
* **Fetch Nativo no Servidor:** Busque as informações das rotas de exibição pesada diretamente nos Server Components com `fetch()` padrão e integre com mecanismos de Cache do Next.js (ex: `revalidateTag`, `revalidatePath`).
* **Server Actions para Mutações:** Utilize [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) atrelados a formulários para envio de dados seguros sem a necessidade de criar APIs REST (`route.ts`) manuais entre o front e back. 
* **TanStack Query Sensato:** Utilize-o em componentes do lado do cliente sempre que uma interação rica demande re-buscas, concorrência complexa, *polling* ou *Infinite Scroll*. 
### 3. Validação e Formulários Seguros
* **React Hook Form + Zod:** Use o padrão Zod como Single Source of Truth para validação. 
* **Validação Dupla:** Os schemas de validação do Zod devem ser aplicados **no frontend** (experiência do usuário via React Hook Form) e validados novamente **no servidor** (dentro da chamada da *Server Action* ou rota da API) contra alterações maliciosas efetuadas fora do cliente.
### 4. Gestão de Estado da Interface
* **Estado Baseado em URL (Search Params):** Sempre que possível, mantenha os estados de navegação - como paginação (`?page=2`), filtros de busca (`?q=imoveis`) ou *tabs* ativas - armazenados da URL. Isso permite o compartilhamento do link da página exata para outros usuários e pode ser lido tranquilamente no servidor.
* **Componentes Dumb/Smart:** Mantenha os componentes visuais limpos de lógicas complexas de serviços (Dumb Components). Injete dados e funções neles a partir do nível superior (Smart Components / Pages).
### 5. Estrutura de Diretórios Recomendada (Pattern: Feature-based)
* `/src/app`: Exclusivo para o Roteamento (`page`, `layout`, `loading`, `error`, `not-found`).
* `/src/components/ui`: Reservado para os componentes base gerados pelo Shadcn/UI (Button, Input, Dialog, etc). Não devem conter regras de negócios.
* `/src/components/features`: Organizado por domínios da aplicação (ex: `/features/properties/PropertyCard.tsx`, `/features/auth/LoginForm.tsx`).
* `/src/services` ou `/src/lib`: Bibliotecas auxiliares, abstrações de conexões com o Laravel, formatação de dados gerais.
* `/src/actions`: Armazenamento isolado das React Server Actions (lógica de mutação do servidor isolada).
* `/src/types`: Centralização das interfaces, tipagens e esquemas globais inferidos do Zod (`z.infer<typeof schema>`).
### 6. Tratamento Eficiente de Performance e UX 
* **Feedback Contínuo de Interface:** 
    * Implemente de forma compulsória o arquivo `loading.tsx` e `error.tsx` acompanhados do boundary principal das rotas.
    * Nos Client Components ou fluxos de servidor diretos (Actions) utilize ativamente os atributos nativos de *loading* do React (como `useTransition` ou `useFormStatus`) para sinalizar para o usuário que algo está em processamento de maneira suave e desabilitar botões.
* **Imagens Otimizadas:** Use o componente nativo de `<Image>` com o dimensionamento adequado para formatos eficientes (WebP, AVIF) da própria infraestrutura.
### 7. Estilização e Acessibilidade (a11y)
* **Tailwind e Utilitários de Merge:** Em toda customização do Shadcn ou extensões visuais, utilize estritamente a dupla `clsx` + `tailwind-merge` para evitar o temido conflito de estilos de herança caso um componente pai sobrescreva atributos do filho.
* **Acessibilidade First:** Trabalhe assegurando as funções de teclado e leitores de tela na navegação dos componentes complexos (O Shadcn com a base do Radix Vue/UI já faz parte deste engajamento, mantenha o padrão não destruindo o semantic-html).
### 8. Documentação Dinâmica Visual
* Sempre que novos fluxos de usuários, rotas mestres (ex. formulários complexos) ou lógicas de domínio forem desenvolvidas no front-end em adequação ao backend, assegure de atualizar o seu correspondente visual em `docs/use-case-diagrams/README.md` (casos de uso) ou `docs/class-diagrams/README.md` (arquitetura global).