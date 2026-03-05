# Especificação Técnica: Frontend (Next.js) - Gestão de Usuários

## 1. Visão Geral
Este documento estabelece a estrutura de design e desenvolvimento do Frontend para o Módulo de Gestão de Usuários, alinhada às normas (Next.js 15+ App Router, Tailwind CSS, Shadcn/UI, Zod, e TanStack Query).

## 2. Estrutura de Rotas e Páginas
- O módulo contará com a seguinte rota única:
  - `/usuarios`: Lista de usuários com filtros e ações. Toda criação e edição de usuários é realizada via modal (Dialog/Sheet do Shadcn/UI) nesta mesma página, sem navegação para rotas dedicadas.

## 3. Integração com API (TanStack Query)
- Buscar dados utilizando chamadas HTTP encapsuladas e mantidas via `react-query`.
- **Hooks personalizados recomendados**:
  - `useUsers({ page, filterId, filterName, filterUsername, filterTeam, filterStatus, filterSite, filterOnline })` para manipulação de listagem, delegando parâmetros de query (search params) à chamada da API.
  - `useCreateUser()` e `useUpdateUser()` como mutations para persistir os formulários, efetuando o invalidation do query-cache no final.

## 4. Componentização e Interface (Shadcn/UI & Tailwind)

### 4.1 Cabeçalho e Filtros (Search e Filters)
- Localizado acima da listagem nas páginas `/usuarios`.
- Campos de filtro reativos utilizando os search params do Next.js (URL state) para manter o estado em navegações (Refresh via Server Components).
- Inputs contemplados: Input de texto para código, nome, e usuário. Select dropdown para equipe, status (Ativo/Inativo), mostrar no site, e status online.

### 4.2 Lista de Usuários (`DataTable`)
- Apresentar a lista com paginação via integração Server Side Pagination (repassando `page` para a API do Laravel e utilizando componentes paginadores do Shadcn).

### 4.3 Formulário de Inserção/Edição (`UserFormModal`)
- O formulário deve ser renderizado dentro de um **modal** utilizando o componente `Dialog` ou `Sheet` do Shadcn/UI.
- **Gatilhos de abertura do modal:**
  - Botão "Novo Usuário" no cabeçalho da listagem → abre o modal em modo de **criação** (formulário vazio).
  - Botão de ação (ícone de edição) em cada linha da `DataTable` → abre o modal em modo de **edição** (formulário pré-preenchido com os dados do usuário selecionado).
- **Comportamento do modal:**
  - Utilizar `ScrollArea` do Shadcn/UI internamente para permitir rolagem do conteúdo quando o formulário ultrapassar a altura visível da tela.
  - Ao fechar o modal (botão fechar, clique fora, ou tecla `Esc`), o formulário deve ser resetado.
  - Ao submeter com sucesso, fechar o modal automaticamente e invalidar o cache da listagem (`queryClient.invalidateQueries`).
- Integrado utilizando `react-hook-form` e estritamente validado com schema do `Zod`.
- O layout interno do modal agrupa os campos por seções separadas por títulos:

  **Secção Dados Principais e Contato:**
  - Nome, Email, Telefone.
  - Pessoa (Rádio/Select: Física ou Jurídica).
  - Imagem do usuário (File Input component).
  
  **Secção Profissional:**
  - CRECI, Ordem.
  - Grupo do Usuário (Permissões de sistema, oriundo de combo select puxado via serviço de roles).
  - Equipe do usuário (Combo select).
  - Observações (Textarea).
  
  **Secção Visibilidade e Acesso Geral:**
  - Usuário ativo (Switch / Checkbox).
  - Mostrar no site (Switch / Checkbox).
  - Página do corretor (Switch / Checkbox).

  **Secção Credenciais:**
  - Usuário / Login.
  - Senha.
  - Repita a Senha.
  *Nota sobre validação*: Zod precisa ter função `.refine(data => data.password === data.passwordConfirmation, { message: "Senhas não conferem", path: ["passwordConfirmation"] })`.

  **Secção Horários de Acesso:**
  - Entradas e saídas de registro (`type="time"` ou Custom TimePicker Component).
    - 1º período - entrada | 1º período - saída
    - 2º período - entrada | 2º período - saída

  **Secção Configurações para o site:**
  - Nome para Site.
  - Link do Facebook e Link do Instagram (validação de formato URL opcional).
  - Descrição (Textarea rich-text opcional, ou texto livre).

## 5. Performance e Fallbacks
- Existência mandatória de um `loading.tsx` para apresentar skeletons enquanto listagens ou páginas de detalhes de perfil são buscadas.
- Existência mandatória de um `error.tsx` para capturar exceções durante Rotações via Server Components, e avisos granulares via Toast para dados inválidos (422) oriundos do Laravel.
