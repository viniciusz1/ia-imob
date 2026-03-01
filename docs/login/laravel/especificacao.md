# Especificação Técnica: Backend (Laravel) - Módulo de Login e Autenticação

## 1. Visão Geral
Este documento detalha o módulo de autenticação e login da aplicação, baseado em **Laravel 11+** e **Laravel Sanctum**.

## 2. Autenticação (Laravel Sanctum)

O sistema deve usar o padrão de autenticação para SPA (Single Page Applications) provido pelo **Laravel Sanctum**.
Isso significa que a comunicação ocorrerá via cookies de sessão (HTTP-only) em conjunto com proteção CSRF, garantindo a segurança de requisições de frontend consumindo do mesmo TLD. Alternativamente, podem ser gerados tokens de acesso (Bearer API Tokens) se houverem clientes Mobile, mas focaremos no setup de SPA Authentication.

### 2.1 Configurações Iniciais
- O arquivo `config/cors.php` deve suportar `supports_credentials => true`.
- `config/sanctum.php` deve incluir a URL do domínio do front-end em `stateful`.

## 3. Endpoints da API

### `POST /api/login` (ou rota raiz definida no route web para SPA)
- Responsável por receber credenciais e autenticar o usuário.
- **Validação (`LoginRequest`)**: 
  - Aceita `login` (que pode ser `email` ou `username`) e `password`.
- **Lógica de Negócio (`AuthService` ou direto no `LoginController`)**:
  - Tentar autenticar pelas credenciais com `Auth::attempt()`.
  - O sistema **DEVE** validar se o usuário tem o campo `is_active = true`. Caso contrário, retornar `403 Forbidden` ou mensagem de conta inativa.
  - O retorno de sucesso deve contemplar os dados do usuário autenticado usando o `UserResource`.

### `POST /api/logout`
- Encerra a sessão.
- Deve executar `Auth::guard('web')->logout()` e invalidar a sessão atual `request()->session()->invalidate(); request()->session()->regenerateToken();`.
- Requer estar autenticado (Middleware `auth:sanctum`).

### `GET /api/user`
- Retorna os dados do usuário autêntico atualizado.
- Deve usar obrigatoriamente `UserResource` para mascaramento dos dados sensíveis do modelo.

### `POST /api/ping` ou Middleware Customizado
- Recomendado criar um mecanismo (ex: rota leve ou middleware global em requisições autenticadas) que atualize o campo `last_seen_at` do `User` ativo, armazenando o timestamp da última comunicação (para alimentar o status de "Usuário Online" visto no módulo da Gestão de Usuários).

## 4. Segurança
- Aplicação de **Rate Limiting** rigoroso nas rotas de login para prevenir ataques de força-bruta (ex: `ThrottleRequests` configurado para 5 tentativas por minuto por IP/Login).
- Validação CSRF nos endpoints de estado da sessão via request para `/sanctum/csrf-cookie` precedente à requisição de `/login`.
