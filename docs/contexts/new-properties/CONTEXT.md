# Novos Imóveis

Entrada do workspace da Agência para validar a demanda por uma futura visão das ofertas que acabaram de entrar no mercado. A entrega inicial explica a proposta e registra como cada usuário pretende utilizá-la; ela ainda não disponibiliza feed, alertas ou ações operacionais sobre anúncios.

## Linguagem

**Módulo de Novos Imóveis**:
A futura superfície em que usuários de uma Agência poderão revisar anúncios que entraram recentemente no inventário de mercado publicado. Na fase de validação, esse nome identifica somente a entrada explicativa e o formulário de interesse.
_Evitar_: Novos cadastros, imóveis da Agência, lançamentos imobiliários, feed já disponível

**Anúncio Novo**:
Um anúncio de mercado cuja `Listing Identity` aparece pela primeira vez em um `Published Snapshot`. Uma nova versão de preço, fotos, descrição ou URL não cria um Anúncio Novo quando a identidade estável permanece a mesma. O reaparecimento de uma identidade removida também não cria uma segunda identidade.
_Evitar_: Imóvel recém-cadastrado, anúncio atualizado, qualquer linha nova de `market_properties`

**Interesse no Módulo**:
Registro pertencente à Agência, único por usuário, que confirma a intenção de usar o Módulo de Novos Imóveis e informa um ou mais usos pretendidos, além de uma observação opcional. O usuário pode atualizar a própria resposta.
_Evitar_: Lead, inscrição pública, liberação do módulo, assinatura

**Uso Pretendido**:
Uma das necessidades que o usuário espera atender: monitorar anúncios recém-publicados, prospectar proprietários, encontrar opções para clientes ou acompanhar o movimento do mercado.
_Evitar_: Funcionalidade entregue, permissão, compromisso de roadmap

## Fluxo principal proposto

1. O Crawler Machine identifica a primeira aparição de uma `Listing Identity` durante o processamento de um snapshot.
2. Somente a primeira aparição em um `Published Snapshot` torna a identidade um Anúncio Novo consumível.
3. O Módulo de Novos Imóveis apresenta e ordena essas oportunidades pela primeira aparição publicada.
4. O usuário qualifica cada oportunidade para acompanhar ou dispensar.
5. Uma oportunidade acompanhada pode seguir para captação, atendimento de um cliente ou monitoramento de mercado.

As etapas 1 e 2 reaproveitam as decisões de identidade e publicação existentes. As etapas 3 a 5 descrevem o fluxo-alvo e permanecem fora da entrega inicial de validação.

## Relacionamentos

- **Módulo de Novos Imóveis -> Crawler Machine**: consome a classificação de primeira aparição de uma `Listing Identity` somente após a aprovação de um `Published Snapshot`.
- **Módulo de Novos Imóveis -> Access Control**: a entrada é voltada a usuários de Agência com `properties.view`; um Platform Admin não registra Interesse no Módulo em nome de uma Agência.
- **Módulo de Novos Imóveis <-> AI Searcher**: ambos usam o inventário de mercado, mas o Módulo de Novos Imóveis parte da recência de publicação, enquanto o AI Searcher parte de uma busca iniciada pelo usuário.
- **Interesse no Módulo -> Agência**: o registro usa Agency Scope e nunca é compartilhado entre Agências.

## Fora do escopo da validação inicial

- consultar ou paginar Anúncios Novos;
- definir uma janela de dias durante a qual o anúncio recebe destaque;
- enviar notificações ou alertas;
- salvar, dispensar, compartilhar ou atribuir oportunidades;
- medir conversão comercial ou criar Leads;
- liberar a funcionalidade com base no Interesse no Módulo.

## Questões para a próxima etapa

- Qual janela de recência entrega valor sem gerar excesso de oportunidades?
- A primeira ordenação deve priorizar tempo, região, tipo de imóvel ou aderência a clientes?
- Quais canais de alerta e frequência os corretores aceitam?
- “Acompanhar” deve criar uma entidade própria ou integrar uma fila comercial existente?
