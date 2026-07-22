# Interface de Operações do Crawler

Documento vivo das decisões de interface para operar o Crawler Machine pela Admin Area. O vocabulário canônico vive em `crawler-machine/CONTEXT.md`; decisões arquiteturais vivem nos ADRs do sistema e do Crawler Machine.

## Acesso

- Área global, acessível somente a Platform Admins com permissões granulares de Crawler Operator.
- Permissões distintas para visualizar; gerenciar Prospects e Crawl Agencies; operar/cancelar; aprovar; publicar excepcionalmente; e alterar políticas/agendamentos.

## Navegação

- **Visão Geral**: saúde, operações ativas, falhas e quarentenas.
- **Prospecção**: criação de operações de prospecção e Revisão de Prospects.
- **Crawl Agencies**: cadastro, onboarding, saúde e agendamento.
- **Operações**: fila global, progresso, cancelamento e retentativas.
- **Qualidade**: Snapshots em Quarentena e Publicações Excepcionais.
- **Configurações**: Contrato de Dados de Mercado, Política de Qualidade e estado/testes das integrações.

Contrato de Dados de Mercado e Política de Qualidade fazem parte do escopo inicial da interface. Ambos usam o ciclo `rascunho -> validação -> ativo`; versões ativas são imutáveis, não podem ser excluídas e permanecem disponíveis para explicar operações históricas.

Na validação do contrato, mudanças aditivas e opcionais preservam os perfis existentes. Mudanças incompatíveis ou novos campos obrigatórios mostram uma prévia das Crawl Agencies afetadas antes da ativação. Depois de ativadas, essas fontes exibem `revalidation_required`, têm seus agendamentos suspensos e não podem publicar novos snapshots até revalidar o perfil. O estado administrativo e o último Snapshot Publicado permanecem intactos; runs antigos continuam consultáveis, mesmo quando não podem ser publicados.

## Detalhe da Crawl Agency

Abas: resumo, onboarding, operações, discoveries, Perfis de Extração, snapshots e agendamento.

Ao criar um crawl manual, o Plano da Operação permite:

- gerar um novo Snapshot de Discovery ou selecionar um snapshot anterior da mesma Crawl Agency;
- usar o Perfil de Extração ativo, selecionar outra versão aprovada da mesma Crawl Agency ou gerar um Perfil de Extração Candidato;
- encaminhar perfis candidatos para Crawl de Validação antes de permitir produção;
- revisar as entradas antes de confirmar e enfileirar a operação.

Durante onboarding, sugestões de URL de amostra são obtidas exclusivamente por scraping da home, com fallback de renderização JavaScript pelo Crawl4AI. A sugestão deve ser confirmada ou editada pelo Crawler Operator antes da geração do Perfil de Extração; ela nunca inicia a geração automaticamente. Google Custom Search não integra o produto.

Agendamentos sempre geram discovery novo e usam o Perfil de Extração ativo.

### Política de Discovery

Ao enfileirar um Discovery, o Crawler Operator define uma Política de Discovery exclusiva daquela Operação do Crawler e preservada no seu plano imutável.

- A interface permite selecionar uma ou mais fontes nativas do `DomainMapper` do Crawl4AI: `sitemap`, `cc`, `wayback`, `crt`, `probe`, `robots`, `feed` e `homepage`.
- O atalho **Todas as fontes nativas** seleciona essas oito fontes; Estratégias de Discovery Customizadas nunca entram automaticamente e precisam ser escolhidas explicitamente.
- As opções avançadas seguras incluem limite de URLs, inclusão de subdomínios, browser para home com JavaScript, consulta/relevância e caminhos ou subdomínios adicionais. Concorrência, limite de requisições, cache, diretórios locais e logs permanecem definidos pela plataforma.
- Estratégias Customizadas são registradas, versionadas e auditáveis pela plataforma; o Crawler Operator não cria código ou parâmetros arbitrários na interface.
- O Snapshot de Discovery preserva a Contribuição de Discovery: total de URLs por origem e as fontes/estratégias que contribuíram para cada URL. A lista de URLs pode ser filtrada pela origem.
- A primeira versão não inclui presets reutilizáveis por Crawl Agency.

