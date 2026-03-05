# Especificação Técnica: Frontend (Next.js) - Módulo de Login e Autenticação

## 1. Visão Geral
Este documento define as diretrizes para a construção do módulo de Login no Next.js (15+ App Router) seguindo a arquitetura Tailwind CSS + Shadcn/UI + Zod.

## 2. Abordagem de Autenticação (TanStack Query / API Services)
Devido ao uso de **Laravel Sanctum (SPA Authentication)**, o fluxo requer:
1. Obter o cookie CSRF da API via rota `/sanctum/csrf-cookie`.
2. Enviar a requisição para o endpoint de `/login` com as credenciais.
3. Se o login for bem-sucedido, o cookie de sessão do backend é salvo no navegador.

O cliente HTTP (Axios ou fetch encapsulado na camada `/services`) deve estar pré-configurado com a opção `withCredentials: true` e a gestão adequada de headers CSRF.

## 3. Estruturação da Página de Login (`/login`)

- **Server Component ou Client?**:
  - A renderização inicial da página (Layout) será via **Server Component** para máxima rapidez de exibição e injeção de metadata SEO.
  - O formulário contido na página será isolado em um **Client Component** (`'use client'`) para lidar com o estado reativo de input e as submissões (`react-hook-form`).

- **Layout e UI (`Shadcn` / `Tailwind`)**:
  - Layout minimalista de "Card" centralizado contendo o Logo do Sistema.
  - Inputs com design unificado do Shadcn:
    - Input de "Usuário ou E-mail" (`type="text"`).
    - Input de "Senha" (`type="password"` com funcionalidade visual de revelar/ocultar via ícone).
  - Botão de submissão (com prop `disabled` enquanto carrega).
  - Checkbox para "Lembrar-me" (opcional).

## 4. Validações e Formulário (`Zod`)
- Schema `loginSchema` deve estar alocado perto do componente ou em pasta `schemas`.
- Validações:
  - Usuário obrigatoriamente preenchido.
  - Senha com checagem de preenchimento mínimo.
- Erros de credenciais inválidas devolvidos via `422 Unprocessable Entity` pela API do Laravel precisam ser capturados e postos em foco nos inputs via `setError` do _react-hook-form_ ou via sistema de _Toast_.

## 5. Proteção de Rotas com Autenticação
- Implementar proteção através do `middleware.ts` na raiz do escopo de pastas ou via proteção Layout/Higher-Order, para não permitir que visitantes não logados acessem áreas como `/usuarios`, redirecionando-os compulsoriamente para `/login`.
- Ao obter o `/api/user` inicial para verificar sessão:
  - Armazenar o usuário no estado global da aplicação (via *Zustand* ou provedor de Contexto do React), para que os layouts mostrem o nome ou Avatar global perfeitamente, sem refetch abusivo.

## 6. Fluxo de Logout
- Será invocado por um botão num dropdown header (perfil/avatar).
- Chama a mutation de logout contatando API, que revogará o cookie via Backend, e a aplicação de Frontend removerá a store de dados e dará um `router.push('/login')` seguido de uma limpeza na cache das consultas do TanStack Query (`queryClient.clear()`).
