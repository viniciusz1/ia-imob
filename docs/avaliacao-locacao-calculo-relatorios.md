# Avaliação de locação: cálculo e relatórios

Complemento à [ampliação do módulo](avaliacao-venda-locacao.md). Esta etapa consolida a validação numérica do cálculo já implementado e completa a apresentação de locação em PDF, Word e Excel.

## Cálculo validado

O cálculo usa exclusivamente `valor_aluguel / area` para cada comparável de locação. Aplica p25, mediana e p75 à área avaliada; os preços de venda não entram nessa conta. As mesmas operações são verificadas tanto no cálculo automático quanto no fluxo de revisão manual.

Os testes acrescentados em [RentalValuationCalculationTest](../ai-backendd-imobiliaria/tests/Feature/RentalValuationCalculationTest.php) cobrem:

- Áreas diferentes entre comparáveis, evitando confundir mediana do aluguel com mediana do aluguel por m².
- Amostra de seis imóveis, que exige interpolar os percentis.
- Preços e áreas com casas decimais e persistência dos resultados em centavos.
- Ajuste de enchente aplicado antes do arredondamento final, sem arredondar previamente o valor por m².
- Comparável com aluguel extremo rejeitado na revisão manual, que não participa da faixa.
- Remoção de extremos no cálculo automático e flexibilização de banheiros.

Exemplo numérico coberto pelos testes:

| Área do comparável | Aluguel mensal | Aluguel por m²/mês |
|---:|---:|---:|
| 80 m² | R$ 810,00 | R$ 10,125 |
| 100 m² | R$ 2.025,00 | R$ 20,25 |
| 120 m² | R$ 3.645,00 | R$ 30,375 |
| 80 m² | R$ 3.240,00 | R$ 40,50 |
| 80 m² | R$ 4.050,00 | R$ 50,625 |
| 100 m² | R$ 6.075,00 | R$ 60,75 |

Para o imóvel avaliado de **123,45 m²**, os valores esperados e verificados são:

| Resultado | Mínimo | Central | Máximo |
|---|---:|---:|---:|
| Aluguel mensal sem ajuste | R$ 2.812,35 | R$ 4.374,76 | R$ 5.937,17 |
| Aluguel mensal com ajuste de enchente de 30% | R$ 1.968,64 | R$ 3.062,33 | R$ 4.156,02 |

A precisão intermediária importa: arredondar a primeira faixa antes de aplicar o ajuste poderia alterar o resultado em um centavo. Os testes fixam os valores esperados com o ajuste sobre a base sem arredondamento intermediário.

## Relatórios

PDF e Word passaram a identificar o resultado como **Aluguel mensal estimado** e os comparáveis com os cabeçalhos **Aluguel mensal** e **R$/m²/mês**. A finalidade da avaliação salva governa a formatação de todas as suas linhas, mesmo quando a evidência não repete essa informação.

No PDF, as linhas da tabela ajustam a altura à quantidade de texto. Isso impede que valores maiores ou a indicação mensal sejam cortados pelo limite anterior de duas linhas por célula.

O Excel passou a incluir a **faixa estimada mínima, central e máxima**, além dos comparáveis. Os valores permanecem em células numéricas, permitindo soma, média e outras fórmulas. A indicação `/mês` ou `/m²/mês` é aplicada pelo formato da célula, com duas casas decimais. As colunas monetárias foram ampliadas para comportar os valores e suas unidades.

Relatórios de venda continuam sem indicação mensal. Não foi alterada a fórmula estatística nem o percentual de enchente nesta etapa.

## Verificações dos arquivos

[ValuationReportsTest](../ai-backendd-imobiliaria/tests/Unit/Valuation/ValuationReportsTest.php) verifica o conteúdo dos arquivos gerados:

- PDF: valores das três faixas, preço anunciado, valor por m², unidade mensal e ausência de truncamento de preços extensos.
- Word: XML válido, rótulos de locação e todos os valores com centavos e unidade mensal.
- Excel: XML válido, células realmente numéricas, preços e faixas corretos, formatos mensais e ausência da indicação mensal na venda.
- Todos os formatos: regressão para venda e leitura da finalidade da avaliação salva.

A saída da execução conjunta fica em [calculo-relatorios-tests.txt](evidencias/avaliacao-locacao/calculo-relatorios-tests.txt). Os testes rodam no banco `testing`; a base restaurada com os imóveis scrapeados não é usada nem modificada por essa suíte.

Resultado da execução: **43 testes aprovados, 350 verificações**. O Pint passou nos cinco arquivos PHP desta etapa. A seleção inclui os testes anteriores da API, os seis cenários numéricos novos, os sete cenários de relatórios e a verificação existente de permissões de avaliação.

Não há nova migration nesta etapa. A migration de locação anterior continua sendo o requisito de banco.
