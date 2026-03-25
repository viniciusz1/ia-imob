# Especificação Técnica (Backend) - AI Searcher (Scrapy Properties)

## 1. Visão Geral
Este documento descreve a implementação no backend (Laravel) do módulo **AI Searcher**, responsável por persistir e expor os dados de imóveis extraídos (Scrapy Properties).

## 2. Estrutura de Banco de Dados
A tabela principal deve se chamar `scrapy-properties`.

### 2.1. Migration
Campos necessários na tabela:
- `id` (PK)
- `tipo` (string, nullable)
- `imobiliaria` (string, nullable)
- `valor` (decimal 15,2, nullable)
- `bairro` (string, nullable)
- `cidade` (string, nullable)
- `imagem` (text, nullable)
- `link_imovel` (text, nullable)
- `descricao` (text, nullable)
- `qtd_quartos` (integer, nullable)
- `area_m2` (decimal 10,2, nullable)
- `created_at`, `updated_at` (timestamps)

## 3. Model
Model `App\Models\ScrapyProperty`:
- Configurar propriedade protegia `$table = 'scrapy-properties'`.
- Configurar `$fillable` com todos os campos da migration.

## 4. Factory e Seeder

### 4.1. Factory (`ScrapyPropertyFactory`)
- Capaz de gerar dados de testes básicos (mocks).
- Atributos dinâmicos (`qtd_quartos`, `area_m2`) usando randomização.

### 4.2. Seeder (`ScrapyPropertySeeder`)
- Lógica focada em importar dados de um arquivo `.json` legado do front-end (`sitemap_jaragua_do_sul_pradi_ajustado.json`).
- O seeder deve iterar pelo array decodificado e gerar/mapear os atributos para preenchimento.
- Inclusão da classe no array de seeders chamados pelo `DatabaseSeeder`.

## 5. Endpoints de API
Criar a class `ScrapyPropertyController` retornando todos os registros na rota `/api/scrapy-properties`.
- Registrar a `apiResource` em `routes/api.php` fora do middleware de autenticação obrigatório ou incluído de acordo com a política de acesso (atualmente acessível para listagem indexada).
