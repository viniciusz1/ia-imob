# Arquitetura de Backend: Cadastro de Imóveis (Properties)

## 1. Visão Geral
Este documento define a implementação do módulo de **Cadastro de Imóveis** no Backend Laravel 11. O objetivo é permitir o gerenciamento de todo o portfólio de imóveis da imobiliária, integrando-se aos proprietários, corretores e exibição no site de forma detalhada para o mercado brasileiro.

---

## 2. Modelagem de Dados (Migration & Model)

### 2.1 Tabela Principal `properties`
A estrutura contemplará as informações essenciais exigidas pelos principais CRMs imobiliários e portais do Brasil:

**Dados Básicos do Imóvel**
- `id` (Primary Key)
- `reference_code` (string, único - Ex: AP0015, CA0102)
- `title` (string, Título atrativo para site/portais)
- `description` (text, Descrição detalhada do imóvel)
- `property_type` (string - Chave referenciando a tag `property_types` na tabela `system_enums`, Ex: apartamento, casa)
- `purpose` (string - Chave referenciando a tag `property_purposes` na tabela `system_enums`, Ex: venda, locacao)
- `status` (string - Chave referenciando a tag `property_statuses` na tabela `system_enums`, Ex: disponivel, reservado)

**Localização**
- `zip_code` (string, CEP)
- `state` (string, UF)
- `city` (string, Cidade)
- `neighborhood` (string, Bairro)
- `street` (string, Logradouro)
- `number` (string, Número)
- `complement` (string, Complemento alternativo)
- `latitude` (decimal, Latitude, nullable)
- `longitude` (decimal, Longitude, nullable)
- `show_exact_address` (boolean, Mostrar endereço exato no site, default: false)

**Valores e Precificação**
- `sale_price` (decimal, Valor de Venda, nullable)
- `rent_price` (decimal, Valor de Locação, nullable)
- `property_tax` (decimal, Valor do IPTU Anual/Mensal, nullable)
- `condo_fee` (decimal, Valor do Condomínio, nullable)
- `accepts_financing` (boolean, Aceita financiamento, default: false)
- `accepts_exchange` (boolean, Estuda permuta, default: false)
- `show_price` (boolean, Mostrar valor no site, default: true)

**Características e Medidas**
- `usable_area` (decimal, Área útil/privativa em m², nullable)
- `total_area` (decimal, Área total em m², nullable)
- `bedrooms` (integer, Quantidade de Quartos/Dormitórios, default: 0)
- `suites` (integer, Quantidade de Suítes, default: 0)
- `bathrooms` (integer, Quantidade Total de Banheiros, default: 0)
- `garage_spaces` (integer, Vagas de garagem cobertas/descobertas, default: 0)
- `floor_number` (integer, Andar do imóvel, nullable)
- `total_floors` (integer, Total de andares do prédio, nullable)
- `build_year` (integer, Ano de construção, nullable)

**Mídia Externa**
- `video_url` (string, Link do YouTube/Vimeo, nullable)
- `virtual_tour_url` (string, Link do Tour Virtual 360, nullable)

**Gestão Interna (Controle da Imobiliária)**
- `owner_id` (foreignId, nullable - Referência ao Proprietário, na tabela de clientes)
- `broker_id` (foreignId, nullable - Referência ao Corretor Captador na tabela `users`)
- `internal_notes` (text, Observações internas invisíveis ao site, nullable)
- `has_exclusive_right` (boolean, Captação com Exclusividade, default: false)
- `exclusive_right_expiration_date` (date, Data de vencimento da exclusividade, nullable)
- `keys_location` (string, Localização das chaves, Ex: Portaria, Imobiliária, nullable)

**Publicação e Destaque**
- `is_published` (boolean, Imóvel visível/publicado no site, default: false)
- `is_highlighted` (boolean, Imóvel em Destaque no site principal, default: false)

---

### 2.2 Tabela Genérica de Domínios (`system_enums`)
Para evitar a criação de múltiplas tabelas descritivas e manter a flexibilidade na manutenção dos "selects" do frontend, utilizaremos uma tabela de domínios aproveitando o suporte do PostgreSQL a colunas JSON. Todas as informações de "select" obrigatórias devem ser buscadas desta tabela.

- `id` (Primary Key)
- `tag` (string, única - Ex: `property_types`, `property_purposes`, `property_statuses`)
- `data` (jsonb - Array de objetos contendo chave e valor humano. Ex: `[{"value": "apartamento", "label": "Apartamento"}, {"value": "casa", "label": "Casa"}]`)

**Seeder (`SystemEnumSeeder`)**
Deve ser criado um Seeder para popular esta tabela no momento da instalação do sistema, contendo as listagens base para os selects de imóveis. O Frontend deverá bater num endpoint (ex: `GET /api/enums?tags=property_types,property_purposes`) para popular os formulários de cadastro.

---

### 2.3 Tabelas Auxiliares (Relacionamentos)

