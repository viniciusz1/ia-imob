---
description: Workflow: API Contract Synchronization Check (Laravel & Next.js)
---

Workflow: API Contract Synchronization Check (Laravel & Next.js)
Description: Este workflow garante a integridade dos dados entre o backend (Laravel) e o frontend (Next.js) analisando as definições técnicas nos arquivos de docs.
Trigger: Comando manual "Validar sincronização do módulo [nome]" ou alteração detectada nos arquivos dentro da pasta docs/{nome-modulo}/.

Phase 1: Data Extraction (Mining)
Backend Scan:

Acesse a pasta docs/{nome-modulo}/laravel/.

Extraia todos os campos definidos em "API Resources", "Database Schema" e "Request Validation".

Mapeie nomes de campos, tipos (string, int, float, boolean) e nulidade.

Frontend Scan:

Acesse a pasta docs/{nome-modulo}/next/.

Extraia definições de Zod Schemas, TypeScript Interfaces e contratos de Services.

Mapeie nomes de campos e validações correspondentes.

Phase 2: Structural Analysis (Cross-Check)
Field Mapping: Compare cada campo do backend com o seu correspondente no frontend.

Mismatch Detection: Identifique falhas críticas, incluindo:

Naming Collision: Ex: user_id no Laravel vs userId no Next.

Missing Fields: Campos presentes em um docs mas ausentes no outro.

Type Incompatibility: Ex: Backend enviando string (UUID) enquanto o frontend espera number (ID sequencial).

Validation Audit: Verifique se as regras de obrigatoriedade do Laravel coincidem com as validações .optional() ou .required() do Zod no Next.js.

Phase 3: Reporting & Documentation Adjustment
Report Generation:

Crie ou atualize o arquivo docs/{nome-modulo}/SYNC_REPORT.md.

Liste todos os erros encontrados com o status [ERRO] ou [AVISO].

Architectural Proposal:

Para cada divergência, sugira a alteração técnica necessária em conformidade com as rules de cada stack (tech-laravel.md ou tech-nextjs.md).

Finalization: Notifique o usuário sobre o estado da sincronização. Não altere arquivos de código fonte (.php, .ts, .tsx); limite-se à documentação técnica no diretório docs/.