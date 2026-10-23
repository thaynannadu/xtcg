# Líder de Ginásio · XTCG Card Shop

Guarda os resultados de cada semanal de Pokémon TCG e calcula a tabela do mês a partir deles.

## Regra

- Pontos de desempenho = jogadores − colocação + 1 (o 1º de um semanal com 23 jogadores faz 23).
- Pontos de participação = 1 por semanal jogado.
- Desempate: mais participação; se continuar empatado, quem apareceu primeiro.
- O dono da loja ocupa colocação e conta no total de jogadores, mas não aparece na tabela (`"pontua": false` em `jogadores.json`).

## Estrutura

```
docs/
  index.html, style.css, app.js   página (GitHub Pages)
  calc.js                         cálculo (usado pela página e pelo Node)
  assets/logo.png                 logo usado na página e na imagem exportada
  data/eventos.json               um item por semanal, jogadores na ordem da colocação
  data/jogadores.json             nome na tabela, apelidos e quem não pontua
scripts/tabela.js                 imprime a tabela no terminal
```

## Adicionar um semanal

1. Em `docs/data/eventos.json`, acrescente um item no fim:
   ```json
   {
     "data": "2026-10-29",
     "nome": "Torneio semanal 29.10.26",
     "jogadores": ["Nome 1º", "Nome 2º", "Nome 3º"]
   }
   ```
   Use os nomes como saem no resultado impresso; a ordem da lista é a colocação.
2. Se aparecer alguém novo, ou um apelido, cadastre em `docs/data/jogadores.json`. Quem não estiver lá entra com o nome impresso, e a página mostra um aviso.
3. Rode `node scripts/tabela.js 2026-10` para conferir e faça o commit.

Mudou o mês? Não precisa fazer nada: a página cria o seletor de mês a partir das datas.


- Clicar no nome mostra de onde vieram os pontos (colocação em cada semanal).
- Os botões de mês trocam a classificação exibida.
- O top 3 aparece em destaque, no pódio.
- "Baixar imagem" gera um PNG da classificação do mês selecionado, com banner e top 3.
