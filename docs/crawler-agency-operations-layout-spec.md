# Spec de layout e operação da Crawl Agency

**Status:** proposta  
**Escopo:** Admin Area → módulo Crawler, detalhe de uma Crawl Agency e acompanhamento das suas Operações do Crawler.  
**Referências:** [Interface de Operações do Crawler](./crawler-operations-interface.md), [Contexto do Crawler Machine](../crawler-machine/CONTEXT.md).

## Objetivo

Fazer com que um Crawler Operator entenda, em uma leitura, quatro coisas sobre uma Crawl Agency:

1. ela está autorizada e tecnicamente apta a operar?
2. existe trabalho em andamento, falha ou bloqueio que exige ação?
3. qual é o último dado de mercado efetivamente publicado?
4. qual é a próxima ação segura?

A tela deixa de ser uma página longa de formulários equivalentes. Ela passa a distinguir o estado atual, a atividade operacional, os recursos versionados e a configuração futura da fonte.

## Problema atual

O detalhe atual renderiza todos os cartões em uma única página e usa âncoras que se parecem com abas. Onboarding, Discovery, Perfil de Extração, execução de crawl, qualidade, snapshots e agendamento recebem o mesmo peso visual.

Isso produz três problemas:

- a pessoa operadora precisa percorrer a página para descobrir se há uma operação em andamento, um bloqueio ou dados publicados;
- um formulário de ação, uma configuração técnica e uma evidência histórica aparecem como o mesmo tipo de conteúdo;
- a fila global contém progresso e controle de operações, enquanto o detalhe da Crawl Agency não apresenta o contexto operacional daquela fonte.

## Limites

### Dentro do escopo

- Layout, navegação, feedback e estados vazios do detalhe de uma Crawl Agency.
- Atividade e ações das Operações do Crawler filtradas para a Crawl Agency aberta.
- Discoveries, Perfis de Extração, Crawls de produção, qualidade/publicação e agendamento dessa fonte.
- Feedback de sucesso, progresso e erro ao iniciar, cancelar, retentar ou decidir operações dentro do módulo Crawler.
- Estados de interação: cursor, hover, foco visível, estado pressionado e indisponibilidade.

### Fora do escopo

- Alterar o pipeline, critérios de qualidade, permissões, workers ou o protocolo de dispatch.
- Alterar a navegação ou os componentes compartilhados de módulos não-Crawler.
- Criar notificações externas, WebSocket ou SSE; o polling existente continua sendo a forma de atualização.
- Redesenhar a Visão Geral global, Prospecção, Políticas ou Contrato de Dados de Mercado.

## Princípios de interface

1. **Estado antes de configuração.** A primeira área da tela mostra risco, operação atual, dado vigente e próxima ação; formulários entram depois.
2. **Uma responsabilidade por superfície.** Cada recurso explica o que produz, quais são suas entradas e quais decisões permite.
3. **Estados independentes não podem virar um único badge.** Estado administrativo, Saúde, prontidão técnica, estado da operação e publicação são conceitos distintos.
4. **Ação deve parecer ação.** Nada que execute, abra ou altere algo pode depender de aparência neutra ou de um cursor de texto.
5. **Não esconder a linhagem.** Uma pessoa deve conseguir seguir `operação → discovery → perfil → crawl run → qualidade/publicação`.
6. **A fila global continua global.** Ela é o local para workers, lote, comparação entre fontes e ações transversais; o detalhe mostra apenas a atividade contextual da fonte.

## Arquitetura de informação

Substituir a navegação por âncoras por abas reais ou rotas aninhadas. A recomendação de rota é:

```text
/admin/crawler/agencies/:agencyId                 Visão geral
/admin/crawler/agencies/:agencyId/discoveries     Discoveries
/admin/crawler/agencies/:agencyId/profiles        Perfis de Extração
/admin/crawler/agencies/:agencyId/crawls          Crawls e qualidade
/admin/crawler/agencies/:agencyId/schedule        Agendamento e segurança
/admin/crawler/agencies/:agencyId/settings        Configuração administrativa
```

Uma URL de detalhe de recurso deve preservar o vínculo com a Crawl Agency:

```text
/admin/crawler/agencies/:agencyId/discoveries/:snapshotId
/admin/crawler/agencies/:agencyId/profiles/:profileId
/admin/crawler/agencies/:agencyId/crawls/:runId
```

