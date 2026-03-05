# SYNC Report - b2b-site-builder

## Metadados
- Modulo: `b2b-site-builder`
- Data da analise: 2026-03-04
- Backend analisado: `docs/technical-implementations/b2b-site-builder/laravel/especificacao.md`
- Frontend analisado: `docs/technical-implementations/b2b-site-builder/next/especificacao.md`
- Regras utilizadas:
  - `.agents/rules/tech-laravel.md`
  - `.agents/rules/tech-nextjs.md`

## Resultado Geral
- Status: `APROVADO`
- Resumo executivo:
  - A API pública e os parâmetros de configuração de temas (cores, tema, dados vitais SEO) combinam coerentemente entre Laravel (Endpoint `/api/public/site-settings` e Middleware) e Next.js (Edge Roteador). A exigência de enums rígidos para o `theme_slug` está prevista em ambos.

## Inventario de Contrato (Normalizado)
| Campo (`path`) | Backend (`type/required/nullable`) | Frontend (`type/required/nullable`) | Status |
| --- | --- | --- | --- |
| `theme_slug` | `string(enum) / sim / nao` | `string(enum) / sim / nao` | `OK` |
| `primary_color` | `string(hex) / sim / nao` | `string(hex) / sim / nao` | `OK` |
| `secondary_color` | `string(hex) / sim / nao` | `string(hex) / sim / nao` | `OK` |
| `domain` (X-Domain) | `string / sim(Header) / nao` | `string / sim(Middleware) / nao` | `OK` |

## Bloqueios
Nenhum.

## Criterio de Saida
- Sincronização aprovada baseada no guia arquitetural atual.
