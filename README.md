# Líder de Ginásio · XTCG Card Shop

Guarda os resultados de cada semanal de Pokémon TCG e calcula a tabela do mês a partir deles.

## Regra

- Pontos de desempenho = jogadores − colocação + 1 (o 1º de um semanal com 23 jogadores faz 23).
- Pontos de participação = 1 por semanal jogado.
- Desempate: primeiro, o maior número de participações nas ligas; depois, o melhor posicionamento nos semanais (a melhor colocação; se igualar, a segunda melhor, e assim por diante). Se ainda sobrar empate, vale quem apareceu primeiro.
- O dono da loja ocupa colocação e conta no total de jogadores, mas não aparece na tabela (`"pontua": false` em `jogadores.json`).

## Estrutura

```
docs/
  index.html, app.js              classificação do mês (GitHub Pages)
  semanais.html, semanais.js      lista de cada semanal, com busca por jogador
  style.css                       estilo compartilhado
  calc.js                         cálculo (usado pela página e pelo Node)
  assets/logo.png                 logo usado na página e na imagem exportada
  data/eventos.json               um item por semanal, jogadores na ordem da colocação
  data/jogadores.json             nome na tabela, apelidos e quem não pontua
  data/decks.json                 lista de decks (nome, ícones, palavras de reconhecimento)
  data/decks.txt                  decks de cada semanal, escritos à mão
  decks.js                        leitura do decks.txt e reconhecimento dos decks
scripts/tabela.js                 imprime a tabela no terminal
```

## Adicionar um semanal

1. Em `docs/data/eventos.json`, acrescente um item no fim. Cada jogador vem na ordem da colocação, com vitórias (`v`), derrotas (`d`), empates (`e`) e o Opponents' Win % (`ow`), como saem no resultado do torneio:
   ```json
   {
     "data": "2026-10-29",
     "nome": "Torneio semanal 29.10.26",
     "jogadores": [
       { "nome": "Nome do 1º", "v": 4, "d": 0, "e": 0, "ow": 56.25 },
       { "nome": "Nome do 2º", "v": 3, "d": 1, "e": 0, "ow": 50.00 }
     ]
   }
   ```
   Use os nomes como saem no resultado impresso. Só o `nome` é obrigatório para a pontuação, mas a página de semanais mostra `v`, `d`, `e` e `ow`.
2. Se aparecer alguém novo, ou um apelido, cadastre em `docs/data/jogadores.json`. Quem não estiver lá entra com o nome impresso, e a página mostra um aviso.
3. Rode `node scripts/tabela.js 2026-10` para conferir e faça o commit.

Mudou o mês? Não precisa fazer nada: a página cria o seletor de mês a partir das datas.

## Publicar

No GitHub: Settings → Pages → Branch `main`, pasta `/docs`. O GitHub Pages gratuito exige repositório público, e os resultados têm nomes de pessoas.

## Rodar no seu computador

Abrir o `index.html` direto pelo arquivo não funciona (o navegador bloqueia a leitura dos JSON). Use um servidor local:

```
cd docs
python3 -m http.server 8000
```

e abra http://localhost:8000.

## Visual

Segue o design system da XTCG: preto #070707 e branco como cores principais, coral #e8513f, amarelo #efd456, marinho #08163b, azul #3f7cae e roxo #834084 como apoio, fonte Figtree (Google Fonts). A arte do banner está em `docs/assets/banner.jpg` e o logo em `docs/assets/logo.png`.

## Páginas

- **Classificação** (`index.html`): tabela do mês, com top 3 em destaque e imagem para baixar.
- **Semanais** (`semanais.html`): um cartão por torneio, com o top 3 e a colocação completa (vitórias, empates, derrotas e Opp Win). O filtro de mês abre no mês atual, e há a opção "Todos os meses".

## Botões da página

- Clicar no nome mostra de onde vieram os pontos (colocação em cada semanal).
- Os botões de mês trocam a classificação exibida.
- O top 3 aparece em destaque, no pódio.
- "Baixar imagem" gera um PNG da classificação do mês selecionado, com banner e top 3.

## Decks dos semanais

A página de semanais mostra o deck de cada jogador com os ícones dos Pokémon, como no Limitless. Você escreve o deck em texto, e o site descobre qual é.

1. Em `docs/data/decks.txt`, abra um bloco com a data do semanal e liste um jogador por linha:
   ```
   # 2026-10-22
   Jogador 1: Dragapult ex
   Jogador 2: Ogerpon e Clefairy
   Jogador 3: dragapult dusknoir
   ```
   Pode usar nome ou apelido do jogador (o do `jogadores.json`) e escrever o deck do seu jeito. A data aceita `2026-10-22` ou `22.10.26`. O separador pode ser `:`, ` - ` ou ` | `. Linhas com `//` no começo são comentários. Quem não for listado fica sem deck, e semanais sem nenhum deck não mostram a coluna.
2. Rode `node scripts/conferir-decks.js` para ver o que o site entendeu. A própria página também mostra um aviso amarelo quando um nome não aparece no semanal ou quando um deck não é reconhecido.
3. Se um deck novo não for reconhecido, cadastre em `docs/data/decks.json`:
   ```json
   { "nome": "Charizard ex", "icones": ["charizard"], "palavras": ["charizard"] }
   ```
   `icones` são os nomes dos arquivos de imagem (sem `.png`); decks com dois Pokémon levam dois ícones. `palavras` são as palavras que precisam aparecer no texto para o deck ser reconhecido: quando dois decks batem, vale o que tem mais palavras (por isso "Dragapult Dusknoir" vira o deck dos dois, e só "Dragapult" vira o de um). `aliases` é opcional, para apelidos como "kanga". Para descobrir o nome do arquivo de um ícone, clique com o botão direito na imagem no Limitless e copie o endereço: o nome do arquivo é o que vem no fim.

Os nomes dos decks já cadastrados foram tirados dos ícones da página de torneio do Limitless; ajuste à vontade.

**Imagens.** Por padrão os ícones são carregados do endereço do Limitless (`iconesBase` em `decks.json`), então dependem de o site deles continuar no ar e deixar o uso. Para ter cópias suas, rode `node scripts/baixar-icones.js` (precisa de Node 18 ou mais novo e internet), que salva os ícones em `docs/assets/pokemon/`, e troque `iconesBase` para `"assets/pokemon/"`. Se um ícone não carregar, a página mostra o nome dele em texto.

## Se a página abrir sem estilo

Confira, na mesma pasta do `index.html`, se existe um arquivo chamado exatamente `style.css`. Ao baixar o mesmo arquivo mais de uma vez, o navegador renomeia para `style (1).css`, e a página deixa de achar o estilo. Quando isso acontece, a própria página mostra um aviso amarelo no topo. Depois de subir os arquivos, abra com Ctrl+F5 para não pegar a versão antiga do cache.
