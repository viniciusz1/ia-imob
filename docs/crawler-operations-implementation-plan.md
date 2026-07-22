# Plano de implementação das Operações do Crawler

Este documento consolida a implementação da interface de gerenciamento do Crawler Machine. O vocabulário canônico está em `crawler-machine/CONTEXT.md`; detalhes de produto estão em `docs/crawler-operations-interface.md`; decisões estruturais estão em `docs/adr/0008` a `0013` e nos ADRs do Crawler Machine.

## Arquitetura alvo

```text
Next.js Admin Area
        |
        | API autenticada + permissões
        v
Laravel Control Plane --------> PostgreSQL <-------- Python Crawler Workers
        |                           |                         |
        | políticas, aprovações     | fila, planos,            | discovery, schemas,
        | schedules e leitura       | snapshots e artefatos     | crawl e normalização
        v                           v                         v
 AI Searcher e Valuation leem somente Snapshots Publicados
```

- Laravel é o único backend acessado pelo frontend. Autoriza ações, valida planos, cria Operações do Crawler, administra configurações e expõe progresso e resultados.
- Crawler Machine é um serviço Python independente e continuamente ativo. Reivindica operações no Postgres com claim atômico, lease e heartbeat.
- Postgres é a fila durável e o repositório de todos os dados operacionais. Arquivos locais do worker são temporários.
- A interface observa os workers, mas não inicia, interrompe, implanta ou atualiza processos.
- O frontend usa polling a cada três segundos durante acompanhamento ativo, com redução de frequência em segundo plano.

## Responsabilidades

| Componente | Responsabilidades |
| --- | --- |
| Next.js | Fluxos administrativos, formulários de planos, tabelas paginadas, aprovação humana e acompanhamento de operações. |
| Laravel | Autenticação, permissões, invariantes, migrations, schedules, criação/cancelamento/retentativa, contratos, políticas e respostas paginadas. |
| Crawler Machine | Prospecção, sugestão de URL pela home, discovery, geração e execução dos Perfis de Extração, normalização, relatórios e avaliação técnica. |
| Postgres | Dispatch, leases, progresso, histórico, snapshots, dados brutos/normalizados/rejeitados, artefatos, logs e configurações versionadas. |

## Modelo de dados

As migrations pertencem ao Laravel e devem substituir as tabelas legadas baseadas em `source_name`. Como não há produção, a transição é um corte direto, compatível com `migrate:fresh`, sem aliases, dual read ou backfill.

### Cadastro e configuração

- `crawler.crawl_agencies`: identidade estável, nome, slug, domínio raiz único, URL base, estado administrativo e condição de saúde.
- `crawler.prospects`: dados descobertos, classificação automática, estado da revisão humana e vínculo opcional para a Crawl Agency promovida.
- `crawler.market_data_contract_versions`: payload do contrato, estado `draft|validating|active`, classificação de compatibilidade e metadados de ativação.
- `crawler.quality_policy_versions`: regras e limites, estado `draft|validating|active` e metadados de ativação.
- `crawler.quality_exceptions`: exceção por Crawl Agency, versão da política, responsável, data e motivo.
- `crawler.extraction_profiles`: Crawl Agency, número da versão, estado candidato/aprovado/reprovado/ativo, URL de amostra, schemas, estratégias, versão do contrato e decisão humana.
- `crawler.crawl_schedules`: preset, timezone, próxima execução, override por Crawl Agency e suspensão por circuito ou revalidação.

### Operações e workers

- `crawler.operation_groups`: agregação de ações em lote e prospecção por várias cidades.
- `crawler.operations`: tipo, estado monotônico, solicitante, alvo, grupo, operação anterior, Plano da Operação imutável, estágio, progresso, heartbeat, cancelamento, resultado e erro.
- `crawler.worker_instances`: identidade, versão, capacidade, saúde e último heartbeat.
- `crawler.discovery_snapshots` e `crawler.discovery_snapshot_urls`: conjunto imutável de URLs e vínculo à operação/Crawl Agency.
- `crawler.crawl_runs`: resultado técnico de crawl vinculado à operação, discovery, perfil e versões fixadas de contrato/política.
- `crawler.quality_reports`: métricas, cobertura, rejeições, regressões, veredito e versão da política aplicada.
- `crawler.market_snapshots`: candidato/publicado/quarentena, Crawl Agency, run, decisão de publicação e ponteiro para a publicação anterior.

