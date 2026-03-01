# Especificação Técnica: Backend (Laravel) - Gestão de Usuários

## 1. Visão Geral
Este documento detalha a arquitetura do backend para o módulo de Gestão de Usuários, seguindo as diretrizes estabelecidas (Laravel 11+, PostgreSQL, Sanctum, Service-Repository Pattern).

## 2. Modelagem de Dados (Migration & Model)

### 2.1 Tabela `users`
Campos necessários de acordo com os requisitos:
- `id` / Código (Primary Key)
- `name` (string, Nome)
- `email` (string, único)
- `phone` (string, Telefone)
- `creci` (string, nullable)
- `order` (integer, Ordem de exibição)
- `group_id` (foreignId, Grupo do usuário - Permissões do sistema)
- `team_id` (foreignId, Equipe do usuário, nullable)
- `notes` (text, Observações, nullable)
- `is_active` (boolean, Usuário ativo, default: true)
- `show_on_website` (boolean, default: false)
- `has_broker_page` (boolean, Pagina do corretor, default: false)
- `person_type` (char, Pessoa - ex: F/J)
- `username` (string, Login, único)
- `avatar_path` (string, Imagem do usuário, nullable)
- `password` (string/hash)
- `work_period_1_start` (time, 1º período - entrada, nullable)
- `work_period_1_end` (time, 1º período - saída, nullable)
- `work_period_2_start` (time, 2º período - entrada, nullable)
- `work_period_2_end` (time, 2º período - saída, nullable)
- `website_name` (string, Nome para site, nullable)
- `facebook_link` (string, nullable)
- `instagram_link` (string, nullable)
- `description` (text, Descrição para o site, nullable)
- `last_seen_at` (timestamp, utilizado para determinar se está "online")

### 2.2 Índices
- Índice no campo `username` e `email` para buscas de login.
- Índice composto em `is_active`, `team_id`, `show_on_website` para otimizar os filtros de pesquisa.

## 3. Arquitetura de Software (Service-Repository)

### 3.1 Controller: `UserController`
- Responsável por receber parâmetros de filtros da requisição, validar payloads e retornar os dados empacotados pelo `UserResource`.
- Rotas devem ser protegidas pelo middleware de autenticação (Sanctum) e autorização (Policies).

### 3.2 Service: `UserService`
- Processa 100% da lógica de negócio:
  - Criação de usuário executando hash da senha (`Hash::make`).
  - Atualização do usuário e alteração segura de senhas.
  - Processamento do upload da imagem de avatar (`Storage::put`).
  - Definição dos horários de expediente e limpeza de dados (trimming).

### 3.3 Repository: `UserRepository`
- Encapsula as consultas com o Eloquent e construção das queries de forma modular.
- **Listagem com Filtros e Paginação**: O método deverá receber um array com os filtros.
  - Filtros esperados: `id` (código), `name` (nome), `username` (usuário), `team_id` (equipe), `is_active` (status), `show_on_website` (mostra no site), `is_online` (status online, calculado via `last_seen_at > now()->subMinutes(5)`).
- Retorno paginado dos resultados.

## 4. API Resources (`UserResource`)
- Utilizar `JsonResource` para proteger campos como `password`.
- Formatar retornos relacionados a campos booleanos.
- Fornecer a URL completa (`Storage::url`) no campo da imagem de avatar.

## 5. Validação com Form Requests
- Deverão ser criados `StoreUserRequest` e `UpdateUserRequest`:
  - Validação estrita confirmando a senha (requer `password` e `password_confirmation`).
  - Checagens únicas (unique) considerando o `id` omitido durante edição.
  - Validação de horários garantindo consistência (`work_period_1_end` deve ser após `work_period_1_start`).
