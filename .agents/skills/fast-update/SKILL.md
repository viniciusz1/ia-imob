---
name: fast-update
description: Executa uma tarefa descrita em um prompt e, ao final, faz commit e push nos repositórios Git afetados (monorepo ia-imob e/ou crawler-machine). Use quando o usuário pedir "fast-update", "faça e já suba/commite/dê push" ou quiser entregar uma alteração de ponta a ponta sem etapas manuais de Git.
---

# fast-update

Recebe o prompt de uma tarefa, implementa, valida e, no fim, **commita e dá push** somente nos repositórios que foram realmente alterados por essa tarefa.

## Repositórios deste workspace

| Repositório | Raiz | Remoto | Cobre |
| :-- | :-- | :-- | :-- |
| ia-imob (monorepo) | `/home/zonemax/apps/ia-imob` | `git@github.com:viniciusz1/ia-imob.git` | `ai-backendd-imobiliaria/`, `ai-front-end-imobiliaria/`, `docs/`, `.agents/` |
| crawler-machine | `/home/zonemax/apps/ia-imob/crawler-machine` | `git@github.com:viniciusz1/crawler_machine.git` | `crawler-machine/` |

> [!IMPORTANT]
> `crawler-machine/` é um repositório Git **independente**, ignorado pelo `.gitignore` do monorepo. Alterações nele nunca aparecem em `git status` da raiz: é preciso commitar e dar push nele separadamente, com `git -C crawler-machine ...`.

## Fluxo

### 1. Executar a tarefa
- Leia o prompt recebido e implemente a tarefa seguindo o `AGENTS.md` (Pint no PHP, sem `any` no TypeScript, `use` em vez de nomes totalmente qualificados no PHP, etc.).
- Se o prompt for ambíguo, pergunte antes de começar. Não pergunte nada sobre o Git depois: commit e push fazem parte do pedido.
- **Anote a lista exata de arquivos que você criou, editou ou removeu.** Ela define o que será commitado.

### 2. Validar antes de commitar
Rode só as verificações relevantes para o que mudou. Se alguma falhar por causa da sua alteração, corrija. Se falhar por algo pré-existente e não relacionado, siga em frente e registre isso no resumo final.

- Backend: `composer test` (ou o teste específico) e `vendor/bin/pint` nos arquivos PHP alterados. Se `php` não estiver no PATH, use Sail (`./vendor/bin/sail ...`).
- Frontend: `npm run lint`, `npx tsc --noEmit` e `npm test` (ou o teste específico).
- Crawler (Python): os testes do próprio `crawler-machine/`, se existirem.

### 3. Descobrir os repositórios afetados
```bash
git -C /home/zonemax/apps/ia-imob status --short
git -C /home/zonemax/apps/ia-imob/crawler-machine status --short
```
Um repositório é "afetado" somente se contiver arquivos da lista anotada no passo 1. Se nenhum arquivo seu estiver em um repositório, **não faça commit nem push nele**.

### 4. Commitar apenas o que pertence à tarefa

> [!WARNING]
> A árvore de trabalho pode conter alterações de outras tarefas ou de outras pessoas. **Nunca use `git add -A`, `git add .` nem `git commit -a`.**

Para cada repositório afetado:

1. Adicione os arquivos um a um, pelo caminho:
   ```bash
   git add -- caminho/do/arquivo1 caminho/do/arquivo2
   ```
2. Confira o que será commitado: `git diff --cached --stat`. Se aparecer algo que não é seu, remova com `git restore --staged -- <arquivo>`.
3. Se um arquivo da tarefa também tiver alterações antigas de terceiros no mesmo arquivo, avise o usuário no resumo final em vez de tentar separar os trechos.
4. **Nunca commite segredos**: `.env`, `.env.local`, chaves, tokens, dumps, `vendor/`, `node_modules/`, `.next/`, logs ou saídas do crawler. Se algum desses estiver na lista, pare e avise.
5. Commit com mensagem curta, no imperativo e com escopo, como pede o `AGENTS.md`:
   ```bash
   git commit -m "Add updated_at sort to crawl agencies list"
   ```
   - Uma mensagem por repositório, descrevendo o que mudou nele.
   - Não use `--no-verify`. Se um hook falhar, corrija a causa e crie um novo commit.

### 5. Push
```bash
git push origin "$(git branch --show-current)"
```
- Faça push na branch atual. Se estiver em `detached HEAD`, pare e avise o usuário.
- Se o push for rejeitado por divergência: `git pull --rebase origin <branch>`, resolva conflitos simples e tente de novo. Se houver conflito não trivial, interrompa e relate o problema. Não perca trabalho.
- **Nunca** use `--force` ou `--force-with-lease`.
- Se a branch ainda não existir no remoto, use `git push -u origin <branch>`.

### 6. Verificar e reportar
Depois do push, confirme que não ficou nada pendente da tarefa:
```bash
git status -sb
git log --oneline -1
```
Responda ao usuário de forma concisa com, para cada repositório afetado:
- branch, hash curto e mensagem do commit;
- se o push foi concluído;
- verificações executadas e o resultado (incluindo falhas pré-existentes ignoradas);
- arquivos modificados por terceiros que foram deliberadamente deixados de fora.

## Regras de segurança

- Só commite arquivos da própria tarefa. Em caso de dúvida sobre a autoria de uma alteração, deixe de fora e avise.
- Nunca reescreva histórico (`reset --hard`, `rebase -i`, `push --force`, `commit --amend` em commit já publicado).
- Não crie branches, tags nem Pull Requests, a menos que o prompt peça.
- Se a tarefa não produzir nenhuma alteração, não crie commit vazio: apenas informe.
- Se o push falhar por autenticação ou rede, informe o erro exato e deixe o commit local intacto.
