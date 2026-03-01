# Relatório de Sincronização de Contrato de API: Cadastro de Imóveis

Este relatório foi gerado baseado nas definições encontradas nos documentos `docs/cadastro-imoveis/laravel/01-backend.md` e `docs/cadastro-imoveis/next/01-frontend.md`. O objetivo é garantir que a estrutura de banco de dados e as validações exigidas pela API backend (Laravel) coincidam com o que será manipulado e transmitido pela interface frontend (Next.js/React Hook Form/Zod).

## 1. Mapeamento de Campos e Análise de Conformidade (Cross-Check)

Analisando a estrutura principal exigida (`properties`), listamos as equivalências.

| Campo Backend (Laravel) | Tipo de Dado (Laravel) | Previsão no Frontend (Zod/Form) | Tipo de Dado (Next.js) | Compatibilidade / Status |
| :--- | :--- | :--- | :--- | :--- |
| `reference_code` | string (unique) | Dados Básicos (Código Ref.) | string | :white_check_mark: **OK** |
| `title` | string | Dados Básicos | string.min() | :white_check_mark: **OK** |
| `description` | text | Dados Básicos | string | :white_check_mark: **OK** |
| `property_type` | string (Enum system_enums) | Dados Básicos (Select) | string | :white_check_mark: **OK** |
| `purpose` | string (Enum system_enums) | Dados Básicos (Select) | string | :white_check_mark: **OK** |
| `status` | string (Enum system_enums) | Dados Básicos (Select) | string | :white_check_mark: **OK** |
| `zip_code` | string | Localização | string | :white_check_mark: **OK** (Previsto Hook ViaCEP) |
| `state` | string | Localização | string | :white_check_mark: **OK** |
| `city` | string | Localização | string | :white_check_mark: **OK** |
| `neighborhood` | string | Localização | string | :white_check_mark: **OK** |
| `street` | string | Localização | string | :white_check_mark: **OK** |
| `number` | string | Localização | string | :white_check_mark: **OK** |
| `complement` | string | Localização | string.optional() | :white_check_mark: **OK** |
| `show_exact_address` | boolean | Localização (Switch) | boolean | :white_check_mark: **OK** |
| `sale_price` | decimal (nullable) | Valores | number.optional() | :white_check_mark: **OK** |
| `rent_price` | decimal (nullable) | Valores | number.optional() | :white_check_mark: **OK** |
| `property_tax` | decimal (nullable) | Valores (IPTU) | number.optional() | :white_check_mark: **OK** |
| `condo_fee` | decimal (nullable) | Valores | number.optional() | :white_check_mark: **OK** |
| `accepts_financing` | boolean | Valores (Switch) | boolean | :white_check_mark: **OK** |
| `accepts_exchange` | boolean | Valores (Switch) | boolean | :white_check_mark: **OK** |
| `show_price` | boolean | Valores (Switch) | boolean | :white_check_mark: **OK** |
| `usable_area` | decimal (nullable) | Características | number.optional() | :white_check_mark: **OK** |
| `total_area` | decimal (nullable) | Características | number.optional() | :white_check_mark: **OK** |
| `bedrooms` | integer | Características | number | :white_check_mark: **OK** |
| `suites` | integer | Características | number | :white_check_mark: **OK** |
| `bathrooms` | integer | Características | number | :white_check_mark: **OK** |
| `garage_spaces` | integer | Características | number | :white_check_mark: **OK** |
| `build_year` | integer (nullable) | Características | number.optional() | :white_check_mark: **OK** |
| `video_url` | string (nullable) | Mídias Exclusivas | string.url().optional()| :white_check_mark: **OK** |
| `virtual_tour_url` | string (nullable) | Mídias Exclusivas | string.url().optional()| :white_check_mark: **OK** |
| `broker_id` | foreignId (nullable) | Gestão Interna | number.optional() | :warning: **AVISO** (Requer ref. para selects de usuários/corretores) |
| `owner_id` | foreignId (nullable) | Gestão Interna | number.optional() | :warning: **AVISO** (Requer ref. para tabela clientes proprietários) |
| `has_exclusive_right` | boolean | Gestão Interna (Switch) | boolean | :white_check_mark: **OK** |
| `exclusive_right_expiration_date` | date (nullable) | Gestão Interna | date.optional() | :white_check_mark: **OK** (Integrado no `superRefine` do Zod) |
| `internal_notes`| text (nullable) | Gestão Interna | string.optional() | :white_check_mark: **OK** |
| `keys_location` | string (nullable) | Gestão Interna | string.optional() | :white_check_mark: **OK** |
| `is_published` | boolean | Gestão Interna (Switch) | boolean | :white_check_mark: **OK** |
| `is_highlighted`| boolean | Gestão Interna (Switch) | boolean | :white_check_mark: **OK** |

