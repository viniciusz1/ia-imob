---
trigger: model_decision
description: Normas técnicas específicas para o Backend
---

# Padrões de Backend: Laravel API
**Stack Principal:** Laravel 11+, PHP 8.2+, PostgreSQL (com PostGIS para buscas geoespaciais), Laravel Sanctum, API Resources.
## Diretrizes de Arquitetura e Desenvolvimento
### 1. Padrão Arquitetural (Action / Service / Repository)
* **Controllers Extremamente Magros:** O Controller deve ser responsável apenas por receber a HTTP Request, acionar uma Form Request (para validação), chamar uma Action ou Service, e retornar uma HTTP Response (via API Resource). Nenhuma regra de negócio deve residir aqui.
* **Services / Actions:** Devem conter 100% da lógica de negócio. Prefira classes com responsabilidade única (Single Responsibility Principle). Uma abordagem de "Actions" (ex: `CreatePropertyAction`) costuma ser mais limpa do que Services inflados (`PropertyService` com dezenas de métodos).
* **Data Transfer Objects (DTOs):** Ao enviar dados do Controller para os Services/Actions, prefira mapear os dados validados em DTOs ou utilizar o retorno tipado das Form Requests, evitando passar o array cru de `$request->all()`.
* **Repositories:** Utilize o padrão Repository estritamente para isolar consultas complexas ao banco de dados (especialmente as consultas geoespaciais PostGIS ou relatórios pesados). Para cruds simples, o uso direto do Eloquent no Service é aceitável, desde que não polua a regra de negócio.
### 2. Validação de Dados e Requests
* **Form Requests Obrigatórios:** Toda entrada de dados deve ser validada utilizando classes [Form Request](https://laravel.com/docs/validation#form-request-validation). Nunca valide dados diretamente no Controller.
* **Tipagem Rigorosa (PHP 8.2+):** Utilize os recursos do PHP moderno. Declare tipos de retorno (`: JsonResponse`, `: array`, `: void`) e tipos de parâmetros em todos os métodos e propriedades, combinando com o `strict_types=1`.
### 3. Transformação e Resposta de Dados (Output)
* **API Resources Estritos:** Nunca retorne um Model do Eloquent ou coleções cruas diretamente para o cliente. Tudo deve passar por [Eloquent API Resources](https://laravel.com/docs/eloquent-resources) (`JsonResource` ou `ResourceCollection`) para garantir contratos de API consistentes, ocultar atributos sensíveis e formatar datas.
* **Padronização de Erros:** Exceções devem ser tratadas globalmente (no Laravel 11, ajustado via `bootstrap/app.php`) para retornar respostas JSON padronizadas (ex: formato `message`, `errors`, `status_code`), sem expor *stack traces* em produção.
### 4. Estruturação de Banco de Dados e Models
* **Migrations Sempre:** O estado do banco de dados deve ser totalmente reproduzível rodando `php artisan migrate:fresh`.
* **Timestamps e SoftDeletes:** Quase todos os Models relevantes para o negócio devem utilizar as traits `SoftDeletes` e conter `created_at`, `updated_at` e `deleted_at`.
* **Enums Nativos (PHP 8.1+):** Para campos de status, tipos (ex: *venda, aluguel, comercial*), utilize classes `Enum` do PHP, integradas aos *casts* do Laravel nos Models, garantindo *type-safety* até o banco de dados.
* **Índices e PostGIS:** Assegure-se de criar `indexes` em colunas amplamente buscadas (preço, bairro) e estipular índices compatíveis (como GIST) para as colunas de coordenadas/polígonos geridas pelo PostGIS, documentando isso nas migrations.
### 5. Segurança, Autenticação e Autorização
* **Autenticação Sanctum:** Utilize o Laravel Sanctum otimizado para SPA (utilizando cookies protegidos via *CSRF* em domínios pares) ou *API Tokens* caso a API vá servir aplicativos mobile.
* **Policies e Gates:** A autorização deve ser resolvida através de [Policies](https://laravel.com/docs/authorization#creating-policies). Invoque as instâncias de autorização nas Form Requests (método `authorize()`) ou diretamente no Controller via middleware antes de executar qualquer mutação de dados.
* **Mass Assignment:** Proteja todos os models definindo corretamente a propriedade `$fillable`. Nunca deixe a propriedade `$guarded` vazia sem um controle rigoroso de dados validados.
### 6. Performance e Testes
* **Prevenção de N+1 (Eager Loading):** Antecipe o carregamento de relacionamentos utilizando o método `with()` do Eloquent ao retornar coleções de dados (ex: trazer Empreendimento junto com Fotos). Ative o *Model Strict Mode* no `AppServiceProvider` (`Model::preventLazyLoading(! app()->isProduction());`) para alertar lógicas não eficientes no desenvolvimento local.
* **Testes Automatizados (Pest PHP):** Adoção do framework [Pest](https://pestphp.com/) (padrão em Laravel 11) para implementação de testes. Cubra, no mínimo, endpoints essenciais com *Feature Tests* para garantir o formato do JSON e o status de retorno.