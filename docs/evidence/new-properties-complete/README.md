# Evidências da consulta e validação do módulo

Capturas feitas em 23/09/2026 na versão atual da tela, com a base PostgreSQL restaurada e a API local autenticada.

- `paginacao.png`: página 2 de 28, com anúncios classificados e controle para avançar ou voltar. As páginas 1 e 2 foram comparadas sem IDs repetidos.
- `filtros-e-oportunidades.png`: filtros disponíveis na tela e categoria Oportunidades, com selo, score e justificativa de preço.

Na checagem, a API retornou 654 anúncios classificados, sendo 651 novidades e 3 oportunidades. Esses números são próprios do backup usado e podem mudar após novas publicações do crawler.

Os testes automatizados de API e regras estão em `ai-backendd-imobiliaria/tests/Feature/NewProperties/NewPropertiesQueryServiceTest.php`; os testes da tela estão em `ai-front-end-imobiliaria/src/components/features/new-properties/__tests__/NewPropertiesClient.test.tsx`.
