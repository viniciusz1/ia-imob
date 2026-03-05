# Relatório de Sincronização de Contrato de API: Gestão de Permissões (User Groups)

Este relatório foi gerado com base em `docs/user-groups/laravel/01-backend.md` e `docs/user-groups/next/01-frontend.md`, considerando também o impacto de integração com `docs/gestao-usuarios/*` para o vínculo de usuário x grupo.

## 1. Mapeamento de Campos e Contratos

| Domínio | Backend (Laravel) | Frontend (Next.js) | Status |
| :--- | :--- | :--- | :--- |
| Role (entidade) | `id`, `name`, `created_at`, `permissions[]` | `Role { id, name, permissions[] }` | [AVISO] `created_at` não está tipado no frontend |
| Permission (entidade) | `id`, `name`, `label` | `Permission { id, name }` | [AVISO] `label` não está tipado no frontend |
| Criar Role (request) | `name` obrigatório, `permissions` array obrigatório (nomes das permissões) | `roleSchema`: `name` obrigatório, `permissions` array de numbers (IDs válidos) | [ERRO] Incompatibilidade de Tipo (array de strings vs numbers) |
| Atualizar Role (request) | `name` obrigatório, `permissions` array obrigatório | `roleSchema` para edição previsto | OK |
| Listagem de permissões | `GET /api/permissions` | Consumo previsto para checkbox/multi-select | OK |
| Listagem de roles | `GET /api/roles` | `getRoles()` + tabela/listagem | OK |
| Vínculo de usuário ao grupo | Backend menciona `group_id` **ou** `role_id` | Frontend menciona ajustar para `role_id` se necessário | [ERRO] Contrato ambíguo entre módulos |

## 2. Inconsistências Detectadas (Mismatch Detection)

1. [ERRO] Colisão de nomenclatura no vínculo do usuário ao grupo
   - `docs/gestao-usuarios/laravel/especificacao.md` define `group_id` no modelo de usuário.
   - `docs/user-groups/laravel/01-backend.md` e `docs/user-groups/next/01-frontend.md` deixam o contrato ambíguo (`group_id` ou `role_id`).
   - Impacto: payload inválido no create/update de usuário e falha no `AssignRoleToUserAction`.

2. [AVISO] Campo `label` de permissão sem contrato no frontend
   - Backend prevê `PermissionResource` com `label`.
   - Frontend tipa apenas `id` e `name`.
   - Impacto: perda de consistência de exibição (nome técnico vs rótulo humano) e necessidade de fallback no UI.

3. [AVISO] `created_at` exposto no backend e omitido na tipagem de `Role`
   - Backend inclui `created_at` no `RoleResource`.
   - Frontend não tipa esse campo.
   - Impacto: baixo (campo extra), mas gera contrato incompleto para listagens avançadas/ordenação por data.

4. [ERRO] Incompatibilidade de tipo no payload de "permissions" (Criação/Edição de Role)
   - Backend (`StoreRoleRequest`, `UpdateRoleRequest`) exige `permissions.*` como nomes das permissões (String) via regra `exists:permissions,name`.
   - Frontend (`roleSchema`, `RoleFormModal`) envia `permissions` como um array de IDs numéricos (ex: `permissions: [1,2,3]`).
   - Impacto: Dispara erro de validação (HTTP 422) com a mensagem `The selected permissions.0 is invalid.` ao salvar ou inserir roles/grupos de usuários.

## 3. Proposta de Ajuste Arquitetural

1. Padronizar a chave de vínculo entre usuário e grupo para um único nome.
   - Recomendação: usar `role_id` em toda a stack para aderência à semântica do Spatie.
   - Alternativa: manter `group_id` e mapear explicitamente para Role no backend.

2. Atualizar contratos frontend (`src/types/role.ts` e schema correlato) para refletir o payload real:
   - `Permission`: incluir `label?: string`.
   - `Role`: incluir `created_at?: string`.

3. Corrigir Incompatibilidade do Payload de Permissions (Type Incompatibility):
   - **Recomendação Frontend:** Ajustar o `RoleFormModal.tsx` e `roleSchema` para enviar um array de strings (os nomes das permissões), extraindo de `p.name` em vez de `p.id`. 
   - **Recomendação Backend (Alternativa):** Ajustar `StoreRoleRequest` e `UpdateRoleRequest` alterando para `'permissions.*' => ['exists:permissions,id']`, e alterar também a Action de Syncing para suportar os IDs numéricos.

4. Fixar no PRD de `user-groups` a convenção final (sem “ou”):
   - Onde hoje consta `group_id ou role_id`, definir apenas um.
   - Repetir a mesma convenção nos PRDs de `gestao-usuarios` (Laravel e Next).

## 4. Conclusão

Sincronização **parcialmente válida** para o módulo de gestão de permissões.

- Pontos críticos bloqueantes: 2 ([ERRO] nomenclatura do vínculo `group_id` vs `role_id`; [ERRO] tipo do array `permissions`).
- Pontos não bloqueantes: 2 ([AVISO] `label`, `created_at`).

Status final: **NÃO APROVADO para integração final** até resolver o contrato do identificador de grupo/role no payload de usuário e o contrato de envio da lista de `permissions`.
