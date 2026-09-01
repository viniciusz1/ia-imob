# Evidências — Novos Imóveis e preparação do histórico

Estas imagens foram capturadas com o mesmo usuário, o mesmo backup PostgreSQL e a mesma Imobiliária de Origem.

- **Antes:** commit `d45509e`, após a primeira versão do Módulo de Novos Imóveis e antes da preparação explícita do histórico.
- **Depois:** commit `db3c531`, após a entrega de preparação do histórico.

## Tela completa antes

Na primeira versão já existiam a tela, as flags, os filtros, os grupos por imobiliária e os cards. Porém, a tela não mostrava quais snapshots tinham sido usados para decidir se um anúncio era novo.

![Tela antes da preparação explícita do histórico](./antes-tela-completa.png)

## Tela completa depois

A tela passou a mostrar o snapshot atual, a janela de 30 dias, os snapshots anteriores comparados, a quantidade de identidades observadas e a explicação da flag **Novo**.

![Tela depois da preparação do histórico](./depois-tela-completa.png)

## Mudança principal no grupo da imobiliária

### Antes

Era mostrado apenas o nome da imobiliária, a data do snapshot e as quantidades.

![Cabeçalho da imobiliária antes](./antes-historico-imobiliaria.png)

### Depois

Agora é possível conferir exatamente qual histórico foi usado. Neste exemplo, o snapshot atual é o `#18`; o sistema encontrou o snapshot anterior `#13`, com 493 identidades observadas.

![Cabeçalho da imobiliária depois](./depois-historico-imobiliaria.png)

## Mudança no card do imóvel

### Antes

O card mostrava a flag **Novo**, mas não explicava o motivo.

![Card antes](./antes-card-imovel.png)

### Depois

O card informa que a identidade do anúncio não apareceu nos snapshots anteriores da janela de 30 dias.

![Card depois](./depois-card-imovel.png)

## Quando não existe histórico

O sistema informa **Histórico insuficiente**, mostra que nenhum snapshot anterior foi encontrado e não marca todos os anúncios como novos.

![Histórico insuficiente](./depois-historico-insuficiente.png)

## Como o histórico foi preparado na prática

### 1. Cada anúncio recebe uma identidade estável

Quando um snapshot é publicado, o sistema percorre seus anúncios e tenta encontrar um código estável fornecido pela imobiliária, chamado no código de `external_id`.

Se existir esse código, a identidade fica parecida com:

```text
external:codigo-123
```

Se a fonte não fornecer um código, o sistema usa a URL limpa e normalizada como segunda opção.

A identidade sempre pertence a uma imobiliária específica. Assim, códigos iguais de imobiliárias diferentes não são misturados.

### 2. A identidade e suas aparições ficam separadas

O banco usa duas estruturas:

- `listing_identities`: representa o mesmo anúncio ao longo do tempo;
- `listing_versions`: registra em qual snapshot esse anúncio apareceu e como estava naquele momento.

Preço, descrição, foto e URL podem mudar. Essas alterações criam uma nova versão, mas não uma nova identidade quando o código estável continua igual.

### 3. Somente snapshots publicados entram na comparação

O sistema pega o snapshot publicado atual de cada imobiliária e busca snapshots que atendam a todas estas condições:

- pertencem à mesma imobiliária;
- estão publicados;
- são anteriores ao snapshot atual;
- foram publicados entre 30 dias antes e o instante atual.

Execuções com erro, candidatas, não publicadas, de outra imobiliária ou fora dos 30 dias são ignoradas.

### 4. As identidades são comparadas

De forma simplificada, a regra executada é:

```text
Se não existe snapshot anterior:
    informar "Histórico insuficiente"
    não marcar nenhum anúncio como Novo

Se existe histórico:
    pegar as identidades vistas nos snapshots anteriores
    comparar com as identidades do snapshot atual
    identidade que não existia antes = Novo
    identidade que já existia = não é Novo
```

### 5. A tela recebe a prova da comparação

A API envia para a tela:

- início e fim da janela;
- quantidade e IDs dos snapshots comparados;
- quantidade de identidades encontradas;
- situação suficiente ou insuficiente;
- motivo usado para marcar cada anúncio como novo.

Também foi criado um índice no PostgreSQL para acelerar a busca por imobiliária e data de publicação.

## Explicação curta para apresentação

> Primeiro eu dei uma identidade estável para cada anúncio. Depois guardei a aparição dessa identidade em cada lista publicada pelo crawler. Para classificar o snapshot atual, busco somente as listas publicadas da mesma imobiliária nos 30 dias anteriores e comparo as identidades. Se a identidade não apareceu antes, o anúncio é Novo. Se não houver lista anterior, o sistema informa histórico insuficiente e não marca tudo como novo.

## Perguntas que podem aparecer

**O que é um snapshot?**

É a lista de imóveis encontrada em uma execução do crawler.

**Por que usar somente snapshots publicados?**

Porque uma execução com erro ou ainda não aprovada pode estar incompleta e produzir resultados falsos.

**Por que não comparar apenas a URL?**

Porque a URL pode mudar mesmo sendo o mesmo anúncio. O código estável fornecido pela origem é usado primeiro.

**O que acontece se não existir código externo?**

A URL normalizada é usada como segunda opção. Nesse caso, uma mudança completa da URL ainda pode gerar uma nova identidade; essa é uma limitação conhecida.

**Quantos snapshots anteriores são necessários?**

Nesta primeira regra, pelo menos um snapshot publicado dentro da janela de 30 dias. Sem nenhum, o histórico é insuficiente.
