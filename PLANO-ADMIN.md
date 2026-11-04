# Plano: administração por envio de texto

Objetivo: colar o resultado do semanal (e os decks) em texto e o site atualizar `eventos.json` e `decks.txt` sem editar JSON à mão.

## Fluxo recomendado (seguro, sem backend)
1. Formulário de Issue no GitHub ("Novo semanal") com campos: data, nome do evento, lista de jogadores na ordem de colocação (`Nome  V-D-E  OppWin`), decks (`Jogador: deck`).
2. Uma GitHub Action lê a Issue, usa o mesmo parser do site (`decks.js`/`calc.js`), valida (nomes, duplicados, datas) e abre um Pull Request alterando `docs/data/eventos.json` e `docs/data/decks.txt`.
3. Você confere o PR (a Action comenta o ranking do mês e os avisos) e dá merge pelo GitHub Desktop/Web. O GitHub Pages republica sozinho.

Por quê: GitHub Pages é estático; guardar token de escrita num `admin.html` público expõe o repositório. Issue + Action não precisa de senha no navegador e deixa histórico revisável.

## Formato de texto proposto
```
# 2026-11-05 Semanal 05.11
1. Nome Do Jogador 3-1-0 62.5%
2. Outro Jogador 2-1-1 55%
...
## decks
Nome Do Jogador: Dragapult Dusknoir
```

## Etapas
1. Extrair o parser de texto para `docs/texto.js` (compartilhado navegador/Node) + testes.
2. `scripts/adicionar-semanal.js`: texto → atualiza JSONs (usa `validar-dados.js`).
3. Formulário de Issue + Action que roda o script e abre o PR.
4. Opcional: `admin.html` só para *pré-visualizar* o texto colado (sem gravar), útil para conferir antes de enviar.

## Alternativa
Claude Code no repositório: você cola o texto/imagem e ele roda o script e faz o commit.