O detalhe de uma operação pode continuar em rota global, mas toda origem contextual deve oferecer `Abrir na fila global`, já filtrada pela Crawl Agency.

### Responsabilidades das áreas

| Área | Responde | Contém | Não contém |
| --- | --- | --- | --- |
| Visão geral | O que requer ação agora? | estado, alertas, operação atual, dados publicados e atividade recente | listas completas ou formulários extensos |
| Discoveries | Quais URLs foram descobertas? | criação, snapshots imutáveis, contagem, origem e inspeção de URLs | geração ou validação de perfil |
| Perfis de Extração | Qual configuração orienta a extração? | versões, schemas, estratégias, campos, validações e decisões | dados de produção publicados |
| Crawls e qualidade | O que a produção gerou e pode publicar? | execução, resultado técnico, qualidade, candidato/publicado/quarentena | configuração de schema |
| Agendamento e segurança | Quando a fonte volta a rodar e está protegida? | frequência, origem do preset, próxima execução, circuito e suspensão | estado administrativo |
| Configuração | Quem é a fonte e ela está autorizada? | URL base, domínio, lifecycle e ações administrativas autorizadas | operações cotidianas |

## Layout da Visão geral

### Cabeçalho

```text
Crawl Agencies / SMART
SMART · imsmart.com.br
[Onboarding] [Saúde: desconhecida] [Prontidão: aguardando validação]
                                                    [Ações administrativas]
```

- Mostrar nome e domínio; ID interno e slug ficam em Configuração.
- Exibir separadamente:
  - **Estado administrativo:** `onboarding`, `active`, `paused` ou `archived`.
  - **Saúde:** `unknown`, `healthy`, `degraded` ou `unavailable`, com explicação legível.
  - **Prontidão técnica:** sem discovery, perfil candidato, aguardando aprovação, revalidação necessária, apta para produção ou sem snapshot publicado.
- A ação primária é contextual e única: `Enfileirar Discovery`, `Gerar Perfil Candidato`, `Rodar Crawl de Validação`, `Aprovar Perfil`, `Ativar Crawl Agency`, `Rodar Crawl Manual` ou `Revisar Quarentena`.

### Faixa de próxima ação

Logo após o cabeçalho, exibir somente o bloqueio ou a oportunidade mais relevante:

```text
Próxima ação recomendada
Perfil v2 possui Discovery #18, mas ainda não foi validado.
[Rodar Crawl de Validação] [Ver perfil]
```

Para uma agência ativa, esta área pode informar dados desatualizados, circuito aberto, uma quarentena pendente ou a próxima execução programada. Não mostrar uma faixa quando não houver ação humana recomendada.

### Cartões de estado

Usar três cartões, com a mesma altura visual, abaixo da faixa:

| Cartão | Conteúdo obrigatório |
| --- | --- |
| Operação atual | tipo e ID, estado, etapa, percentual, processados/total, mensagem, heartbeat, ação de cancelar quando autorizada e link para a fila global filtrada |
| Dados vigentes | Snapshot Publicado ou estado vazio, data de publicação, idade, total normalizado e link para o crawl que o produziu |
| Agendamento | frequência efetiva, padrão ou override, próxima execução, estado do circuito e motivo de suspensão |

Quando não houver operação, o cartão deve dizer `Nenhuma operação em andamento` e informar a capacidade, por exemplo `Crawl livre para iniciar`. Quando houver operação equivalente pendente ou em andamento, explicar a Exclusividade de Crawl em vez de deixar o botão falhar silenciosamente.

### Alertas e atividade recente

- Exibir no máximo cinco alertas acionáveis: revalidação necessária, perfil pendente, falha recorrente, circuito aberto, snapshot em quarentena, agendamento suspenso e dados publicados antigos.
- Exibir de cinco a dez eventos cronológicos, legíveis e vinculáveis: discovery iniciado/concluído, perfil criado/validado/aprovado, crawl iniciado/falhou, snapshot publicado/quarentenado e decisão humana.
- Cada item deve indicar tempo, resultado e próximo destino. Exemplo: `09:11 · Snapshot #38 em quarentena · Revisar qualidade`.

## Fluxos por estado

### Onboarding e revalidação

