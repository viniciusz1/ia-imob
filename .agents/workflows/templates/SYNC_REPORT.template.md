# SYNC Report - {nome-feature}

## Metadados
- Modulo: `{nome-feature}`
- Data da analise: `YYYY-MM-DD`
- Backend analisado: `docs/technical-implementations/{nome-feature}/laravel/...`
- Frontend analisado: `docs/technical-implementations/{nome-feature}/next/...`
- Regras utilizadas:
  - `.agents/rules/tech-laravel.md`
  - `.agents/rules/tech-nextjs.md`

## Resultado Geral
- Status: `APROVADO | APROVADO COM AVISOS | NAO APROVADO`
- Resumo executivo:
  - `<1-3 linhas sobre o estado da sincronizacao>`

## Inventario de Contrato (Normalizado)
| Campo (`path`) | Backend (`type/required/nullable`) | Frontend (`type/required/nullable`) | Status |
| --- | --- | --- | --- |
| `data.example` | `string / sim / nao` | `string / sim / nao` | `OK` |

## Divergencias Detectadas

### [ERRO] Campo: `<path-ou-item>`
- Backend: `<definicao observada>`
- Frontend: `<definicao observada>`
- Impacto: `<quebra de contrato, erro 422, bug de runtime, etc.>`
- Acao recomendada: `<ajuste objetivo em docs/technical-implementations/{nome-feature}/laravel/... ou docs/technical-implementations/{nome-feature}/next/...>`
- Referencia: `<arquivo:linha opcional>`

### [AVISO] Campo: `<path-ou-item>`
- Backend: `<definicao observada>`
- Frontend: `<definicao observada>`
- Impacto: `<risco de manutencao/consistencia>`
- Acao recomendada: `<ajuste sugerido>`
- Referencia: `<arquivo:linha opcional>`

## Itens OK (Sem Divergencia)
- `<campo/contrato validado>`
- `<campo/contrato validado>`

## Bloqueios
- `[ERRO] Documentacao incompleta` quando faltar `laravel/` ou `next/` para o modulo.
- `<outro bloqueio, se houver>`

## Plano de Correcao
1. `<acao prioritaria bloqueante>`
2. `<acao de alinhamento adicional>`
3. `<acao de refinamento opcional>`

## Criterio de Saida
- `SYNC_REPORT.md` atualizado.
- Divergencias classificadas em `[ERRO]` e `[AVISO]`.
- Recomendacoes alinhadas com regras Laravel/Next documentadas.