O Plano da Operação deve usar colunas tipadas para identidades e versões importantes, além de um JSONB imutável com a representação completa apresentada ao operador. O JSONB não substitui FKs nem restrições.

### Identidade e versões dos anúncios

- `crawler.listing_identities`: chave única `(crawl_agency_id, listing_key)`, external ID quando disponível, URL canônica de fallback e estado atual.
- `crawler.market_properties`: Versões do Anúncio imutáveis vinculadas a uma identidade, snapshot, run e RawProperty.
- A chave usa o external ID da fonte ou, sem ele, hash da URL canônica.
- A primeira ausência publicada marca `missing`; a segunda marca `removed`. Indisponibilidade explícita ou HTTP `404/410` remove imediatamente.
- Reaparecimento reutiliza a identidade e cria outra versão imutável.

### Dados volumosos e partições

Particionar mensalmente por `created_at`:

- `crawler.raw_properties`;
- `crawler.market_properties`;
- `crawler.artifacts`;
- `crawler.technical_logs`.

Laravel cria antecipadamente as partições mensais e mantém uma partição `DEFAULT`. Não existe exclusão automática, retenção ou descarte de partições no escopo inicial.

## Contrato de dispatch

1. Laravel valida o comando, aplica permissões/exclusividade e insere uma operação `queued` com plano imutável.
2. O worker usa transação e `FOR UPDATE SKIP LOCKED` para reivindicar uma operação compatível com sua capacidade.
3. O claim grava worker, lease e início; o worker renova heartbeat e progresso agregado.
4. Cancelamento muda o pedido para `cancellation_requested`; o worker verifica cooperativamente entre etapas e lotes de URLs.
5. Resultados e artefatos são gravados antes do estado terminal na mesma fronteira transacional apropriada.
6. Estados terminais são imutáveis. Retentativa cria outra operação com `retry_of_id` e preserva as mesmas entradas, salvo nova decisão explícita do operador.
7. Perda de heartbeat expira o lease e produz falha por timeout; recuperação operacional cria nova retentativa ligada à anterior.

No máximo um crawl roda por Crawl Agency, com um equivalente pendente. Pedidos equivalentes são consolidados; Crawl Agencies diferentes podem executar em paralelo.

## Fluxos da interface

### Prospecção

1. O operador escolhe uma ou várias cidades/UF e revisa a prévia de domínios conhecidos.
2. A interface cria um Grupo de Operações e uma operação filha por cidade.
3. Prospects são classificados e apresentados em revisão consolidada.
4. Reconsultas atualizam Prospects sem apagar decisões humanas; diferenças em Crawl Agencies são apenas sugeridas.
5. A promoção cria uma Crawl Agency em `onboarding` e um Plano de Onboarding ainda não executado.

### Onboarding e Perfil de Extração

1. O scraper da home sugere uma URL de amostra; o operador confirma ou edita.
2. Discovery gera um Snapshot de Discovery imutável.
3. A geração cria um Perfil de Extração Candidato versionado.
4. O Crawl de Validação usa até 20 URLs distribuídas pelo discovery, ou todas quando houver menos.
5. Elegibilidade exige 80% de registros normalizados válidos, 90% de cobertura por campo obrigatório antes do filtro e nenhuma Falha Bloqueante.
6. Um operador autorizado aprova ou rejeita. Aprovação não ativa automaticamente a Crawl Agency.
7. A Crawl Agency somente passa a `active` após aprovação humana explícita do onboarding.

Regeneração assistida pelos erros e comparação automática entre versões ficam fora do escopo inicial. Uma correção cria manualmente outro candidato.

### Crawl manual e agendado

- O plano manual permite gerar ou escolher um Discovery Snapshot da mesma Crawl Agency e usar o perfil ativo, outra versão aprovada ou iniciar a geração de um candidato.
- Um candidato precisa concluir validação e aprovação antes de um crawl de produção separado.
- Agendamentos sempre geram discovery novo e usam o perfil ativo.
- Três falhas consecutivas de produção abrem o circuito e suspendem agendamentos. Um crawl manual bem-sucedido fecha o circuito.
- Operações fixam as versões de discovery, perfil, contrato e política; nenhuma troca ocorre durante a execução.

### Qualidade e publicação

