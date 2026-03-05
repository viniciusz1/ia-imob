# Tech Laravel

## Regras de autorizacao em controllers e requests

1. Sempre que uma action de controller receber um `FormRequest`, a autorizacao deve ficar no metodo `authorize()` desse request.
2. Nesses casos, nao use `Gate::authorize(...)` nem `$this->authorize(...)` dentro da controller para a mesma action.
3. Se a action ainda nao possui `FormRequest` e exige autorizacao, crie um request dedicado (mesmo com `rules()` vazio) para centralizar a regra em `authorize()`.
4. Deixe na controller apenas a orquestracao da acao (chamada de service/action, transformacao de resposta e carregamento de relacoes).

## Regras de execucao local

1. Sempre rodar comandos Laravel/PHP do projeto via Sail.
2. Exemplos: `./vendor/bin/sail artisan test`, `./vendor/bin/sail test`, `./vendor/bin/sail artisan migrate`.
