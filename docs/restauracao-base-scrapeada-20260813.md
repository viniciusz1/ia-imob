# Restauração local do backup de imóveis scrapeados

Operação realizada em 10/09/2026, a partir do arquivo fornecido pelo usuário: `postgres_7777_full_20260813_194701.dump`.

## Base restaurada e ativada

O arquivo é um backup PostgreSQL em formato custom, gerado pelo PostgreSQL 18.4. Foi restaurado integralmente, com `pg_restore --no-owner --no-acl --exit-on-error`, no PostgreSQL 18.6 local.

O banco ativo do Laravel passou a ser **`ia_imob_import_20260813`**, configurado no `.env` local do backend. A API permanece em `http://localhost:5555`; a interface continua em `http://localhost:3000`.

A restauração preservou as tabelas, coletas, identidades, versões e relacionamentos do backup. Não houve cópia isolada de anúncios nem alteração da regra que seleciona o inventário corrente.

| Conjunto | Quantidade |
|---|---:|
| Registros scrapeados no backup, incluindo histórico | 5.601 |
| Registros scrapeados no inventário corrente usado pelo sistema | 4.089 |
| Identidades de anúncios no backup | 4.169 |
| Comparáveis fictícios da demonstração adicionados separadamente | 5 |
| Total de registros após disponibilizar a demonstração | 5.606 |
| Inventário corrente incluindo os cinco fictícios | 4.094 |

Inventário corrente significa registros apontados por `crawler.listing_identities.current_market_property_id`, com estado `active` ou `missing`, conforme o filtro existente no model `MarketProperty`. O total do backup inclui versões históricas e não representa 5.601 imóveis distintos disponíveis simultaneamente.

## Compatibilidade com avaliação

Foi aplicada a migration `2026_09_10_000001_add_rental_valuation_support` na base restaurada. O cache de configuração do Laravel e o cache de permissões foram limpos, e a API foi reiniciada para utilizar a nova base.

O backup contém o campo de preço `valor`, mas não contém `valor_aluguel` nem campos explícitos de aluguel nos payloads dos 5.601 registros. Portanto, nenhum preço real de aluguel foi inferido. Após a migration, esses registros ficam com `valor_aluguel = null`.

Os cinco preços de aluguel existentes após a preparação pertencem exclusivamente à origem **DEMO — Comparáveis fictícios**. Para avaliações reais de locação, será necessário alimentar preços mensais de aluguel.

## Acesso e exemplo para conferir

Entrar novamente em `http://localhost:3000/login`. A conta local de demonstração foi disponibilizada na base restaurada:

```text
Login: avaliacao@demo.localhost
Senha: AvaliacaoDemo123!
```

Em **Avaliar imóvel**, uma combinação com amostra real de venda é:

| Campo | Valor |
|---|---|
| Finalidade | Venda |
| Cidade | Jaraguá do Sul |
| Bairro | Amizade |
| Tipo residencial | Casa |
| Área avaliada | 120 m² |
| Quartos | 3 |
| Banheiros | 2 |
| Vagas | 2 |

A base contém sete registros correntes com essa combinação estrita de características e preço/área dentro dos limites da avaliação. A busca de candidatos pode incluir outros registros ao flexibilizar banheiros, conforme as regras existentes.

Validação executada pela API real, passando pelo frontend em `localhost:3000`: login aprovado; `POST /api/v1/valuations/candidates` retornou **8 candidatos de venda** e **zero candidatos de locação** para a entrada acima. Nenhuma avaliação real foi salva durante essa verificação. O esquema, a migration aplicada e os totais do inventário também foram conferidos diretamente no PostgreSQL.

## Preservação do ambiente anterior

O banco anterior **`ia_imob`** permanece intacto no mesmo PostgreSQL, incluindo as duas avaliações fictícias da apresentação anterior. Ele não foi mesclado com o backup nem apagado. Essas avaliações continuam acessíveis ao voltar para esse banco; o histórico da base restaurada começa com os registros do próprio backup.

Também foi criada uma cópia de segurança do ambiente anterior em:

```text
.cache/backups/ia-imob-before-scraped-import.dump
```

O backup original em Downloads não foi alterado. Os dumps e arquivos temporários de inspeção não foram adicionados ao versionamento.

Para voltar ao ambiente anterior, alterar apenas `DB_DATABASE=ia_imob` no `.env` local do backend e executar:

```powershell
docker restart ai-backendd-imobiliaria-laravel.test-1
docker exec ai-backendd-imobiliaria-laravel.test-1 php artisan config:clear
docker exec ai-backendd-imobiliaria-laravel.test-1 php artisan permission:cache-reset
```

Depois, entrar novamente pela interface. Não é necessário apagar ou restaurar bancos para alternar entre as duas bases locais.