## Validação de Perfil de Extração

Um Perfil de Extração Candidato deve passar por um Crawl de Validação com até 20 URLs distribuídas pelo Snapshot de Discovery selecionado, ou todas quando houver menos de 20. A revisão exibe cobertura por campo, valores brutos e normalizados e erros de extração por URL.

A recomendação técnica é ao menos 80% das URLs com registros normalizados válidos, cada campo obrigatório da versão fixada do Contrato de Dados de Mercado com 90% de cobertura antes do filtro e nenhuma Falha Crítica de Validação. Abaixo da recomendação, inclusive quando houver Falhas Críticas de Validação, um Platform Admin pode aprovar explicitamente o perfil com justificativa preservada. Essas falhas exigem revisão humana, mas não são Falhas Bloqueantes do Portão de Qualidade de produção. A recomendação nunca aprova nem ativa automaticamente o perfil, e resultados de validação nunca são publicados como dados de mercado.

## Dados de um Crawl Run

Cada Crawl Run possui a ação **Visualizar dados** com três visões somente leitura:

- **Normalizados**: MarketProperties produzidos.
- **Brutos**: payload original e ExtractionTrace por campo.
- **Rejeitados**: motivo e campos ausentes.

As três visões usam paginação, filtros e ordenação no backend. O detalhe de linha mostra payload, warnings de normalização e trace. A visão normalizada também permite filtrar a comparação com o Snapshot Publicado anterior por `novo`, `alterado`, `inalterado`, `ausente` ou `removido`. Runs falhos ou cancelados exibem Resultados Parciais claramente identificados, que não podem ser publicados.

Um anúncio apenas ausente permanece disponível por uma publicação e é removido após duas ausências consecutivas. Sinal explícito de indisponibilidade ou resposta `404`/`410` remove imediatamente. A tabela identifica o motivo e a contagem de ausências; se o anúncio reaparecer, reutiliza sua identidade e recebe uma nova versão.

Exportação de dados fica fora do escopo inicial.

## Progresso e alertas

- A interface consulta progresso por polling a cada três segundos e reduz a frequência em segundo plano.
- A timeline apresenta `queued`, discovery, perfil, crawl, filtro, normalização, qualidade e publicação.
- Etapa atual, percentual, itens processados/total, última mensagem e heartbeat são agregados; não se persiste um evento para cada URL processada.
- Alertas existem somente na interface. Não há e-mail no escopo inicial.
- Falhas repetidas da mesma operação ou Crawl Agency são agrupadas.
- A Visão Geral exibe saúde, versão, capacidade e último heartbeat dos workers. Iniciar, parar, implantar ou atualizar processos é responsabilidade da infraestrutura e não integra a interface.

## Operações em lote

- Uma ação em lote cria um Grupo de Operações, não uma execução monolítica.
- Cada Crawl Agency recebe uma Operação do Crawler independente e sujeita às mesmas regras de exclusividade e qualidade.
- O grupo agrega progresso e resultado total, parcial ou falho sem executar trabalho próprio.
- Cancelamento e retentativa podem ser aplicados somente aos membros selecionados.

Uma prospecção com várias cidades usa o mesmo modelo: cada cidade/UF recebe uma operação filha. A revisão pode ser consolidada ou filtrada por cidade/operação, e falhas são retentadas sem repetir cidades bem-sucedidas. Domínios já conhecidos como Prospect ou Crawl Agency são ignorados globalmente por padrão.

A opção avançada **Reconsultar domínios conhecidos** mostra a quantidade afetada antes da confirmação. Ela atualiza dados descobertos de Prospects sem alterar sua revisão; para Crawl Agencies, apresenta diferenças como sugestão sem sobrescrever cadastro, configuração ou estado.

## Fora do escopo inicial

- Exportação de Crawl Runs.
- Histórico genérico de auditoria append-only; decisões críticas preservam responsável, data e justificativa localmente.
- E-mail, WebSocket e SSE.
- Separação de papéis/credenciais de banco por runtime.
- Exclusão automática ou política de retenção de partições.
- Regeneração assistida por erros de validação e comparação automática entre versões de Perfil de Extração. A correção inicial cria manualmente um novo perfil candidato.
