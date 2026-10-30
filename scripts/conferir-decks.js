// Uso: node scripts/conferir-decks.js
// Mostra o que o site vai entender do docs/data/decks.txt: decks reconhecidos, nomes que não casam e datas sem semanal.
const fs = require('fs');
const path = require('path');
const XTCG = require('../docs/calc.js');
const Decks = require('../docs/decks.js');

const dir = path.join(__dirname, '..', 'docs', 'data');
const ler = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const eventos = JSON.parse(ler('eventos.json'));
const jogadores = JSON.parse(ler('jogadores.json'));
const registro = Decks.montarRegistro(JSON.parse(ler('decks.json')).decks);
const { blocos, erros } = Decks.lerTexto(ler('decks.txt'));
const chave = XTCG.criarChave(jogadores);

erros.forEach((e) => console.log('ERRO  ', e));
blocos.forEach((b) => {
  const ev = eventos.find((e) => e.data === b.data);
  if (!ev) { console.log(`ERRO   ${b.data}: não existe semanal nessa data.`); return; }
  const presentes = new Set(XTCG.detalharEvento(ev, jogadores).map((l) => chave(l.impresso)));
  let ok = 0;
  console.log(`\n${b.data} (${b.linhas.length} de ${ev.jogadores.length} jogadores com deck)`);
  b.linhas.forEach((l) => {
    const deck = Decks.identificar(l.deck, registro);
    const naoAchou = !presentes.has(chave(l.jogador));
    if (naoAchou) console.log(`  ?? jogador não encontrado neste semanal: ${l.jogador}`);
    else if (!deck) console.log(`  ?? deck não reconhecido: ${l.jogador}: ${l.deck}`);
    else { ok++; console.log(`  ok  ${l.jogador} -> ${deck.nome}`); }
  });
  console.log(`  ${ok} reconhecidos`);
});
