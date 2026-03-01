# Arquitetura de Frontend: Grupos de Usuários (Roles & Permissions)

## 1. Visão Geral
Este documento define a implementação da interface para gerenciamento de perfis de acesso no Next.js (App Router). Permitirá a listagem, criação e edição de Grupos (Roles) atrelando-os a Permissões, além de atualizar o modal de usuários para consumir essas Roles de forma dinâmica.

---

## 2. Abstrações e Services

1. **Tipagens (`src/types/role.ts`)**
   - Criação da interface `Role` com `id`, `name`, e `permissions` (array de `Permission`).
   - Criação da interface `Permission` com `id`, `name`.

2. **API Handlers (`src/services/roles.ts` ou hooks via TanStack)**
   - Criar hooks (ou functions que o TanStack chamará): `getRoles()`, `getPermissions()`, `createRole(data)`, `updateRole(id, data)`, `deleteRole(id)`.

---

## 3. Gestão de Grupos de Usuários e Permissões

### 3.1. Rota de Listagem (`/src/app/grupos/page.tsx`)
- Server Component por padrão.
- Fazer Fetch no Servidor das `roles`. Renderizar uma Data Table (`shadcn/ui`) para exibição.
- Uso coerente de cache e `loading.tsx`/`error.tsx`.

### 3.2. Modal de Novo Grupo / Editar Grupo (`RoleFormModal.tsx`)
Criado sob o padrão visual e arquitetural do sistema (Dumb/Smart approach com React Hook Form).
- **React Hook Form + Zod (`roleSchema.ts`):** 
  - Validar `name` como obrigatório.
  - Validar `permissions` como array de IDs obrigatório.
- **Integração de Múltiplas Permissões:**
  - Usar um componente de Checkbox List (`shadcn/ui`) ou Select de múltipla escolha para atribuir as permissões trazidas pelo endpoint `/api/permissions`.
- **UX e Performance:** 
  - Usar mutações (TanStack Query ou Server Actions) com `isPending` desabilitando os botões para prevenir duplo clique.

---

## 4. Alteração no `UserFormModal.tsx`

Arquivo Alvo: `src/components/features/users/UserFormModal.tsx`.

### Estado Atual:
Hoje, o campo **Grupo do Usuário** usa `<Select>` com *items* Hardcoded no front-end (`value="1" -> Administrador`, `value="2" -> Corretor`).

### Nova Implementação:
1. Buscar os *Grupos Reais* no carregamento do componente ou num endpoint apropriado usando `useQuery({ queryKey: ['roles'], queryFn: getRoles })`.
2. O `<Select>` mapeará o retorno de `data` renderizando os `<SelectItem value={role.id}> {role.name} </SelectItem>`.
3. Validar no Zod e atualizar o nome da key se necessário para `role_id` (combinar com o backend).

---

## 5. Testes Automatizados (Frontend)

Para atender a exigência de testes na interface:
- **Testes Unitários de Validation:** Usar Vitest/Jest nas lógicas de schemas (`roleSchema.ts` e a alteração de `userSchema.ts`) garantindo que falham se array vazio ou nomes vazios passarem.
- **Teste do Modal `UserFormModal.tsx`:** Validar via React Testing Library se os options de Grupos estão sendo devidamente renderizados a partir de um *Mock* do Axios (`api.ts`).
- **Teste de Múltiplas Permissões:** Testar (TLR) se ao selecionar diversas checkboxes na renderização do `RoleFormModal`, o payload disparado na API tem o formato esperado.
