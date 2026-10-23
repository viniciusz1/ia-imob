# Execuções de crawls em lote

O Grupo de Operações identifica um lote de produção. Seus participantes ficam em
`crawler.operation_group_targets`, inclusive quando não há operação por bloqueio.
O grupo não executa trabalho: o protocolo Postgres, o lease e a exclusividade por
Crawl Agency continuam governando cada operação independente.

## Resultado e histórico

A API separa resultado técnico, publicação e veredito inicial de qualidade. Um
worker bem-sucedido com Snapshot Candidato mantém o lote `awaiting_quality`.
Falha técnica, cancelamento, publicação e quarentena são resoluções distintas;
participantes ignorados preservam código, motivo, nome e domínio do disparo.
Publicação excepcional posterior não apaga o veredito original de quarentena.

Grupos antigos são migrados somente com os participantes recuperáveis. Totais
solicitados, agências ignoradas e diagnósticos ausentes aparecem como não
registrados, sem reconstrução a partir do cadastro atual.

## Contratos

Sob `/api/v1/admin/crawler`, `production-crawl-batches` expõe histórico paginado;
`/{id}` retorna resumo; `/{id}/items` pagina participantes; `/{id}/diagnostics`
retorna evidências paginadas e agregados de erros, estratégias e cobertura;
`POST /{id}/rerun` solicita outro lote. As consultas exigem `crawler.view` e os
comandos exigem `crawler.operations.execute`, sempre com Platform Admin.

O disparo atual preserva `summary`, `group` e `skipped` e acrescenta `batch`.
`request_key` é UUID idempotente por responsável; repetir a mesma chave e intenção
retorna o lote original. Reutilizá-la com outra intenção é rejeitado.

Reexecuções aceitam `item_ids` do lote com falha, cancelamento ou quarentena;
sem seleção usam todos esses participantes. Geram discovery novo e fixam as
configurações atualmente ativas. Bloqueios atuais continuam sendo aplicados.

## Diagnóstico v1

`crawler.operation_diagnostics` é append-only, particionada por mês e vinculada
à operação, antes mesmo de existir Crawl Run. Cada observação tem UUID e data
estáveis, versão, tipo, etapa, URL, estratégia, resultado, duração, erro, campos
presentes/ausentes e indicação de fallback. A chave composta permite repetir a
entrega sem duplicar a observação. O worker escreve somente durante seu lease;
o Laravel registra a avaliação de qualidade após a conclusão técnica.

A cobertura usa os eventos `url_completed`, incluindo URLs rejeitadas. Mede
presença dos campos, não exatidão semântica. As estratégias mostram tentativas,
falhas e contribuições por fallback. Uma tentativa recuperada não aumenta o
número de URLs processadas nem altera o `error_count` usado pelo Portão de
Qualidade. A duração por estratégia é tempo acumulado, não duração do lote.

## Implantação e verificação

1. Aplicar migrations e publicar a API compatível do monorepo.
2. Publicar o worker instrumentado de `viniciusz1/crawler_machine`.
3. Publicar o frontend com a área Execuções em lote.

O gerenciador existente cria partições futuras e padrão; não há exclusão
automática de evidências. Agendamentos não são agrupados nesta entrega.

Testes: PHPUnit em `tests/Feature/Crawler` e `CrawlerAccessTest`, Vitest nos
componentes Crawler e navegação, lint/build do frontend e pytest do worker.
Executar integração somente em um Postgres isolado com nome terminado em `_test`.