1. Um crawl técnico bem-sucedido cria um Snapshot Candidato.
2. O Portão de Qualidade aplica a versão fixada da política.
3. Aprovação publica atomicamente; reprovação cria Snapshot em Quarentena e mantém a publicação anterior.
4. Produção pode publicar automaticamente quando passa. Publicação excepcional exige Crawl Agency ativa, permissão específica, responsável, data e justificativa.
5. Falhas bloqueantes de onboarding não aceitam exceção.
6. Ativar contrato incompatível marca fontes como `revalidation_required`, suspende schedules e impede publicação sob o contrato anterior.

## API administrativa inicial

Prefixo sugerido: `/api/admin/crawler`.

- `GET /overview` e `GET /workers`.
- CRUD de `/prospects` e ações `/prospects/{id}/promote`, `/approve` e `/reject`.
- CRUD de `/crawl-agencies`, com ações `/activate`, `/pause`, `/resume` e `/archive`.
- Recursos aninhados de discovery snapshots, extraction profiles, schedules, runs e snapshots por Crawl Agency.
- `POST /operations`, `POST /operations/{id}/cancel` e `POST /operations/{id}/retry`; `GET /operations` e `GET /operation-groups/{id}`.
- `GET /crawl-runs/{id}/normalized`, `/raw` e `/rejected`, todos com paginação, filtros e ordenação no servidor.
- `POST /extraction-profiles/{id}/validate`, `/approve`, `/reject` e `/activate`.
- `POST /market-snapshots/{id}/publish-exceptionally`.
- CRUD versionado de `/market-data-contracts` e `/quality-policies`, com ações `/validate` e `/activate`.

Controllers devem delegar invariantes a Services, usar Form Requests e retornar API Resources tipados. O frontend deve definir tipos e schemas precisos; `any` não é permitido.

## Permissões

Permissões granulares sugeridas:

- `crawler.view`;
- `crawler.prospects.manage`;
- `crawler.agencies.manage`;
- `crawler.operations.execute`;
- `crawler.operations.cancel`;
- `crawler.profiles.approve`;
- `crawler.agencies.activate`;
- `crawler.snapshots.publish_exceptionally`;
- `crawler.policies.manage`;
- `crawler.schedules.manage`.

O papel Platform Admin recebe todas inicialmente. A implementação deve atualizar seeders/migrations, políticas e middleware do backend, o contrato serializado de permissões do usuário e as verificações do frontend.

## Fases de entrega

### 1. Tracer bullet operacional

- Novo schema/migrations, Crawl Agency, permissões, operation/worker protocol e worker de longa duração.
- Criar um crawl manual para uma Crawl Agency cadastrada, acompanhar por polling e consultar dados brutos, normalizados e rejeitados.
- Ainda sem publicação automática, prospecção ou agendamentos.

### 2. Configuração reproduzível

- Discovery Snapshots, Perfis de Extração versionados, Contrato de Dados de Mercado e Crawl de Validação.
- Onboarding, aprovação humana e seleção de discovery/perfil no Plano da Operação.

### 3. Qualidade e consumo

- Política de Qualidade, snapshots candidato/publicado/quarentena, Identidade do Anúncio, diff e janela de remoção.
- Alterar AI Searcher e Property Valuation para ler somente publicações vigentes.

### 4. Prospecção e lotes

- Prospecção multi-cidade, revisão, promoção, reconsulta de conhecidos e Grupos de Operações.
- Manter somente o enriquecimento de amostra pela home com fallback JavaScript do Crawl4AI.

### 5. Automação e operação

- Agendamentos, circuito, health dashboards, alertas internos, retentativas/cancelamentos em lote e editores versionados de configurações.
- Validar partições futuras e a partição `DEFAULT` em rotina operacional do Laravel.

## Verificação por fase

- Backend: testes Feature de autorização, estados, invariantes, paginação e publicação transacional; testes Unit das políticas e compatibilidade de contrato.
- Crawler: testes do claim/lease, cancelamento, idempotência, persistência, validação do perfil e falhas parciais.
- Frontend: testes de permissão, formulários, polling, tabelas e decisões humanas; build e lint sem `any`.
- Integração: Laravel cria uma operação real, o worker a reivindica, grava resultados no Postgres e a interface apresenta o mesmo estado sem acesso direto ao Python.

## Fora do escopo inicial

- Exportação de dados.
- Auditoria genérica append-only.
- E-mail, WebSocket e SSE.
- Gerenciamento de processos de worker pela interface.
- Separação de credenciais de banco por runtime.
- Retenção, exclusão automática ou descarte de partições.
- Correção manual de snapshots e regeneração assistida de perfis.