## 2. Inconsistências e Pontos de Atenção (Mismatch Detection)

Após o *cross-check*, não foram encontradas colisões graves de nomenclatura (`Naming Collision`) nem discrepâncias de tipos de dados (`Type Incompatibility`) nos campos listados nativamente nos documentos vigentes. Os formulários do Next.js parecem cobrir todas as migrações criadas no Laravel.

Abaixo estão avisos (Warnings) de pequenos desvios ou omissões que exigem refinamento para que nenhum erro aconteça em runtime:

1. **[AVISO] Integração Geográfica do Mapa (Frontend)**
   - O backend define: `latitude` (decimal) e `longitude` (decimal).
   - O frontend na Etapa 4 (Localização) precisa implementar uma captura automática usando o CEP (BrasilAPI/Google Maps SDK) ou ter os campos ocultos de lat/lng para salvar no submit.

2. **[AVISO] Array de Comodidades N:N (`features`)**
   - Backend define a relação N:N atrelada aos imóveis via pivot.
   - O Frontend (Zod) deverá prever um array correspondente para submissão: `features: z.array(z.number())` (enviando IDs) ou similar para que o Laravel interprete na request de upload das comodidades.

3. **[AVISO] Andar do Prédio (Omissão no Frontend)**
   - O backend declarou `floor_number` e `total_floors` (ambos inteiros). 
   - A documentação do Frontend não os cita explicitamente na Etapa 2. É imperativo que os `inputs` de números relativos a andares existam na interface para tipos apartamento/sala comercial.

4. **[AVISO] Corretor e Proprietário (Gestão Interna)**
   - A etapa de Gestão Interna precisará fazer Data Fetching para popular os contatos do dono (`owner_id`) e captador (`broker_id`). Os payloads deverão enviar `number` ou `unassigned`.

## 3. Proposta de Ajuste (Architectural Proposal)

Para manter a harmonia completa entre os lados, a recomendação é que a documentação do Frontend no `Zod Schema` seja estendida (no projeto prático) da seguinte maneira:

```typescript
// Extensão sugerida de tipos omitidos
features: z.array(z.number()).optional(), // Array ID numéricos
latitude: z.number().optional(),
longitude: z.number().optional(),
floor_number: z.number().optional(),  // Mapeando do backend
total_floors: z.number().optional(),  // Mapeando do backend
broker_id: z.number().optional(),
owner_id: z.number().optional()
```

## 4. Conclusão Final e Resolução

A Estrutura base de dados gerada atende 100% dos requisitos de negócio dispostos no formulário *frontend*, principalmente no controle condicional de exclusividade que já está alinhado com o `superRefine` do Zod. Não há necessidade crítica de alterar arquivos PHP ou TS no momento.

✅ **Aviso de Resolução (Post-Sync):** Os 4 apontamentos indicados na Seção 2 foram aplicados à documentação do Frontend (`01-frontend.md`). O `Zod Schema` reflete agora perfeitamente todos os tipos e captações necessárias previstas no Backend.
A documentação está **VALIDADA e 100% sincronizada**.
