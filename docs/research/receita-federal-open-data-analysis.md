# Dados abertos da Receita Federal: oportunidades para o IA-Imob

Pesquisa realizada em **1º de agosto de 2026**, a partir do compartilhamento oficial indicado e de documentação primária da Receita Federal, Gov.br, Dados.gov.br, Planalto e ANPD.

## Resumo executivo

A recomendação é **não importar indiscriminadamente todo o repositório da Receita**. O catálogo expõe cerca de **346,85 GB**, mistura cadastros, dados tributários e obrigações acessórias e possui formatos e cadências diferentes. O maior valor para o IA-Imob está concentrado em três bases:

1. **CNPJ — prioridade imediata.** Deve sustentar a identidade jurídica de `Agency`, o billing no Asaas, o enriquecimento de `Prospect` e `Crawl Agency` e um índice de cobertura do mercado imobiliário por município.
2. **CNO — nova capacidade de inteligência de obras.** Pode revelar obras residenciais, incorporadores/construtores pessoa jurídica, localização, área, destinação e situação cadastral. Não é inventário de imóveis e não deve entrar em `Property` ou `MarketProperty`.
3. **CAFIR — somente para uma futura vertical rural.** Pode apoiar consulta cadastral de imóveis rurais, mas está fora do escopo atual de Avaliação de Mercado, explicitamente limitado à Venda Residencial Urbana.

O primeiro trabalho deve ser um **fundamento de identidade jurídica compatível com o CNPJ alfanumérico**. A Receita colocou o primeiro CNPJ alfanumérico em produção em 31/07/2026, um dia antes desta análise. Todo CNPJ precisa ser armazenado como texto, preservando zeros e aceitando letras nas 12 primeiras posições; os dois dígitos verificadores continuam numéricos. Os CNPJs numéricos existentes permanecem válidos. [Fonte oficial: CNPJ Alfanumérico](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico).

Há duas lacunas concretas no código atual que tornam essa prioridade urgente:

