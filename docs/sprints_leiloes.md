# Planejamento do Módulo de Leilões (Jaraguá do Sul)

Abaixo está a organização sugerida em 6 sprints para a construção do módulo de extração e exibição de imóveis de leilão. 

O fluxo técnico envolverá três partes do nosso ecossistema atual:
1. **Crawler (`crawler-machine`)**: Para varrer os sites e baixar as informações.
2. **Backend (`ai-backendd-imobiliaria`)**: Para armazenar os dados e servir a API.
3. **Frontend (`ai-front-end-imobiliaria`)**: Para exibir as listagens para o usuário final.

## Tabela Geral de Status

| SPRINT | DATA FINAL | TODO | DOING | DONE | OBS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sprint 1** | 27/08 | | | <ul><li>Mapear fontes de dados locais</li><li>Desenhar modelo de BD</li><li>Definir contrato da API</li></ul> | Foco em planejamento e arquitetura inicial |
| **Sprint 2** | 10/09 | | | <ul><li>Criar spiders em Python</li><li>Normalizar extração</li><li>Testes de scrape</li></ul> | Spiders P0 (Leiloeiro Público e CAIXA), normalizador e fixtures concluídos |
| **Sprint 3** | 24/09 | <ul><li>Criar migrations/models (Laravel)</li><li>API de Ingestão (para o crawler)</li><li>API de Listagem (para o front)</li></ul> | | | Trabalho no backend (`ai-backendd-imobiliaria`) |
| **Sprint 4** | 08/10 | <ul><li>UI da listagem de leilões</li><li>Integração Frontend x Backend</li><li>Página de Detalhes do Leilão</li></ul> | | | Foco em Next.js (`ai-front-end-imobiliaria`) |
| **Sprint 5** | 22/10 | <ul><li>Filtros avançados (data, lance)</li><li>Sistema de alertas/notificações</li><li>Job para expirar leilões antigos</li></ul> | | | Refinamentos de UX e lógicas de negócio |
| **Sprint 6** | 05/11 | <ul><li>Testes de ponta a ponta (E2E)</li><li>Revisão de consistência de dados</li><li>Deploy e documentação</li></ul> | | | Homologação final e lançamento |


---

## Detalhamento das Atividades

### Sprint 1: Discovery & Arquitetura (27/08)
- **Pesquisa de Fontes:** Levantamento inicial e critérios de aceite registrados em [leiloes-discovery-arquitetura.md](./leiloes-discovery-arquitetura.md).
- **Modelo de Dados (MER):** Definidas as projeções `auction_events`, `auction_rounds`, `auction_properties`, `auction_event_properties` e `auction_evidences`, reutilizando a linhagem `crawler.*`.
- **Desenho da Integração:** Mantido o fluxo Laravel Control Plane -> operação -> Crawler Machine -> snapshot/run -> projeção publicada; sem acesso direto ao banco nem webhook público no MVP.

### Sprint 2: Desenvolvimento do Crawler (10/09)
- **Scraping Script:** Implementar os spiders em Python no `crawler-machine`.
- **Limpeza de Dados:** Tratar endereços, normalizar valores monetários e converter datas para um formato universal (ISO).
- **Tratamento de Erros:** Implementar tentativas (*retries*) e <i>logs</i> caso o site de algum leiloeiro mude o layout.

### Sprint 3: Back-end e Armazenamento (24/09)
- **Migrations & Models:** Construir a base de dados no Laravel usando o `start.sh` e o Sail.
- **Endpoints de Ingestão:** Criar a rota autenticada (via token) onde o Crawler enviará os imóveis diariamente ou semanalmente.
- **Endpoints Públicos:** Criar a API REST com suporte a paginação para que o frontend possa consultar os leilões ativos.

### Sprint 4: Front-end (UI e Listagem) (08/10)
- **Componentes Visuais:** Criar os cards de imóveis específicos para leilão (destacando o lance inicial e cronômetro/data final).
- **Integração API:** Conectar a tela do Next.js com a API do Laravel criada na sprint anterior.
- **Página de Detalhes:** Visualização completa da oportunidade com links para o edital ou site do leiloeiro.

### Sprint 5: Refinamentos e Funcionalidades Extras (22/10)
- **Filtros Avançados:** Busca por faixa de valor, bairros e tipo de leilão (Judicial vs Extrajudicial) no Front e Back.
- **Job de Manutenção:** Criar rotina (Scheduler do Laravel) para arquivar ou deletar leilões cujas datas já passaram.
- **Sistema de Notificações (Opcional):** Usuário clica em "Avise-me de novos leilões" e nós disparamos e-mails com novos achados.

### Sprint 6: Testes, QA e Lançamento (05/11)
- **Quality Assurance:** Testar o fluxo ponta-a-ponta (Crawler bate no site -> Laravel salva -> Frontend exibe corretamente).
- **Tratamento de Limites:** Avaliar o peso do banco de dados e aplicar otimizações de cache (Redis) caso necessário.
- **Deploy:** Envio para a infraestrutura de produção.
