# Consulta de Novos Imóveis

`GET /api/v1/new-properties` exige usuário autenticado de uma Agência ativa com a permissão `properties.view`. A consulta usa apenas o último Snapshot Publicado de cada Imobiliária de Origem; classificação e amostra comparável são calculadas antes dos filtros.

| Parâmetro | Valores | Padrão |
| --- | --- | --- |
| `agency_id` | ID da Imobiliária de Origem | todas |
| `city`, `neighborhood`, `type` | texto; comparação sem diferença entre maiúsculas e acentos | todos |
| `purpose` | `venda`, `locacao` | todas |
| `flag` | `all`, `new`, `opportunity`, `both` | `all` |
| `search` | título, tipo, finalidade, cidade, bairro, descrição ou imobiliária | vazio |
| `bedrooms`, `bathrooms`, `parking` | `1`, `2`, `3`, `4`, `5+` | todos |
| `sort` | `identified_desc`, `identified_asc`, `opportunity_desc` | `identified_desc` |
| `page`, `per_page` | página a partir de 1; tamanho de 1 a 100 | 1 e 24 |

A paginação é global por anúncio. `data` mantém os anúncios da página agrupados por Imobiliária de Origem; uma imobiliária pode aparecer em mais de uma página. A ordenação por identificação usa a data de publicação do snapshot que classificou o anúncio. Empates usam data decrescente e ID do anúncio para manter páginas estáveis.

`meta.pagination` informa `page`, `per_page`, `total`, `last_page` e `has_more`. `meta.filtered_total` é a quantidade após os filtros. `meta.total_new` e `meta.total_opportunities` são os totais gerais do inventário classificado, antes dos filtros. `meta.filters` contém as opções disponíveis em todo o inventário classificado, inclusive quando a página atual não contém essas opções. `counts` em cada grupo também representa o snapshot inteiro daquela imobiliária.

Exemplos:

```text
/api/v1/new-properties?flag=both&city=Joinville&page=1&per_page=24
/api/v1/new-properties?sort=opportunity_desc&purpose=venda
```

O cálculo usa consulta em lote para os snapshots e identidades. A classificação do conjunto de snapshots correntes é reutilizada por cinco minutos entre filtros e páginas; uma nova publicação altera a chave do cache. Na base restaurada com 654 anúncios classificados, a primeira consulta levou cerca de 5,5 s e uma consulta repetida cerca de 0,9 s no ambiente Docker local em 23/09/2026. Esses números são indicativos, não metas de produção.
