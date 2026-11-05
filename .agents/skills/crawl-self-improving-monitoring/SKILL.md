---
name: crawl-self-improving-monitoring
description: Monitora e melhora as execuções de crawl de imobiliárias até que pelo menos 80% dos imóveis do site sejam importados, passando por discovery (sitemap → playwright), perfil de extração, crawl de validação, crawl de produção ou arquivamento, em loop até todas as imobiliárias citadas estarem importadas, arquivadas ou canceladas (funciona em agentes sem goal/loop nativo). Use quando o usuário passar uma ou mais imobiliárias (crawl agencies) para monitorar, melhorar, destravar ou "fazer importar os imóveis".
---

# crawl-self-improving-monitoring

Objetivo por imobiliária: **imóveis importados ≥ 80% dos imóveis disponíveis no site**. Endpoints, payloads e campos de resposta estão em [REFERENCE.md](REFERENCE.md); consulte-o antes de cada chamada.

## 0. Goal: só pare quando todas estiverem resolvidas

**Condição de parada:** toda imobiliária citada pelo usuário está em estado final — `importada` (≥ 80%), `arquivada` ou `cancelada` (o usuário mandou parar ou cancelar). Enquanto alguma estiver `pendente`, `em_andamento` ou `aguardando`, o trabalho **não terminou**: não encerre o turno nem devolva um "resumo parcial".

1. **Arquivo de estado** em `~/.crawl-monitoring/state.md` (crie se não existir; se existir, retome dele). Uma linha por imobiliária: `id | nome | estado | etapa | site_total | url_count | perfis (id, amostra, valid_ratio) | run | normalized | próximo passo`. Atualize a cada mudança: é a memória do loop, permite retomar em outra sessão ou outra IA.
2. **Goal/loop nativo**: se o agente tiver (ex.: `/loop` ou goal no Claude Code), configure-o com a condição de parada acima e este arquivo de estado.
3. **Sem goal nativo** (Codex, Gemini, Cursor etc.), rode o loop você mesmo, no mesmo turno:

```
enquanto existir imobiliária fora de estado final:
    para cada imobiliária não final:
        avance UMA etapa (passos 1–4) ou confira a operação em andamento
        atualize state.md
    se todas estão aguardando operação: scripts/wait-operation.sh <id> (bloqueia até terminar)
```

- Operações demoram: espere com `scripts/wait-operation.sh` (ver REFERENCE.md) em vez de encerrar para "voltar depois".
- Enquanto uma operação roda, avance outra imobiliária.
- Bloqueio que exige o usuário (ex.: publicação excepcional, credencial): marque `aguardando: <motivo>`, siga com as outras e só pergunte quando todas as demais estiverem resolvidas ou bloqueadas.
- Se o contexto/turno estiver acabando, salve o estado e diga exatamente o comando para retomar ("continue a skill crawl-self-improving-monitoring a partir de ~/.crawl-monitoring/state.md").
- Ao final, apresente a tabela do `state.md` como relatório.

## 1. Linha de base: quantos imóveis o site tem

1. `GET /crawl-agencies/{id}` → pegue `base_url`.
2. Abra o site (skill `claude-in-chrome` ou fetch) e encontre a listagem/busca com **todos** os imóveis (venda + locação, sem filtros). Anote o total exibido; se não houver total, conte as páginas × itens por página.
3. Este é o `site_total`. Discovery e importação são medidos contra ele.

## 2. Discovery: `url_count` ≥ `site_total` (ou próximo)

O primeiro discovery é sempre por **sitemap**. Veja o último snapshot (`GET /crawl-agencies/{id}/discovery-snapshots`) e confira URLs de amostra (`/discovery-snapshots/{id}/urls`) — devem ser páginas de imóvel, não de listagem/blog.

- Bateu o número → vá para o passo 3.
- Não bateu → verifique se `{base_url}/sitemap.xml` existe (e sitemaps indexados nele).
  - **Existe** mas faltam imóveis: confira se o sitemap realmente lista os imóveis; se listar e o discovery não pegou, isso é bug no fetcher de sitemap (debug como abaixo).
  - **Não existe** (ou não lista imóveis): rode discovery com `sources: ["playwright"]` e acompanhe a operação até terminar.
- Playwright também não chegou ao número → **debug no crawler-machine**:
  1. Reproduza localmente contra o site e identifique onde falha (seletor do card/link, paginação, scroll infinito, "carregar mais", filtro inicial, timeout).
  2. Use a skill `tdd`: escreva o teste de regressão em `crawler-machine/tests/test_playwright_discoverer.py` reproduzindo o padrão do site (HTML fixture), veja falhar, corrija, veja passar.
  3. Rode a suíte do crawler-machine, então rode o discovery playwright de novo pela API.
  4. `crawler-machine/` é repositório Git separado — commite lá, não no monorepo.

Código relevante: `crawler-machine/crawler_machine/discovery/discoverer.py`, `discovery/items_catalog/discoverer.py` (`PlaywrightListingDiscoverer`), `discovery/items_catalog/browser.py` (`PlaywrightListingBrowser`), `discovery/sitemap_fetcher.py`.

## 3. Perfil de extração: `valid_ratio` ≥ 70%

1. Escolha um imóvel-amostra do snapshot: prefira **apartamento, casa ou geminado**, com página completa (preço, área, quartos, endereço, fotos). Evite terrenos, salas, lançamentos e páginas com dados faltando.
2. Gere o perfil (`POST /extraction-profiles/generate`) e espere a operação.
3. Rode o crawl de validação (`POST /extraction-profiles/{id}/validation`) e espere a operação.
4. Leia o relatório: `valid_ratio` é a assertividade. Olhe também `required_field_coverage` e `blocking_failures`, e os registros com problema (`records?filter=issues`).

Decisão:

- `valid_ratio` ≥ 0,70 → aprove + ative o perfil e vá para o passo 4.
- < 0,70 → **segunda tentativa**: outro imóvel-amostra (de outro tipo/bairro), novo perfil, nova validação. Fique com o melhor.
- Ainda < 0,70 → **ajuste manual** do melhor perfil: a partir dos registros com problema, identifique o campo que falha (seletor errado, campo vazio, formato de preço/área) e corrija `schemas`/`fields`/`strategies` do perfil (ver REFERENCE.md › Edição manual). Revalide.
- Ainda muito baixo → **arquive a imobiliária** (`PATCH /lifecycle` → `archived`) e registre o motivo.

## 4. Produção e verificação final

1. Produção exige agência `active` sem `revalidation_required`; se ainda estiver em onboarding, ative-a (`POST /crawl-agencies/{id}/activate`).
2. `POST /production-crawls` com o snapshot e o perfil ativo; acompanhe a operação e o crawl run.
3. Importados = `counts.normalized` do crawl run (confira também `publication_state` e o quality report).
4. `importados / site_total ≥ 0,80` → concluído. Abaixo disso, investigue: se `counts.raw` < `site_total` o problema é discovery (volte ao passo 2); se `rejected`/`errors` altos, é extração (volte ao passo 3).

## Regras

- Não prossiga de etapa enquanto a operação anterior não estiver em estado final; cheque `error` e `timeline` em falhas antes de repetir. Use `/operations/{id}/retry` só para falhas transitórias.
- Nunca aprove um perfil abaixo de 70% para "destravar" produção, nem use publicação excepcional sem pedir ao usuário.
- Arquivar é a última opção e deve vir com a análise do porquê.
