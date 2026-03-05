# Arquitetura de Backend: Grupos de Usuários (Roles & Permissions)

## 1. Visão Geral
Este documento define a implementação do módulo de Grupos de Usuário no Backend Laravel 11. O objetivo é permitir o gerenciamento de perfis de acesso (Roles) e suas respectivas permissões, vinculando-os aos usuários.

**Biblioteca Recomendada:** `spatie/laravel-permission`
*Justificativa:* É a biblioteca padrão-ouro no Laravel para lidar com RBAC (Role-Based Access Control). Facilita o cache de permissões e checagens no Gate.

---

## 2. Estrutura de Banco de Dados

1. **Instalação da biblioteca e Migrations:**
   Executar `composer require spatie/laravel-permission` e publicar as migrations da biblioteca. Ela criará as tabelas `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`.
2. **Seeders:**
   - Criar um `RoleSeeder` para os grupos padrão (ex: `Administrador`, `Corretor`).
   - Criar um `PermissionSeeder` para listar todas as permissões do sistema (ex: `users.view`, `users.create`, `properties.edit`).

---

## 3. Padrão Action / Service

Seguindo a política de **Controllers Magros**, implementaremos as seguintes Actions:

- `CreateRoleAction`: Recebe nome do grupo e array com IDs de permissões. Retorna a `Role` criada após sincronizar permissões (`$role->syncPermissions($permissions)`).
- `UpdateRoleAction`: Edita os dados do grupo e atualiza as permissões.
- `DeleteRoleAction`: Remove o grupo (com verificação para impedir remoção do grupo *Administrador* principal).
- `AssignRoleToUserAction`: Vincula um usuário a um grupo existente. 

---

## 4. Interfaces e Contratos de API (Controllers e Resources)

### Controllers
- `RoleController`
- `PermissionController` (Apenas listagem - *Read-Only* para popular as opções no frontend).

### Form Requests
- `StoreRoleRequest`: 
  - `name` (string, required, unique).
  - `permissions` (array, required, exist in permissions table).
- `UpdateRoleRequest`:
  - `name` (string, required, unique except self).
  - `permissions` (array, required).

### API Resources
- `RoleResource`: Deve expor apenas `id`, `name`, `created_at` e as permissões atreladas via relacionamento (e.g. `PermissionResource::collection($this->whenLoaded('permissions'))`).
- `PermissionResource`: Deve expor `id`, `name`, e um `label` humano (se aplicável).

### Rotas Propostas (`routes/api.php`)
```php
Route::middleware(['auth:sanctum'])->group(function () {
    Route::apiResource('roles', RoleController::class);
    Route::get('permissions', [PermissionController::class, 'index']);
});
```

*(Lembrete: Atualize o `UserController` existente para chamar a `AssignRoleToUserAction` ao receber o parâmetro `group_id` ou `role_id` do FormRequest de Usuário).*

---

## 5. Políticas de Autorização (Gate & Policies)

Seguindo as diretrizes arquiteturais (`tech-laravel.md`), a verificação de acesso a recursos (ex: Cadastro de Usuário) não deve ser feita solta no Controller, mas sim integrada às **Policies** ou **Form Requests**.

A biblioteca `spatie/laravel-permission` intercepta automaticamente as chamadas do `Gate` nativo do Laravel. Portanto, a verificação de acesso funcionará da seguinte maneira:

1. **Validação via Form Requests (`authorize` method):**
   Quando uma requisição atingir um endpoint de mutação de dados (como a criação de um novo usuário via `StoreUserRequest`), o método `authorize()` verificará a permissão:
   ```php
   public function authorize(): bool
   {
       // Retorna 'true' apenas se o usuário autenticado tiver a permissão requerida
       return $this->user()->can('users.create');
   }
   ```
   Caso retorne `false`, o Laravel automaticamente abortará a requisição com um erro HTTP 403 (Forbidden/Você não tem permissão para realizar esta ação).

2. **Uso de Policies para Regras Complexas:**
   Para um controle mais fino atrelado a registros específicos (ex: um corretor só pode editar seu próprio perfil, mas um "Administrador" pode editar todos), a documentação prevê a criação de classes Policy (ex: `UserPolicy`).
   Internamente, a Policy mesclará a checagem do dono do registro com as permissões do Spatie:
   ```php
   public function update(User $authenticatedUser, User $targetUser): bool
   {
       if ($authenticatedUser->hasRole('Administrador') || $authenticatedUser->can('users.edit.all')) {
           return true;
       }
       return $authenticatedUser->id === $targetUser->id && $authenticatedUser->can('users.edit.self');
   }
   ```
   Esta Role poderá ser evocada dentro da própria Form Request alterando a lógica do `authorize` para: `$this->user()->can('update', $this->route('user'))`.

3. **Proteção de Rotas em Lote:**
   O `spatie` oferece middlewares predefinidos que podem ser inseridos no arquivo de rotas paralisando o acesso antes mesmo de chegar ao Controller:
   `Route::apiResource('roles', RoleController::class)->middleware('permission:roles.manage');`

---

## 6. Testes Automatizados (Pest PHP)

Para testar esta funcionalidade, crie o arquivo `tests/Feature/RoleApiTest.php`:

- **Can list roles:** Fazer um `GET /api/roles` e checar a estrutura HTTP 200 via `assertJsonStructure()`.
- **Can create a role:** Criar um grupo enviando array de permissões, checando se gravou na `$db`.
- **Cannot create without name:** Enviar payload vazio para `POST /api/roles` e checar status HTTP 422.
- **Can update a role:** Enviar um `PUT` e garantir que o retorno condiz com a modificação.
- **Can assign role to user:** No teste pertinente de gravação de usuários (`UserApiTest.php`), validar se informar o atributo `group_id` adiciona a role correspondente no banco de dados com relação ao usuário criado.