Apresentar uma trilha de cinco etapas somente quando a Crawl Agency estiver em `onboarding` ou `revalidation_required`:

```text
1 Discovery → 2 Perfil candidato → 3 Validação → 4 Aprovação → 5 Ativação
```

- Apenas a etapa atual abre por padrão e contém o formulário da ação seguinte.
- Etapas futuras mostram por que estão bloqueadas.
- Artefatos prontos permanecem acessíveis por links: `Ver Discovery`, `Ver configuração do perfil`, `Inspecionar evidência de validação`.
- Resultados do Crawl de Validação não são apresentados como dados vigentes ou resultado de produção.

### Operação cotidiana de agência ativa

Uma agência `active` não deve manter a trilha de onboarding no centro da tela. Mostrar uma faixa compacta de configuração válida: Perfil de Extração Ativo, versão do Contrato de Dados de Mercado e última validação.

O foco passa a ser:

1. executar ou acompanhar um crawl;
2. revisar qualidade e publicação;
3. ajustar agendamento e resolver circuito/alertas.

## Especificação de interação e aparência clicável

Aplica-se somente aos componentes do módulo Crawler.

### Semântica

- Ações que alteram estado usam o elemento nativo `button` ou o componente compartilhado `Button`.
- Navegação usa `Link`/`a`; não usar `div`, `Card` ou `span` com `onClick` como substituto.
- Uma linha ou cartão inteiro só pode ser clicável quando sua única ação for abrir o detalhe. Caso possua mais de uma ação, usar um link explícito e botões independentes.
- Todo alvo interativo possui nome acessível, foco por teclado, `focus-visible` perceptível e ordem de tabulação previsível.

### Cursor e estados visuais

| Elemento | Repouso | Hover/foco | Cursor |
| --- | --- | --- | --- |
| Botão habilitado | variante visual do botão | contraste/borda elevada e estado pressionado | `pointer` |
| Botão indisponível | opacidade reduzida, sem sugerir ação | sem mudança acionável | `not-allowed` |
| Link de detalhe | texto ou cartão com indicador de navegação | sublinhado/elevação e foco visível | `pointer` |
| Card clicável | borda neutra + área de clique identificável | borda primária, fundo sutil ou sombra | `pointer` |
| Aba | estado selecionado inequívoco | contraste e foco visível | `pointer` |
| `summary` expansível | rótulo + ícone chevron | fundo sutil e chevron animado | `pointer` |

Não aplicar `cursor-pointer` a texto estático, cartões informativos ou elementos desabilitados. O cursor deve revelar uma ação real, não decorar a interface.

### Hierarquia de ações

- **Executar:** Discovery, gerar perfil, validar perfil, rodar crawl manual.
- **Decidir:** aprovar/rejeitar perfil, ativar agência, publicação excepcional.
- **Controlar:** cancelar e retentar operação.
- **Investigar:** ver operação, perfil, discovery, crawl, qualidade e dados.
- **Configurar:** salvar agendamento e alterar dados administrativos.

Em cada superfície, existe no máximo uma ação primária. Ações destrutivas ou de decisão crítica usam variante distinta e confirmam apenas quando a ação não puder ser desfeita.

## Feedback de operações

### Estado pendente

Ao enviar uma ação assíncrona:

1. desabilitar apenas o controle que disparou a requisição;
2. trocar o rótulo para uma ação em andamento, como `Enfileirando Discovery…`, `Cancelando…` ou `Aprovando Perfil…`;
3. preservar os campos preenchidos até a resposta; e
4. evitar duplicação de requests por clique repetido.

### Sucesso

Após a API aceitar uma Operação do Crawler ou decisão:

- exibir toast de sucesso em linguagem humana e com o identificador relevante: `Discovery enfileirado como operação #124`;
- oferecer ação de destino quando houver rota: `Acompanhar operação`, `Ver Perfil v2` ou `Ver Snapshot`;
- atualizar imediatamente o cartão de Operação atual, a atividade recente e a lista do recurso, sem esperar a próxima navegação;
- iniciar ou manter polling enquanto existir operação ativa dessa Crawl Agency.

Sucesso significa que o comando foi aceito ou a decisão foi persistida. Não comunicar que o discovery/crawl foi concluído antes de a Operação do Crawler atingir um estado terminal bem-sucedido.

