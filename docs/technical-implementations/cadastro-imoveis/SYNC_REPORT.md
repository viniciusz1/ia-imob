# SYNC Report - Cadastro de Imoveis

Base de validacao:
- Backend: `ai-backendd-imobiliaria` (Requests, Resources, Controllers, rotas)
- Frontend: `ai-front-end-imobiliaria` (Zod schema, types, services)
- PRD de referencia: `docs/cadastro-imoveis/laravel/01-backend.md` e `docs/cadastro-imoveis/next/01-frontend.md`

## Resultado Geral
Sincronizacao **parcial**. O contrato principal de campos do imovel esta alinhado, mas existem divergencias de contrato em endpoints e validacoes que podem gerar erro de runtime.

## Achados

### [ERRO] Reordenacao de imagens com contrato inconsistente (frontend x backend)
- Backend valida `order.*` como `exists:property_images,id`.
  - Evidencia: `ai-backendd-imobiliaria/app/Http/Controllers/Api/PropertyImageController.php:73`
- Frontend envia `order` como mapa `{ [imageId]: position }`.
  - Evidencia: `ai-front-end-imobiliaria/src/services/propertyService.ts:247`
  - Evidencia: `ai-front-end-imobiliaria/src/services/propertyService.ts:251`
- O backend esta validando os **valores** (posicao) como se fossem IDs de imagem. Isso tende a rejeitar payload valido com `422`.

Proposta tecnica:
- Laravel: validar as chaves do mapa como IDs da propriedade atual (ex.: `array:...` + validacao customizada das keys) ou mudar payload para lista de objetos `{ id, order }` e validar `id` com `exists`.
- Next.js: manter padrao escolhido e documentar formato final no PRD para evitar ambiguidade.

### [AVISO] Resposta de create/update nao carrega `owner`, mas frontend deriva `owner_id` de `management.owner`
- `store` e `update` carregam apenas `broker`, sem `owner`.
  - Evidencia: `ai-backendd-imobiliaria/app/Http/Controllers/Api/PropertyController.php:41`
  - Evidencia: `ai-backendd-imobiliaria/app/Http/Controllers/Api/PropertyController.php:60`
- Frontend mapeia `owner_id` a partir de `management.owner?.id`.
  - Evidencia: `ai-front-end-imobiliaria/src/services/propertyService.ts:127`
- Efeito: apos create/update, `owner_id` pode voltar `null` no estado local, mesmo quando salvo.

Proposta tecnica:
- Laravel: incluir `owner` no `load` de `store`/`update` para manter consistencia com `show`.

### [AVISO] Divergencia de regra de data de exclusividade
- Backend exige `after_or_equal:today` para `exclusive_right_expiration_date`.
  - Evidencia: `ai-backendd-imobiliaria/app/Http/Requests/Property/StorePropertyRequest.php:78`
  - Evidencia: `ai-backendd-imobiliaria/app/Http/Requests/Property/UpdatePropertyRequest.php:85`
- Frontend valida obrigatoriedade condicional, mas nao valida data minima (hoje).
  - Evidencia: `ai-front-end-imobiliaria/src/schemas/property.ts:53`
  - Evidencia: `ai-front-end-imobiliaria/src/schemas/property.ts:54`

Proposta tecnica:
- Next.js: adicionar refinamento para bloquear datas passadas antes do submit (alinhado ao Laravel).

### [AVISO] Validacao de enums no backend nao segue requisito do PRD
- PRD pede validacao dinamica de `property_type`, `purpose`, `status` via `system_enums`.
- Implementacao atual valida apenas `string`.
  - Evidencia: `ai-backendd-imobiliaria/app/Http/Requests/Property/StorePropertyRequest.php:29`
  - Evidencia: `ai-backendd-imobiliaria/app/Http/Requests/Property/StorePropertyRequest.php:30`
  - Evidencia: `ai-backendd-imobiliaria/app/Http/Requests/Property/StorePropertyRequest.php:31`

Proposta tecnica:
- Laravel: aplicar regra customizada (Rule/Validator) que consulte `system_enums` por tag e valide os valores permitidos.

## Campos Estruturais
- `naming`: sem colisao relevante (snake_case consistente).
- `tipos`: principais campos numericos/boolean/string estao alinhados entre schema frontend e requests/resources backend.
- `obrigatoriedade`: alinhada na maior parte; divergencia principal na data de exclusividade (detalhada acima).

## Estado Final
- Status de sincronizacao: **NAO APROVADO** ate corrigir o item `[ERRO]` de reordenacao de imagens.
- Demais itens `[AVISO]` nao bloqueiam 100% do fluxo, mas geram inconsistencias de UX/contrato.
