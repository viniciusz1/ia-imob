# Diagramas de Classe — ia-imob

> Documentação gerada a partir da análise do código-fonte existente e das especificações técnicas dos módulos planejados.
> Cada seção corresponde a uma feature do [PRD](file:///home/vinicius/apps/ia-imob/docs/roadmaps/PRD.md).

---

## Sumário

1. [Diagrama Geral de Entidades](#1-diagrama-geral-de-entidades)
2. [Login e Autenticação](#2-login-e-autenticação)
3. [Gestão de Usuários](#3-gestão-de-usuários)
4. [Grupos de Usuários — RBAC](#4-grupos-de-usuários--rbac)
5. [Cadastro de Imóveis](#5-cadastro-de-imóveis)
6. [Gestão de Leads — CRM](#6-gestão-de-leads--crm)
7. [Gerador de Sites White-Label — B2B SaaS](#7-gerador-de-sites-white-label--b2b-saas)
8. [Pagamento Recorrente — Asaas](#8-pagamento-recorrente--asaas)
9. [AI Searcher — Base Consolidada de Jaraguá](#9-ai-searcher--base-consolidada-de-jaraguá)
10. [Ecossistema de Integração](#10-ecossistema-de-integração)

---

## 1. Diagrama Geral de Entidades

Visão de alto nível de **todos os Models** e seus relacionamentos.

```mermaid
classDiagram
    direction LR

    class User {
        +int id
        +string name
        +string email
        +string phone
        +string creci
        +string username
        +string password
        +string avatar_path
        +bool is_active
        +bool show_on_website
        +bool has_broker_page
        +string asaas_customer_id
        +datetime last_seen_at
        +subscriptions() HasMany
        +scopeOnline() Builder
    }

    class Property {
        +int id
        +string reference_code
        +string title
        +string description
        +string property_type
        +string purpose
        +string status
        +decimal sale_price
        +decimal rent_price
        +bool is_published
        +bool is_highlighted
        +int broker_id
        +int owner_id
        +images() HasMany
        +features() BelongsToMany
        +broker() BelongsTo
        +owner() BelongsTo
    }

    class PropertyImage {
        +int id
        +int property_id
        +string path
        +bool is_cover
        +int order
        +string description
        +property() BelongsTo
    }

    class Feature {
        +int id
        +string name
        +string icon
        +properties() BelongsToMany
    }

    class SubscriptionPlan {
        +int id
        +string name
        +string slug
        +AsaasCycle asaas_cycle
        +decimal price_per_month
        +decimal total_price
        +string description
        +bool is_active
        +subscriptions() HasMany
    }

    class TenantSubscription {
        +int id
        +int user_id
        +int plan_id
        +string asaas_customer_id
        +string asaas_subscription_id
        +BillingType billing_type
        +SubscriptionStatus status
        +date next_due_date
        +datetime started_at
        +datetime ends_at
        +user() BelongsTo
        +plan() BelongsTo
    }

    class ScrapyProperty {
        +int id
        +string tipo
        +string imobiliaria
        +decimal valor
        +string bairro
        +string cidade
        +string imagem
        +string link_imovel
        +string descricao
        +int qtd_quartos
        +decimal area_m2
    }

    class SystemEnum {
        +int id
        +string tag
        +json data
    }

    User "1" --> "*" TenantSubscription : has
    User "1" --> "*" Property : broker
    User "1" --> "*" Property : owner
    SubscriptionPlan "1" --> "*" TenantSubscription : has
    Property "1" --> "*" PropertyImage : has
    Property "*" <--> "*" Feature : property_feature
```

---

## 2. Login e Autenticação

**Status:** ✅ Implementado

```mermaid
classDiagram
    direction TB

    class AuthController {
        <<controller>>
        -AuthService authService
        +login(LoginRequest) JsonResponse
        +logout(Request) JsonResponse
        +user(Request) UserResource
        +ping(Request) JsonResponse
    }

    class AuthService {
        <<service>>
        +attemptLogin(array credentials) User
        +logout() void
    }

    class LoginRequest {
        <<formrequest>>
        +rules() array
    }

    class UserResource {
        <<resource>>
        +toArray(Request) array
    }

    class User {
        <<model>>
        +string email
        +string username
        +string password
        +bool is_active
        +datetime last_seen_at
    }

    AuthController --> AuthService : usa
    AuthController --> LoginRequest : valida
    AuthController --> UserResource : formata
    AuthService --> User : autentica
```

---

## 3. Gestão de Usuários

**Status:** ✅ Implementado

```mermaid
classDiagram
    direction TB

    class UserController {
        <<controller>>
        -UserService service
        +index(IndexUserRequest) ResourceCollection
        +show(ShowUserRequest, int) UserResource
        +store(StoreUserRequest) JsonResponse
        +update(UpdateUserRequest, int) UserResource
        +destroy(DestroyUserRequest, int) JsonResponse
    }

    class UserService {
        <<service>>
        -UserRepository repository
        -AssignRoleToUserAction assignRoleAction
        +list(array, int) LengthAwarePaginator
        +findOrFail(int) User
        +create(array, UploadedFile) User
        +update(User, array, UploadedFile) User
        +delete(User) bool
    }

    class UserRepository {
        <<repository>>
        -User model
        +list(array, int) LengthAwarePaginator
        +findById(int) User?
        +create(array) User
        +update(User, array) User
        +delete(User) bool
    }

    class UserPolicy {
        <<policy>>
        +viewAny(User) bool
        +view(User, User) bool
        +create(User) bool
        +update(User, User) bool
        +delete(User, User) bool
    }

    class AssignRoleToUserAction {
        <<action>>
        +execute(User, int|string|null) void
    }

    class User {
        <<model>>
        +string name
        +string email
        +string phone
        +string creci
        +string username
        +string avatar_path
        +bool is_active
        +bool show_on_website
        +bool has_broker_page
        +subscriptions() HasMany
        +scopeOnline() Builder
    }

    UserController --> UserService : delega
    UserService --> UserRepository : persiste
    UserService --> AssignRoleToUserAction : atribui role
    UserController ..> UserPolicy : autoriza
    AssignRoleToUserAction --> User : syncRoles
    UserRepository --> User : queries
```

---

## 4. Grupos de Usuários — RBAC

**Status:** ✅ Implementado — via `spatie/laravel-permission`

```mermaid
classDiagram
    direction TB

    class RoleController {
        <<controller>>
        +index(ManageRolesRequest) ResourceCollection
        +store(StoreRoleRequest, CreateRoleAction) JsonResponse
        +show(ManageRolesRequest, Role) RoleResource
        +update(UpdateRoleRequest, Role, UpdateRoleAction) RoleResource
        +destroy(ManageRolesRequest, Role, DeleteRoleAction) JsonResponse
        -ensureRoleGuard(Role) void
    }

    class PermissionController {
        <<controller>>
        +index(IndexPermissionRequest) ResourceCollection
    }

    class CreateRoleAction {
        <<action>>
        +execute(string name, array permissions) Role
        -normalizePermissionIdsForGuard(array, string) array
    }

    class UpdateRoleAction {
        <<action>>
        +execute(Role, string, array) Role
    }

    class DeleteRoleAction {
        <<action>>
        +execute(Role) void
    }

    class Role {
        <<spatie>>
        +string name
        +string guard_name
        +permissions() BelongsToMany
    }

    class Permission {
        <<spatie>>
        +string name
        +string guard_name
    }

    class User {
        <<model>>
        +HasRoles trait
        +hasPermissionTo(string) bool
        +syncRoles(array) void
    }

    RoleController --> CreateRoleAction : store
    RoleController --> UpdateRoleAction : update
    RoleController --> DeleteRoleAction : destroy
    CreateRoleAction --> Role : create
    CreateRoleAction --> Permission : normaliza
    Role "*" <--> "*" Permission : role_has_permissions
    User "*" <--> "*" Role : model_has_roles
```

---

## 5. Cadastro de Imóveis

**Status:** 🔧 Em Desenvolvimento

```mermaid
classDiagram
    direction TB

    class PropertyController {
        <<controller>>
        -PropertyService propertyService
        +index(IndexPropertyRequest) PropertyCollection
        +store(StorePropertyRequest) PropertyResource
        +show(ShowPropertyRequest, Property) PropertyResource
        +update(UpdatePropertyRequest, Property) PropertyResource
        +destroy(DestroyPropertyRequest, Property) void
    }

    class PropertyImageController {
        <<controller>>
        +store(Property, UploadedFile) PropertyImage
        +destroy(PropertyImage) void
        +setCover(PropertyImage) void
        +reorder(array) void
    }

    class FeatureController {
        <<controller>>
        +index() ResourceCollection
    }

    class SystemEnumController {
        <<controller>>
        +index() ResourceCollection
    }

    class PropertyService {
        <<service>>
        -PropertyRepositoryInterface propertyRepository
        +listProperties(array) LengthAwarePaginator
        +getProperty(int) Property?
        +createProperty(array) Property
        +updateProperty(Property, array) Property
        +deleteProperty(Property) bool
        #validateExclusivity(array) void
    }

    class PropertyImageService {
        <<service>>
        +storeImage(Property, UploadedFile, array) PropertyImage
        +deleteImage(PropertyImage) bool
        +setAsCover(PropertyImage) bool
        +reorderImages(array) void
    }

    class PropertyRepositoryInterface {
        <<interface>>
        +paginate(array) LengthAwarePaginator
        +find(int) Property?
        +findByReferenceCode(string) Property?
        +create(array) Property
        +update(Property, array) Property
        +delete(Property) bool
    }

    class PropertyRepository {
        <<repository>>
        +paginate(array) LengthAwarePaginator
        +find(int) Property?
        +findByReferenceCode(string) Property?
        +create(array) Property
        +update(Property, array) Property
        +delete(Property) bool
    }

    class PropertyPolicy {
        <<policy>>
        +viewAny(User) bool
        +view(User, Property) bool
        +create(User) bool
        +update(User, Property) bool
        +delete(User, Property) bool
    }

    class Property {
        <<model>>
        +string reference_code
        +string title
        +string property_type
        +string purpose
        +string status
        +decimal sale_price
        +decimal rent_price
        +bool is_published
        +bool is_highlighted
        +bool has_exclusive_right
        +date exclusive_right_expiration_date
        +int broker_id
        +int owner_id
        +images() HasMany
        +features() BelongsToMany
        +broker() BelongsTo
        +owner() BelongsTo
    }

    class PropertyImage {
        <<model>>
        +int property_id
        +string path
        +bool is_cover
        +int order
        +string description
        +property() BelongsTo
    }

    class Feature {
        <<model>>
        +string name
        +string icon
        +properties() BelongsToMany
    }

    class SystemEnum {
        <<model>>
        +string tag
        +json data
    }

    PropertyController --> PropertyService : delega
    PropertyController ..> PropertyPolicy : autoriza
    PropertyService --> PropertyRepositoryInterface : usa
    PropertyRepositoryInterface <|.. PropertyRepository : implementa
    PropertyRepository --> Property : queries
    PropertyImageController --> PropertyImageService : delega
    Property "1" --> "*" PropertyImage : images
    Property "*" <--> "*" Feature : property_feature
    Property --> User : broker
    Property --> User : owner
    FeatureController --> Feature : lista
    SystemEnumController --> SystemEnum : lista
```

---

## 6. Gestão de Leads — CRM

**Status:** 📋 Planejado — [Especificação](file:///home/vinicius/apps/ia-imob/docs/technical-implementations/gestao-leads/laravel/especificacao.md)

```mermaid
classDiagram
    direction TB

    class Lead {
        <<model - planejado>>
        +int id
        +string name
        +string email
        +string phone
        +string origin
        +decimal expected_value
        +int status_id
        +int funnel_step_id
        +int user_id
        +datetime deleted_at
        +funnelStep() BelongsTo
        +user() BelongsTo
        +interactions() HasMany
        +latestInteraction() HasOne
    }

    class FunnelStep {
        <<model - planejado>>
        +int id
        +string name
        +int order
        +leads() HasMany
    }

    class Interaction {
        <<model - planejado>>
        +int id
        +int lead_id
        +string type
        +text content
        +datetime created_at
        +lead() BelongsTo
    }

    class LeadController {
        <<controller - planejado>>
        +index() ResourceCollection
        +store(Request) JsonResponse
        +show(Lead) JsonResponse
        +update(Lead) JsonResponse
        +destroy(Lead) JsonResponse
    }

    class KanbanController {
        <<controller - planejado>>
        +index() JsonResponse
        +moveCard(Lead) JsonResponse
        +addInteraction(Lead) JsonResponse
    }

    class LeadDistributionService {
        <<service - planejado>>
        +distributeRoundRobin(Lead) void
        +distributeByScore(Lead) void
    }

    class LeadObserver {
        <<observer - planejado>>
        +updated(Lead) void
    }

    class LeadPolicy {
        <<policy - planejado>>
        +viewAny(User) bool
        +view(User, Lead) bool
        +manage(User, Lead) bool
        +editSelf(User, Lead) bool
    }

    class LeadRepository {
        <<repository - planejado>>
        +kanbanByStep(array) Collection
        +paginate(array) LengthAwarePaginator
    }

    class KanbanResource {
        <<resource - planejado>>
        +int days_inactive
        +toArray(Request) array
    }

    LeadController --> LeadRepository : persiste
    KanbanController --> LeadRepository : agrupa por step
    KanbanController --> KanbanResource : formata
    LeadDistributionService --> Lead : atribui user_id
    LeadObserver --> Interaction : cria log De/Para
    Lead "*" --> "1" FunnelStep : pertence
    Lead "*" --> "1" User : corretor
    Lead "1" --> "*" Interaction : histórico
    LeadController ..> LeadPolicy : autoriza
```

---

## 7. Gerador de Sites White-Label — B2B SaaS

**Status:** 📋 Planejado — [Especificação](file:///home/vinicius/apps/ia-imob/docs/technical-implementations/b2b-site-builder/laravel/especificacao.md) | [Arquitetura](file:///home/vinicius/apps/ia-imob/docs/complex-plans/b2b-multi-tenant-website-builder.md)

```mermaid
classDiagram
    direction TB

    class Tenant {
        <<model - planejado>>
        +int id
        +string name
        +string document
        +string email
        +bool is_active
        +datetime deleted_at
        +domains() HasMany
        +siteSetting() HasOne
        +users() HasMany
        +properties() HasMany
        +siteVersions() HasMany
    }

    class TenantDomain {
        <<model - planejado>>
        +int id
        +int tenant_id
        +string domain
        +bool is_primary
        +bool is_verified
        +tenant() BelongsTo
    }

    class TenantSiteSetting {
        <<model - planejado>>
        +int id
        +int tenant_id
        +string theme_slug
        +string primary_color
        +string secondary_color
        +string logo_path
        +string favicon_path
        +string whatsapp_number
        +string instagram_url
        +tenant() BelongsTo
    }

    class SiteVersion {
        <<model - planejado>>
        +int id
        +int tenant_id
        +json settings_snapshot
        +string description
        +datetime created_at
        +tenant() BelongsTo
    }

    class BelongsToTenant {
        <<trait - planejado>>
        +booted() void
    }

    class IdentifyTenantByDomain {
        <<middleware - planejado>>
        +handle(Request, Closure) Response
    }

    class SiteSettingController {
        <<controller - planejado>>
        +show() JsonResponse
        +update(UpdateSiteSettingRequest) JsonResponse
    }

    class DomainController {
        <<controller - planejado>>
        +index() ResourceCollection
        +store(Request) JsonResponse
        +destroy(TenantDomain) JsonResponse
    }

    class PublicPropertyController {
        <<controller - planejado>>
        +index(Request) ResourceCollection
        +show(string reference_code) JsonResponse
    }

    class PublicSiteSettingController {
        <<controller - planejado>>
        +show() JsonResponse
    }

    class UpdateTenantSiteSettingsAction {
        <<action - planejado>>
        +execute(Tenant, array data) TenantSiteSetting
    }

    class UpdateSiteSettingRequest {
        <<formrequest - planejado>>
        +rules() array
    }

    class PublicPropertyRepository {
        <<repository - planejado>>
        +paginate(array) LengthAwarePaginator
    }

    class PublicPropertyResource {
        <<resource - planejado>>
        +toArray(Request) array
    }

    Tenant "1" --> "*" TenantDomain : domains
    Tenant "1" --> "1" TenantSiteSetting : setting
    Tenant "1" --> "*" SiteVersion : versões
    Tenant "1" --> "*" User : users
    Tenant "1" --> "*" Property : properties

    SiteSettingController --> UpdateTenantSiteSettingsAction : delega
    SiteSettingController --> UpdateSiteSettingRequest : valida
    DomainController --> TenantDomain : CRUD
    PublicPropertyController --> PublicPropertyRepository : consulta
    PublicPropertyController --> PublicPropertyResource : formata
    PublicSiteSettingController --> TenantSiteSetting : lê
    IdentifyTenantByDomain --> TenantDomain : resolve
    BelongsToTenant --> Tenant : Global Scope

    User ..> BelongsToTenant : usa trait
    Property ..> BelongsToTenant : usa trait
```

---

## 8. Pagamento Recorrente — Asaas

**Status:** ✅ Implementado

```mermaid
classDiagram
    direction TB

    class SubscriptionController {
        <<controller>>
        -SubscriptionService service
        +current() JsonResponse
        +store(SubscriptionStoreRequest) JsonResponse
        +destroy(int id) JsonResponse
    }

    class PlanController {
        <<controller>>
        +index() JsonResponse
    }

    class AsaasWebhookController {
        <<controller>>
        +handle(Request) JsonResponse
    }

    class SubscriptionService {
        <<service>>
        -AsaasService asaas
        +subscribe(User, SubscriptionPlan, BillingType) TenantSubscription
        +cancel(TenantSubscription) void
    }

    class AsaasService {
        <<service>>
        -string baseUrl
        -string token
        -client() PendingRequest
        +createCustomer(array) array
        +getCustomer(string) array
        +createSubscription(array) array
        +cancelSubscription(string) array
        +getSubscription(string) array
        +getSubscriptionPayments(string) array
    }

    class SubscriptionPlan {
        <<model>>
        +string name
        +string slug
        +AsaasCycle asaas_cycle
        +decimal price_per_month
        +decimal total_price
        +string description
        +bool is_active
        +subscriptions() HasMany
    }

    class TenantSubscription {
        <<model>>
        +int user_id
        +int plan_id
        +string asaas_customer_id
        +string asaas_subscription_id
        +BillingType billing_type
        +SubscriptionStatus status
        +date next_due_date
        +datetime started_at
        +datetime ends_at
        +user() BelongsTo
        +plan() BelongsTo
    }

    class AsaasCycle {
        <<enum>>
        Monthly
        Semiannually
        Yearly
    }

    class BillingType {
        <<enum>>
        Boleto
        CreditCard
        Pix
    }

    class SubscriptionStatus {
        <<enum>>
        Pending
        Active
        Inactive
        Expired
        Cancelled
    }

    SubscriptionController --> SubscriptionService : delega
    SubscriptionService --> AsaasService : API Asaas
    SubscriptionService --> TenantSubscription : persiste
    SubscriptionService --> User : asaas_customer_id
    PlanController --> SubscriptionPlan : lista
    AsaasWebhookController --> TenantSubscription : atualiza status
    SubscriptionPlan "1" --> "*" TenantSubscription : plano
    User "1" --> "*" TenantSubscription : assinaturas
    TenantSubscription --> BillingType : tipo
    TenantSubscription --> SubscriptionStatus : status
    SubscriptionPlan --> AsaasCycle : ciclo
```

---

## 9. AI Searcher — Base Consolidada de Jaraguá

**Status:** ✅ Implementado (parcial — Jobs e Insights planejados)

```mermaid
classDiagram
    direction TB

    class ScrapyPropertyController {
        <<controller>>
        +index(Request) ResourceCollection
        +filters() JsonResponse
    }

    class ScrapyProperty {
        <<model>>
        +int id
        +string tipo
        +string imobiliaria
        +decimal valor
        +string bairro
        +string cidade
        +string imagem
        +string link_imovel
        +string descricao
        +int qtd_quartos
        +decimal area_m2
    }

    class ScrapyPropertyResource {
        <<resource>>
        +toArray(Request) array
    }

    class ScrapyJob {
        <<job - planejado>>
        +handle() void
    }

    class ScrapyComparisonService {
        <<service - planejado>>
        +compareWeeklyBases() Collection
        +getNewListings() Collection
    }

    class ScrapyInsightsService {
        <<service - planejado>>
        +getGrowingNeighborhoods() array
        +getMostExpensivePerSqm() array
        +getAgencyConcentration() array
        +generateChartData() array
    }

    class ScrapyInsightsController {
        <<controller - planejado>>
        +index() JsonResponse
        +charts() JsonResponse
    }

    ScrapyPropertyController --> ScrapyProperty : consulta
    ScrapyPropertyController --> ScrapyPropertyResource : formata
    ScrapyJob --> ScrapyProperty : popula
    ScrapyComparisonService --> ScrapyProperty : compara bases
    ScrapyInsightsService --> ScrapyProperty : extrai insights
    ScrapyInsightsController --> ScrapyInsightsService : delega
```

---

## 10. Ecossistema de Integração

**Status:** 📋 Planejado — Requisitos PAC seções 8 e 9

```mermaid
classDiagram
    direction TB

    class PortalFeedService {
        <<service - planejado>>
        +generateFeed(Tenant) string
        +submitToPortals(string xml) void
        +getProcessingStatus() array
    }

    class VRSyncXmlGenerator {
        <<service - planejado>>
        +generate(Collection properties) string
        +buildPropertyNode(Property) DOMElement
        +formatIPTU(Property) string
        +formatPrices(Property) array
    }

    class PortalFeedJob {
        <<job - planejado>>
        +handle() void
    }

    class PortalFeedController {
        <<controller - planejado>>
        +status() JsonResponse
        +reports() ResourceCollection
        +triggerManual() JsonResponse
    }

    class PortalFeedReport {
        <<model - planejado>>
        +int id
        +int tenant_id
        +string portal_name
        +string status
        +int total_listings
        +int successful
        +int failed
        +json error_details
        +datetime processed_at
        +tenant() BelongsTo
    }

    class LeadCaptationService {
        <<service - planejado>>
        +processPortalLead(array data) Lead
        +syncWithCRM(Lead) void
    }

    class PortalWebhookController {
        <<controller - planejado>>
        +handleOLX(Request) JsonResponse
        +handleZAP(Request) JsonResponse
        +handleVivaReal(Request) JsonResponse
    }

    class IntegrationConfig {
        <<model - planejado>>
        +int id
        +int tenant_id
        +string portal_name
        +string api_token
        +string endpoint_url
        +bool is_active
        +json settings
        +tenant() BelongsTo
    }

    PortalFeedJob --> PortalFeedService : executa 2x/dia
    PortalFeedService --> VRSyncXmlGenerator : gera XML
    PortalFeedService --> IntegrationConfig : credenciais
    PortalFeedService --> PortalFeedReport : registra resultado
    PortalFeedController --> PortalFeedReport : consulta
    PortalWebhookController --> LeadCaptationService : processa lead
    LeadCaptationService --> Lead : cria lead no CRM
    VRSyncXmlGenerator --> Property : lê dados
    IntegrationConfig --> Tenant : pertence a
    PortalFeedReport --> Tenant : pertence a
```

---

## Legenda

| Estereótipo | Descrição |
|:---:|:---|
| `<<model>>` | Eloquent Model (implementado) |
| `<<model - planejado>>` | Model previsto na especificação técnica |
| `<<service>>` | Service Layer class |
| `<<controller>>` | HTTP Controller |
| `<<repository>>` | Repository Pattern class |
| `<<policy>>` | Laravel Policy (autorização) |
| `<<action>>` | Single-responsibility Action class |
| `<<enum>>` | PHP 8.1 Backed Enum |
| `<<formrequest>>` | Laravel Form Request (validação) |
| `<<resource>>` | API Resource (serialização) |
| `<<trait>>` | PHP Trait reutilizável |
| `<<middleware>>` | HTTP Middleware |
| `<<observer>>` | Eloquent Observer |
| `<<job>>` | Laravel Queue Job |
| `<<spatie>>` | Classe do pacote `spatie/laravel-permission` |

### Notação de Relacionamentos

| Símbolo | Significado |
|:---:|:---|
| `-->` | Associação / Dependência direta |
| `<\|..` | Implementação de interface |
| `<-->` | Muitos-para-muitos (M:N) |
| `..>` | Dependência fraca / usa |
| `"1" --> "*"` | Um-para-muitos (1:N) |
| `"1" --> "1"` | Um-para-um (1:1) |