### Erro

Quando uma ação falhar, a interface deve:

- exibir toast de erro com mensagem compreensível e específica, preferindo a mensagem validada pelo backend;
- manter o formulário e suas escolhas para correção ou nova tentativa;
- reabilitar o controle após a resposta;
- indicar o próximo passo quando conhecido: `Já existe um crawl equivalente em execução. Acompanhar operação #123` ou `O perfil precisa passar pela validação antes de produção`;
- mostrar o erro próximo ao controle quando impedir uma continuação de fluxo, além do toast;
- nunca ocultar uma falha de polling ou converter uma operação terminal `failed` em mensagem genérica de sucesso.

Mensagens técnicas cruas, stack traces e payloads HTTP não aparecem no toast. Um link `Ver detalhes técnicos` pode levar ao detalhe da operação, onde o erro preservado é exibido para pessoas autorizadas.

### Estados terminais

| Estado | Comunicação na interface |
| --- | --- |
| `succeeded` | confirmação de conclusão, artefato resultante e próximo passo apropriado |
| `failed` | alerta persistente, motivo resumido e ação `Retentar` quando permitida |
| `cancelled` | confirmação neutra de cancelamento e resultados parciais, se existirem |
| `cancellation_requested` | estado transitório claro; não apresentar como cancelado até o worker confirmar |
| `queued` / `running` | progresso, etapa, mensagem e heartbeat atualizados por polling |

## Dados necessários para o layout

A Visão geral precisa de um contrato agregado por Crawl Agency. O frontend não deve inferir estado a partir de listas incompletas. O contrato precisa fornecer:

- estado administrativo, Saúde e `revalidation_required`;
- próxima ação recomendada e motivo de bloqueio, quando aplicável;
- Operação do Crawler ativa ou pendente relevante;
- Perfil de Extração Ativo/candidato mais recente e última validação;
- Snapshot Publicado, snapshot em quarentena mais recente e métricas resumidas;
- agendamento efetivo, próxima execução e estado do circuito;
- alertas e atividade recente vinculados a recursos.

O backend permanece como fonte de verdade para permissões, exclusividade de crawl, validade de transições e mensagens de erro. O frontend usa esse contrato para exibir, não para decidir regras de domínio.

## Critérios de aceite

1. No detalhe de uma Crawl Agency, uma pessoa operadora identifica estado administrativo, Saúde, prontidão técnica, operação atual e Snapshot Publicado sem rolar a página.
2. A tela explica a próxima ação e o motivo quando a agência não está apta para produção ou publicação.
3. Discoveries, Perfis, Crawls/qualidade, Agendamento e Configuração possuem superfícies separadas e URLs compartilháveis.
4. A fila global permanece a fonte de ações transversais; o detalhe mostra apenas a atividade da agência e links de saída contextualizados.
5. Todo botão habilitado, link, aba, `summary` expansível e card inteiramente clicável usa cursor `pointer`, foco visível e feedback de hover. Elementos estáticos não fingem ser clicáveis.
6. Cada ação assíncrona mostra estado pendente, impede submissão duplicada e comunica sucesso somente após a API aceitar o comando.
7. Cada falha de operação ou decisão mostra mensagem humana, preserva a intenção preenchida e oferece diagnóstico ou próxima ação quando possível.
8. Operações ativas atualizam progresso, etapa, percentual, itens processados/total e heartbeat por polling; estados terminais são comunicados corretamente.
9. A validação de perfil permanece distinta de dados de produção, e a publicação permanece distinta do sucesso técnico de um crawl.
10. A implementação mantém permissões granulares, navegação por teclado e comportamento responsivo: o trilho de contexto fica abaixo do conteúdo principal em telas menores.

## Fatiamento recomendado

1. Criar o contrato/consulta de resumo por Crawl Agency e compor o cabeçalho, próxima ação, cartões e atividade recente.
2. Criar a área local de atividade com polling, links à fila global e feedback padronizado de operações.
3. Substituir âncoras por abas/rotas para Discoveries, Perfis, Crawls, Agendamento e Configuração.
4. Transformar o onboarding/revalidação em trilha guiada e o estado ativo em resumo de configuração válida.
5. Aplicar a matriz de interações e revisar acessibilidade, estados vazios, sucesso e erro em todos os controles do módulo.