- o billing envia `creci` — ou o placeholder `00000000000` — como `cpfCnpj` ao Asaas em [`SubscriptionService.php`](../../ai-backendd-imobiliaria/app/Services/SubscriptionService.php#L34);
- o cadastro valida `agency.phone`, `agency.email` e `agency.document` em [`RegisterAgencyRequest.php`](../../ai-backendd-imobiliaria/app/Http/Requests/RegisterAgencyRequest.php#L17), mas o controller persiste apenas nome, slug e status em [`AdminAgencyController.php`](../../ai-backendd-imobiliaria/app/Http/Controllers/Api/AdminAgencyController.php#L82), e o model `Agency` não possui esses campos em [`Agency.php`](../../ai-backendd-imobiliaria/app/Models/Agency.php#L16).

Em outras palavras: o sistema já pede parte da identidade da Agency, mas a descarta, e depois usa um registro profissional no lugar do documento do pagador.

## 1. O que está disponível no compartilhamento

O [diretório oficial `/Dados`](https://arquivos.receitafederal.gov.br/index.php/s/gn672Ad4CF8N6TK?dir=/Dados) indicava **346.852.486.123 bytes** na data da consulta.

| Família / conjunto | Conteúdo observado | Volume indicado | Valor para o IA-Imob |
|---|---|---:|---|
| CNPJ | Empresas, estabelecimentos, sócios, Simples/MEI e domínios | 326,96 GB de histórico; snapshot atual com 7,64 GB | **Muito alto** |
| CNO | Obras, CNAEs, áreas e vínculos/responsáveis | 324,23 MB | **Alto**, como novo contexto |
| CAFIR | Imóveis rurais particionados por UF/competência | 17,73 GB; competência atual com 2,545 GB | **Condicional**, vertical rural |
| SISEN | Empresas habilitadas em benefícios fiscais | 10,63 MB | Baixo |
| Créditos Ativos | Saldos agregados por situação, tipo, CNAE, UF e tributo | 73,72 MB | Baixo; apenas macroestatística |
| Pagamentos TDA | Pagamentos de ITR com TDA, agregados por exercício/região fiscal | 14,8 KB | Muito baixo |
| Parcelamentos | Parcelamentos ativos por modalidade, incluindo CNPJ/nome em arquivos de PJ | 613,78 MB | Sensível; não priorizar |
| DIRBI | Benefícios/renúncias declarados por CNPJ, regime, tributo e período | 483,65 MB | Baixo |
| DUIMP | Renúncias tributárias de importação por CNPJ | 69,63 MB | Muito baixo |
| ECF | Regime tributário e renúncias IRPJ/CSLL por CNPJ | 587,51 MB | Baixo |
| EFD Contribuições | Receita desonerada de PIS/Cofins | 3,03 MB | Muito baixo |

### Observações operacionais do catálogo

- O diretório CNPJ contém **39 fotografias mensais**, de `2023-05` a `2026-07`.
- O `cnpj.tar.gz` da raiz tem 63,95 GB, mas foi modificado em janeiro de 2026 e está defasado. Não deve ser interpretado como “última versão”.
- O snapshot [CNPJ `2026-07`](https://arquivos.receitafederal.gov.br/index.php/s/gn672Ad4CF8N6TK?dir=/Dados/Cadastros/CNPJ/2026-07) foi publicado em 12/07/2026, antes do primeiro CNPJ alfanumérico. O primeiro arquivo mensal pós-migração ainda precisará de uma validação específica de contrato.
- O maior shard atual, `Estabelecimentos0.zip`, supera 2 GB. O pipeline não pode assumir limites de arquivo de 2 GB.
- O caminho Apache antigo encontrado em muitos exemplos da internet retornava `404`. Uma integração nova deve descobrir os arquivos no compartilhamento/WebDAV atual, sem fixar URLs antigas.
- Os metadados do portal nem sempre acompanham o repositório operacional. A competência, `Last-Modified`, tamanho, ETag e hash dos arquivos devem ser registrados por importação.

## 2. CNPJ: a base de maior valor

O [leiaute oficial dos Dados Abertos do CNPJ](https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf) define cinco grupos relacionáveis:

| Grupo | Chave | Campos úteis |
|---|---|---|
| Empresas | `cnpj_basico` | razão social, natureza jurídica, qualificação do responsável, capital social, porte e ente federativo responsável |
| Estabelecimentos | `cnpj_basico + cnpj_ordem + cnpj_dv` | matriz/filial, nome fantasia, situação/data/motivo, abertura, CNAEs, endereço, telefone, e-mail e situação especial |
| Simples | `cnpj_basico` | opção/exclusão do Simples e MEI, com datas |
| Sócios | `cnpj_basico` | tipo, nome/razão social, qualificação, entrada, país, representante e faixa etária |
| Domínios | código | CNAEs, municípios, naturezas, qualificações, países e motivos |

Os arquivos usam `;`, não possuem cabeçalho, trazem campos entre aspas, usam encoding legado compatível com ISO-8859-1/Windows-1252 e guardam CNAEs secundários separados por vírgula dentro de uma coluna. Isso exige parsers versionados por dataset, não um carregador “CSV genérico”.

### 2.1 Perfil jurídico da Agency e billing

Incluir no cadastro da Agency:

- CNPJ canônico, sem pontuação e em maiúsculas;
- razão social e nome fantasia;
- matriz/filial;
- situação cadastral, motivo e datas;
- natureza jurídica, porte, capital social e data de início;
- CNAE principal e secundários;
- endereço, telefone e e-mail declarados no CNPJ;
- opção pelo Simples/MEI e datas;
- competência da fonte, data da sincronização e estado `confirmado`, `divergente` ou `desatualizado`.

Os valores informados pela Agency e os valores encontrados na Receita devem ser mantidos separadamente. Uma mudança oficial gera uma sugestão ou alerta; não deve sobrescrever automaticamente o contato público, o branding ou o endereço operacional.

Benefícios imediatos:

- preencher o cadastro a partir do CNPJ e reduzir digitação;
- usar o documento correto no Asaas e testar a integração com CNPJ numérico e alfanumérico;
- evitar duplicidade de pagador com CNPJ + `externalReference`;
- alertar Platform Admins quando a situação cadastral deixar de ser ativa;
- mostrar divergências entre cadastro declarado e fotografia oficial sem bloquear automaticamente a Agency.

“Situação ativa” no CNPJ significa situação cadastral; não prova regularidade fiscal, licença CRECI, saúde financeira ou legitimidade do domínio web.

### 2.2 Prospecção e revisão de Crawl Agencies

O fluxo atual já armazena em `Prospect` nome, cidade/UF, telefone, endereço, Google Place ID, domínio e metadados em [`Prospect.php`](../../ai-backendd-imobiliaria/app/Models/Crawler/Prospect.php#L13). A promoção exige revisão humana e site em [`ProspectingService.php`](../../ai-backendd-imobiliaria/app/Services/Crawler/ProspectingService.php#L90). A Receita deve enriquecer esse fluxo, não substituir sua revisão.

Usos recomendados:

1. Extrair um CNPJ do rodapé, página de contato ou JSON-LD do site da candidata.
2. Se houver CNPJ exato, consultar a fotografia curada da Receita.
3. Sem CNPJ exato, gerar candidatos de correspondência por nome, telefone, CEP/endereço, cidade e evidências do site.
4. Exibir método, evidências e confiança da correspondência ao Crawler Operator.
5. Só vincular o CNPJ depois de confirmação humana.

Os CNAEs oficiais mais úteis, confirmados no `Cnaes.zip` da competência 2026-07, são:

- `6821801` — Corretagem na compra e venda e avaliação de imóveis;
- `6821802` — Corretagem no aluguel de imóveis;
- `6822600` — Gestão e administração da propriedade imobiliária.

Os códigos `4110700` (incorporação), `6810201` (compra e venda própria), `6810202` (aluguel próprio) e `6810203` (loteamento próprio) devem formar outro segmento — incorporadoras e proprietárias — e não ser tratados automaticamente como imobiliárias.

O CNPJ não publica website. Telefone, e-mail e endereço ajudam a relacionar a entidade oficial com Google Places e o site, mas podem pertencer a contador ou terceiro. Domínio de e-mail gratuito nunca deve ser usado como prova de domínio empresarial.

### 2.3 Cobertura de mercado para o Crawler

Uma visão agregada por cidade/UF pode comparar:

- estabelecimentos ativos nos CNAEs imobiliários;
- Prospects encontrados no Google Places;
- Prospects revisados;
- Crawl Agencies ativas;
- Crawl Agencies com Snapshot Publicado saudável.

Isso cria um indicador de “cobertura de fontes” e orienta quais cidades prospectar primeiro. Também permite alertar sobre novas aberturas e baixas entre fotografias mensais. Não deve ser chamado de participação de mercado: muitas empresas ativas não têm site ou inventário público.

### 2.4 Clientes e proprietários pessoa jurídica

Hoje `Property.owner_id` referencia `users`, embora a própria migration registre que o proprietário deveria estar em uma tabela de clientes: [`create_properties_table.php`](../../ai-backendd-imobiliaria/database/migrations/2026_03_01_224322_create_properties_table.php#L61). Isso mistura a pessoa que acessa o sistema com a parte que possui ou contrata um imóvel.

Antes de enriquecer proprietários com a Receita, criar uma entidade Agency-scoped de **Cliente/Parte**, separada de `User`, que possa representar pessoa física ou jurídica. Para pessoa jurídica, o CNPJ pode preencher razão social, situação, endereço e CNAEs. Esse modelo também pode representar locadores, locatários, incorporadores e fornecedores sem conceder login.

Não usar os dados de sócios para “provar” que um usuário representa uma empresa: CPFs são mascarados, nomes têm homônimos e a fotografia não substitui procuração ou documento societário.

## 3. CNO: inteligência de obras, não inventário

O [Cadastro Nacional de Obras](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno) armazena obras de construção civil e seus responsáveis. O ZIP observado em 01/08/2026 tinha 324,18 MB e havia sido atualizado no mesmo dia; respostas oficiais no catálogo informam atualização diária.

O dicionário oficial descreve:

- número CNO e CNO vinculado;
- país, município/TOM, CEP e endereço;
- datas de início da obra, início da responsabilidade, registro e situação;
- situação `nula`, `ativa`, `suspensa`, `paralisada` ou `encerrada`;
- NI do responsável apenas quando pessoa jurídica;
- qualificação: proprietário, dono da obra, incorporador, construtora, consórcio etc.;
- CNAEs vinculados;
- áreas com categoria (obra nova, acréscimo, reforma, demolição, existente), destinação, tipo construtivo e metragem.

### Produto possível

Criar um contexto interno de **Inteligência de Obras** com:

- mapa/lista de novas obras por território atendido;
- filtros por data de início, situação, categoria, destinação e área;
- identificação de incorporador/construtora PJ por join com CNPJ;
- alertas de novas obras residenciais unifamiliares e multifamiliares;
- fila de oportunidades de captação/parcerias, separada do conceito `Lead`, que hoje significa interesse enviado por um Final Client;
- séries agregadas de área iniciada/encerrada por município como sinal de oferta futura.

### Limitações obrigatórias na interface

- CNO não informa preço, número de unidades nem estágio físico (fundação, acabamento etc.).
- A situação cadastral não equivale ao andamento real da obra.
- Quando o responsável é pessoa física, o identificador é omitido por LGPD.
- “Nome” é nome da obra, não nome do proprietário.
- Endereço não contém coordenadas; geocodificação é inferência e precisa expor confiança.

Por isso, CNO não deve participar diretamente da Amostra de Avaliação nem virar `Property`/`MarketProperty`. Mais tarde, tendências agregadas podem ser testadas como contexto de oferta, nunca como Imóvel Comparável.

## 4. CAFIR: oportunidade rural condicionada a uma decisão de produto

O [CAFIR](https://dados.gov.br/dados/conjuntos-dados/cadastro-de-imoveis-rurais---cafir) é o cadastro fiscal de imóveis rurais. O catálogo o descreve como base de imóveis, titulares, condôminos e compossuidores e informa licença CC Attribution. A distribuição atual é particionada por competência e UF; a competência `D60701` totalizava cerca de 2,545 GB.

O arquivo atual chamado `.csv` é, na prática, um layout posicional sem delimitadores. A amostra observada contém identificador CIB/NIRF, área, código Incra quando existente, denominação, situação, localização, município/UF, CEP e outros indicadores cadastrais. O carregador precisa aplicar as posições do leiaute, preservar identificadores como texto e validar a competência.

Usos plausíveis em uma futura vertical rural:

- consultar CIB, denominação, município, área e situação;
- verificar divergência entre área/localização declarada no CRM e o cadastro fiscal;
- segmentar o estoque rural por município e faixa de hectares;
- apontar pendências cadastrais como informação documental, sem concluir domínio ou propriedade.

O contexto de Avaliação de Mercado atual exclui expressamente avaliação rural em [`docs/contexts/valuation/CONTEXT.md`](../contexts/valuation/CONTEXT.md#venda-residencial-urbana-urban-residential-sale). CAFIR deve permanecer fora dele até existir uma decisão de produto, contrato de dados e metodologia próprios para imóveis rurais.

CAFIR não é registro de imóveis/cartório, não traz polígono geoespacial e não deve ser apresentado como prova de propriedade ou de limites.

## 5. Bases que não devem ser priorizadas

### Créditos Ativos

O dicionário oficial mostra valores **agregados** por mês, situação, PF/PJ, seção CNAE, natureza jurídica, UF e grupo de tributo. Não identifica uma empresa específica. Pode sustentar pesquisa macroeconômica, mas não uma verificação cadastral ou de risco de Agency.

### Parcelamentos

Os arquivos de PJ podem identificar CNPJ, nome, município, CNAE, data, valor parcelado, quantidade de parcelas e saldo. Mesmo públicos, são dados econômicos de alto impacto reputacional. Além disso, possuir parcelamento ativo não significa inadimplência — pode indicar exatamente a regularização do débito.

Não incluir em score, bloqueio, promoção automática de Prospect ou desativação de Agency. Se no futuro houver uma necessidade de due diligence validada juridicamente, exibir o fato bruto, competência, explicação e revisão humana em área restrita.

### SISEN, DIRBI, DUIMP, ECF e EFD

Essas bases detalham benefícios, regimes, renúncias e operações tributárias. Embora alguns arquivos tenham CNPJ, o ganho atual para CRM, publicação, crawler e avaliação é pequeno diante do custo de governança e do risco de criar perfis econômicos excessivos. O Simples/MEI já vem no CNPJ e é suficiente para o primeiro perfil jurídico.

### Pagamentos TDA

É uma série agregada por exercício e região fiscal; não apoia um caso operacional do produto atual.

## 6. Arquitetura recomendada

Criar um novo contexto de **Registro Público/Inteligência Cadastral**, separado do Crawler Machine. O Crawler Machine extrai anúncios de sites e produz `MarketProperty`; a ingestão da Receita processa fotografias de registros públicos com cadências e contratos próprios.

Fluxo sugerido:

```text
RFB/WebDAV
  -> descoberta da competência e manifesto de arquivos
  -> download temporário + hash + validação de tamanho
  -> staging por dataset/competência
  -> parser versionado + validações/contagens
  -> diff contra a visão vigente
  -> publicação atômica da visão curada
  -> Agency | Cliente/Parte | Prospect/Crawl Agency | Inteligência de Obras
```

### 6.1 Não copiar os 346,85 GB para o Postgres principal

Estratégia seletiva:

- para cadastro/billing, manter uma **watchlist** de CNPJs já relacionados ao produto e extrair seus registros a cada mês;
- para prospecção, reter apenas estabelecimentos ativos nos CNAEs/territórios relevantes;
- carregar Empresa, Simples e, se necessário, Sócios apenas para os `cnpj_basico` selecionados;
- processar CNO em staging diário e publicar apenas linhas novas/alteradas, com histórico de mudanças;
- processar CAFIR somente para UFs atendidas e apenas após decisão de produto rural;
- não duplicar todas as fotografias históricas brutas; preservar manifesto, hash, URL e competência para reprodutibilidade.

O ADR 0012 obriga artefatos gerenciados do Crawler a permanecerem no Postgres, mas a nova ingestão cadastral é outro contexto. Sua política de raw/staging/retention deve ser decidida separadamente, em vez de expandir automaticamente essa obrigação para centenas de gigabytes.

### 6.2 Modelo mínimo de serving

Entidades sugeridas:

- `registry_imports`: dataset, competência, fonte, ETag, tamanho, hash, status, contagens e erros;
- `legal_entities`: CNPJ básico, razão social, natureza, porte, capital e Simples/MEI;
- `legal_establishments`: CNPJ completo, matriz/filial, fantasia, situação, abertura, CNAEs, endereço e contato;
- `registry_matches`: tipo/id do alvo, estabelecimento, método, confiança, evidências e revisão humana;
- `registry_changes`: campos alterados, valor anterior/novo e competências;
- `construction_sites`, `construction_areas`, `construction_responsibilities` e `construction_cnaes` para CNO.

As associações com `Agency`, `Client/Party`, `Prospect` e `Crawl Agency` devem apontar para o estabelecimento oficial, não duplicar todos os campos sem proveniência.

### 6.3 Requisitos de confiabilidade

- importação idempotente por dataset + competência + hash;
- suporte a ZIP64 e arquivos acima de 2 GB;
- identificadores e códigos sempre como texto;
- testes com CNPJ numérico e alfanumérico;
- detecção/conversão explícita de encoding;
- dicionários de município/CNAE/natureza versionados junto da fotografia;
- quarentena em mudança de layout, queda anormal de linhas ou arquivo ausente;
- publicação atômica: falha de uma carga nunca substitui a última visão válida;
- painel administrativo de frescor, competência, contagens, rejeições e última falha;
- município TOM/RFB não deve ser presumido como código IBGE; criar uma dimensão geográfica e uma correspondência validada.

## 7. Privacidade, LGPD e governança

A [Nota Técnica RFB/COCAD nº 47/2024](https://www.gov.br/receitafederal/dados/nota_cocad_no_47_2024.pdf) classifica os dados cadastrais publicados como públicos, mascara CPFs de sócios/representantes e alerta que o cruzamento com informações econômicas ou pessoais pode expor vida privada e intimidade. A própria Receita pede cautela e zelo.

Dados públicos não significam uso irrestrito de dados pessoais. A [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), art. 7º, §§ 3º e 7º, exige finalidade, boa-fé, interesse público, propósito legítimo/específico e preservação dos direitos do titular. A [ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-orientativo-sobre-legitimo-interesse) recomenda teste de finalidade, necessidade, balanceamento e salvaguardas para legítimo interesse.

Guardrails:

- definir base legal e finalidade por caso de uso antes da carga;
- coletar somente os campos necessários ao caso;
- nunca tentar reidentificar CPF mascarado;
- não criar score de crédito, fraude ou caráter a partir desses dados;
- restringir QSA, contatos e dados econômicos a permissões internas e auditar acessos;
- não expor automaticamente endereço cadastral, sócios, telefones ou e-mails no White-Label Site;
- manter atribuição à Receita, competência, URL e data de coleta;
- oferecer correção/contestação de correspondências e revisão humana de decisões;
- documentar retenção e descarte;
- realizar revisão jurídica/LGPD antes de usar Parcelamentos, QSA ou qualquer decisão de efeito adverso.

## 8. Roadmap recomendado

### P0 — identidade jurídica e compatibilidade alfanumérica

1. Definir o modelo de identidade jurídica da Agency e a relação entre Agency, estabelecimento e pagador.
2. Persistir os campos já solicitados no cadastro; adicionar CNPJ, razão social e proveniência.
3. Criar normalizador/validador único de CPF/CNPJ, com CNPJ numérico + alfanumérico.
4. Remover o uso de CRECI/placeholder no `cpfCnpj` do Asaas.
5. Criar testes de contrato do Asaas com um CNPJ alfanumérico válido; a documentação atual tipa `cpfCnpj` como string, mas a aceitação real deve ser verificada no sandbox. [Referência Asaas](https://docs.asaas.com/reference/criar-novo-cliente).
6. Implementar carga mensal seletiva dos CNPJs em watchlist e armazenar competência/hash.

### P1 — enriquecimento da prospecção e cobertura

1. Criar índice curado de estabelecimentos ativos nos CNAEs `6821801`, `6821802` e `6822600`.
2. Extrair CNPJ dos sites durante a revisão do Prospect.
3. Implementar correspondência explicável Receita + Google Places + site, com confirmação humana.
4. Preservar o vínculo confirmado ao promover para Crawl Agency.
5. Criar dashboard de cobertura por município e alertas mensais de novas empresas/alterações.

### P2 — Clientes/Partes e Inteligência de Obras

1. Separar Cliente/Parte de `User` e migrar `Property.owner_id` para o novo conceito.
2. Enriquecer apenas Clientes pessoa jurídica por CNPJ.
3. Prototipar ingestão diária do CNO em uma cidade/UF.
4. Criar lista de Obras/Oportunidades separada de Property, MarketProperty e Lead.
5. Medir utilidade comercial antes de ampliar nacionalmente.

### P3 — vertical rural e demais fontes

1. Validar demanda real de imobiliárias rurais.
2. Definir contexto, contrato de dados e metodologia rural.
3. Pilotar CAFIR em uma UF, sem prometer titularidade ou polígono.
4. Reavaliar ECF/DIRBI/Parcelamentos somente diante de um caso de uso e parecer de governança claros.

## 9. Critérios de sucesso para o primeiro incremento

O P0 estará completo quando:

- uma Agency possuir identidade legal persistida e rastreável à competência da Receita;
- CNPJ numérico e alfanumérico passarem pela mesma API sem coerção numérica;
- o cadastro não descartar telefone, e-mail ou documento;
- o Asaas nunca receber CRECI ou placeholder como CPF/CNPJ;
- falha/atraso da Receita não impedir uso do último perfil válido;
- divergências oficiais forem alertas revisáveis, não alterações ou bloqueios automáticos;
- nenhuma informação nova atravessar a API pública/White-Label sem whitelist explícita.

## Conclusão

O melhor retorno não vem de colocar “dados da Receita” genericamente no IA-Imob. Vem de criar uma camada confiável de **identidade jurídica e proveniência**, reutilizada por cadastro, billing e prospecção; depois, usar CNO para uma oferta nova de inteligência de obras. CAFIR é uma opção estratégica para rural, não uma extensão natural da avaliação urbana. As demais bases devem permanecer fora do roadmap até existir uma finalidade clara que justifique custo, risco e governança.

## Fontes primárias principais

- [Compartilhamento oficial de arquivos da Receita Federal](https://arquivos.receitafederal.gov.br/index.php/s/gn672Ad4CF8N6TK?dir=/Dados)
- [Dados Abertos da Receita Federal](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos)
- [Cadastros abertos: CAFIR, CNPJ e CNO](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos/cadastros)
- [Leiaute oficial dos Dados Abertos do CNPJ](https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf)
- [Nota Técnica RFB/COCAD nº 47/2024](https://www.gov.br/receitafederal/dados/nota_cocad_no_47_2024.pdf)
- [CNPJ Alfanumérico](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico)
- [Catálogo oficial do CNO](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno)
- [Catálogo oficial do CAFIR](https://dados.gov.br/dados/conjuntos-dados/cadastro-de-imoveis-rurais---cafir)
- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [Guia da ANPD sobre legítimo interesse](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-orientativo-sobre-legitimo-interesse)