1. **`property_images` (Mídia)**
   - Relacionamento `1:N`. Uma propriedade tem muitas imagens.
   - Campos: `id`, `property_id`, `path` (caminho S3/Storage), `is_cover` (boolean), `order` (integer), `description` (texto alt/legenda).

2. **`features` e `property_feature` (Comodidades/Checkboxes)**
   - Relacionamento `N:N`. Um imóvel tem muitas características (Piscina, Churrasqueira, Elevador, Academia, Portaria 24h, etc).
   - Tabela `features`: `id`, `name`, `icon`
   - Tabela `property_feature` (Pivot): `property_id`, `feature_id`.

3. **`portals` e `property_portal` (Integração com Portais - Futuro)**
   - Relacionamento `N:N` para indicar em quais portais (Zap, VivaReal, Imovelweb) o imóvel será divulgado.

---

## 3. Padrão Arquitetural (Service-Repository)

Seguindo as normas técnicas estabelecidas para o Backend Laravel (`tech-laravel.md`), a lógica será desacoplada de Controllers.

### 3.1 Controller: `PropertyController`
- Única responsabilidade: receber parâmetros de requisição e devolver responses montadas pelos `Resources`. 
- Rotas protegidas via API (`Route::apiResource`).
- `index` recebe filtros de busca que são passados adiante para o Repository.
- `store`, `update`, `destroy` passam o payload validador da `FormRequest` para o Service.

### 3.2 Service: `PropertyService`
- Detém 100% da regra de negócio:
  - Gerencia o attach/detach de relacionamento em tabelas N:N como as comodidades (`features`).
  - Interage com um sub-serviço (ou no mesmo escopo) para fazer o upload/remoção e resize das imagens via `Storage`.
  - Controle de publicação (mudar de rascunho para publicado se todos os campos vitais estiverem preenchidos).
  - Controle das regras de expiração de exclusividade.

### 3.3 Repository: `PropertyRepository`
- Isola o DB (Query Builder / Eloquent):
  - Consulta `Paginada` dos imóveis (listagem).
  - Implementa um motor de filtros potente para as buscas (Filtro por Tipo, Finalidade, Valor Mín/Máx Secundário e Locação, Condomínio, Quartos, Suítes, Características N:N, Busca Textual por Código e Bairros). Eager loading automático com relacionamentos atrelados para prevenir N+1 queries (`with(['images' => fn($q) => $q->where('is_cover', true)])`).

---

## 4. API Resources e Requests

### Form Requests
- `StorePropertyRequest` e `UpdatePropertyRequest`:
  - Validações rígidas (`reference_code` unique ignorando atualizações em si mesmo).
  - Checagens dinâmicas de valores enum (Ex: Validar se `purpose` ou `property_type` existe de fato no array JSON da tag correspondente na tabela `system_enums`).
  - Validação boolean para os campos adequados.
  - Se `has_exclusive_right` for `true`, `exclusive_right_expiration_date` passa a ser obrigatório.

### API Resources
- `PropertyResource`: Trata a formatação monetária e boleano. Converte a área `usable_area` de string para float com vírgulas/pontos no padrão brasileiro caso o frontend demande, ou devolve puramente float da base de dados. Expande relações limitadas em sub-resources como `PropertyImageResource` (formatando as URLs de arquivos para acesso no storage), `BrokerResource` minimizado para o corretor dono e `FeatureResource`.
- `PropertyCollection`: Facilita listagens em massa com dados enxutos (com metadata do Paginator nativo do Laravel).

---

## 5. Políticas de Autorização (Gate & Policies)
Utilizando o Spatie Permissions (estipulado no módulo de Gestão de Usuários):
- `properties.view`: Visualizar imóveis cadastrados.
- `properties.create`: Cadastrar imóveis.
- `properties.edit.all` ou `properties.edit.self`: Editá-los (restrição se o usuário for um corretor tentando editar um imóvel de outro, valendo pela policy do model vinculando ao `broker_id`).
- `properties.delete`: Exclusões brandas (`SoftDeletes` recomendado na tabela).

---

## 6. Rotas (`routes/api.php`)
```php
Route::middleware(['auth:sanctum'])->group(function () {
    Route::apiResource('properties', PropertyController::class);
    Route::post('properties/{property}/images', [PropertyImageController::class, 'store']); // Upload isolado na model
    Route::delete('properties/{property}/images/{image}', [PropertyImageController::class, 'destroy']);
    
    // Domínios Dinâmicos (Selects)
    Route::get('enums', [SystemEnumController::class, 'index']);
    
    // Auxiliares (Características de Imóvel pre-existentes)
    Route::get('features', [FeatureController::class, 'index']);
});
```

*Nota: Um endpoint público de API (ex: `Route::prefix('public')->group(...)`) pode vir a ser construído para entregar os imóveis para o frontend Next.js do site, sem requerer token Sanctum de Admin, listando apenas onde `is_published` for verdadeiro.*
