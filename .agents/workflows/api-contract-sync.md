---
description: Workflow: API Contract Synchronization Check (Laravel & Next.js)
---

# Workflow: API Contract Synchronization Check (Laravel & Next.js)

## Objetivo
Garantir consistência entre o contrato documentado do backend (Laravel) e do frontend (Next.js), atuando somente em documentação do diretório `docs/`.

## Trigger
- Comando manual: `Validar sincronização do módulo {nome-feature}`
- Mudanças em qualquer arquivo dentro de `docs/technical-implementations/{nome-feature}/`

## Entradas obrigatórias
- `docs/technical-implementations/{nome-feature}/laravel/`
- `docs/technical-implementations/{nome-feature}/next/`
- Template de relatório:
  - `.agents/workflows/templates/SYNC_REPORT.template.md`
- Regras de arquitetura:
  - `.agents/rules/tech-laravel.md`
  - `.agents/rules/tech-nextjs.md`

## Fase 1: Extração de Contrato (Mining)
### 1. Backend scan
- Ler documentação em `docs/technical-implementations/{nome-feature}/laravel/`.
- Extrair campos definidos em:
  - API Resources (payload de resposta)
  - Request Validation (payload de entrada)
  - Database Schema (tipagem e nulidade)
- Normalizar cada campo em uma estrutura comparável:
  - `path` (ex: `data.user.id`)
  - `type` (string, integer, number, boolean, array, object, enum, datetime)
  - `required` (sim/nao)
  - `nullable` (sim/nao)
  - `enum_values` (quando existir)

### 2. Frontend scan
- Ler documentação em `docs/technical-implementations/{nome-feature}/next/`.
- Extrair definições de:
  - Zod Schemas
  - TypeScript Interfaces/Types
  - Contratos de Services (request/response)
- Normalizar para a mesma estrutura do backend (`path`, `type`, `required`, `nullable`, `enum_values`).

## Fase 2: Analise Estrutural (Cross-Check)
### 1. Regras de comparacao
- Comparar backend vs frontend por `path`.
- Tratar `snake_case` vs `camelCase` como potencial mapeamento, nao equivalencia automatica.
- Confirmar consistencia de:
  - Presenca de campo
  - Tipo
  - Obrigatoriedade (`required`)
  - Nulidade (`nullable`)
  - Dominio (`enum_values`)

### 2. Classificacao de divergencias
- `[ERRO]`:
  - Campo ausente em um dos lados
  - Tipo incompativel (ex: `uuid:string` vs `number`)
  - Campo obrigatorio em um lado e opcional no outro sem justificativa documentada
  - Enum com valores diferentes
- `[AVISO]`:
  - Diferenca de naming com mapeamento possivel (ex: `user_id` vs `userId`)
  - Diferencas que nao quebram contrato imediatamente, mas geram risco de manutencao

## Fase 3: Relatorio e Ajuste de Documentacao
### 1. Geracao de relatorio
- Criar ou atualizar `docs/technical-implementations/{nome-feature}/SYNC_REPORT.md`.
- Usar `.agents/workflows/templates/SYNC_REPORT.template.md` como base inicial.
- Manter historico por data (`YYYY-MM-DD`) no topo do arquivo.
- Usar formato padrao por item:

```md
- [ERRO|AVISO] Campo: <path>
  - Backend: <definicao>
  - Frontend: <definicao>
  - Impacto: <quebra em runtime, tipagem incorreta, risco de regressao, etc.>
  - Acao recomendada: <ajuste em docs/technical-implementations/{nome-feature}/laravel/... ou docs/technical-implementations/{nome-feature}/next/...>
```

### 2. Proposta arquitetural
- Para cada divergencia, recomendar ajuste alinhado com:
  - `.agents/rules/tech-laravel.md`
  - `.agents/rules/tech-nextjs.md`

## Restricoes
- Nao editar arquivos de codigo-fonte (`.php`, `.ts`, `.tsx`, etc.).
- Limitar alteracoes a documentacao em `docs/`.
- Se faltar documentacao em qualquer lado (Laravel/Next), registrar bloqueio no `SYNC_REPORT.md` como `[ERRO] Documentacao incompleta`.

## Criterio de conclusao
- Workflow so pode ser finalizado com:
  - `SYNC_REPORT.md` atualizado
  - divergencias classificadas (`[ERRO]` e `[AVISO]`)
  - recomendacoes objetivas de correcao documentadas
