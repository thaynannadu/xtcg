const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const A = require('../docs/admin-lib.js');

const dir = path.join(__dirname, '..', 'docs', 'data');
const ler = (n) => fs.readFileSync(path.join(dir, n), 'utf8');
const eventos = JSON.parse(ler('eventos.json'));
const jogadores = JSON.parse(ler('jogadores.json'));
const decksCfg = JSON.parse(ler('decks.json'));
const dados = { eventos, jogadores, decksCfg, jogadoresTxt: ler('jogadores.json'), decksTxt: ler('decks.txt') };

test('eventos.json é regravado exatamente no mesmo formato', () => {
  assert.strictEqual(A.serializarEventos(eventos), ler('eventos.json'));
});

test('decks.json regravado mantém o conteúdo', () => {
  assert.deepStrictEqual(JSON.parse(A.serializarDecks(decksCfg)), decksCfg);
});

test('definirBlocoDecks cria, troca e apaga blocos sem mexer no resto', () => {
  const base = '// comentário\n\n#2026-10-29\nA: x\nB: y\n';
  const criado = A.definirBlocoDecks(base, '2026-11-05', [{ jogador: 'C', deck: 'z' }]);
  assert.strictEqual(criado, '// comentário\n\n#2026-10-29\nA: x\nB: y\n\n#2026-11-05\nC: z\n');
  const trocado = A.definirBlocoDecks(criado, '2026-10-29', [{ jogador: 'A', deck: 'novo' }]);
  assert.strictEqual(trocado, '// comentário\n\n#2026-10-29\nA: novo\n\n#2026-11-05\nC: z\n');
  assert.strictEqual(A.definirBlocoDecks(trocado, '2026-10-29', []), '// comentário\n\n#2026-11-05\nC: z\n');
  assert.strictEqual(A.definirBlocoDecks(base, '2026-11-05', []), base);
});

test('lerResultados entende vários formatos', () => {
  const { linhas, erros } = A.lerResultados('1. Ana Paula 3-1-0 62,5%\nBruno\t2\t2\t0\t50\nCarlos 4-0 70\nDiego\nlixo 12 abc');
  assert.deepStrictEqual(linhas.map((l) => l.nome), ['Ana Paula', 'Bruno', 'Carlos', 'Diego']);
  assert.deepStrictEqual(linhas[0], { nome: 'Ana Paula', v: 3, d: 1, e: 0, ow: 62.5 });
  assert.strictEqual(linhas[1].ow, 50);
  assert.strictEqual(linhas[2].e, 0);
  assert.strictEqual(erros.length, 1);
});

test('quintaSugerida aponta a quinta mais recente sem semanal', () => {
  assert.strictEqual(A.quintaSugerida([], new Date(2026, 10, 4)), '2026-10-29');
  assert.strictEqual(A.quintaSugerida([{ data: '2026-10-29' }], new Date(2026, 10, 4)), '2026-11-05');
  assert.strictEqual(A.quintaSugerida([], new Date(2026, 10, 5)), '2026-11-05');
  assert.strictEqual(A.nomePadrao('2026-11-05'), 'Torneio semanal 05.11.26');
});

test('validarSemanal acusa duplicados, data repetida e jogador novo', () => {
  const sem = { data: '2026-10-29', nome: 'X', jogadores: [{ nome: 'Renato Shippuden' }, { nome: 'Renato Almeida' }, { nome: 'Fulano Novo', deck: 'dragapult' }] };
  const r = A.validarSemanal(sem, { eventos, jogadores, decksCfg, editando: null });
  assert.ok(r.erros.some((e) => /Já existe/.test(e)));
  assert.ok(r.erros.some((e) => /duas vezes/.test(e)));
  assert.deepStrictEqual(r.novos, ['Fulano Novo']);
  const ok = A.validarSemanal({ data: '2026-11-05', nome: 'X', jogadores: [{ nome: 'Matheus Mendes', v: 3, d: 1, e: 0, ow: 50 }, { nome: 'Luis Silva', deck: 'foobar' }] }, { eventos, jogadores, decksCfg, editando: null });
  assert.deepStrictEqual(ok.erros, []);
  assert.strictEqual(ok.avisos.length, 1);
});

test('aplicarSemanal grava evento, deck e cadastra jogador novo', () => {
  const sem = { data: '2026-11-05', nome: 'Torneio semanal 05.11.26', jogadores: [{ nome: 'Matheus Mendes', v: 3, d: 1, e: 0, ow: 50, deck: 'Dragapult ex' }, { nome: 'Fulano Novo', v: 0, d: 4, e: 0, ow: 40 }] };
  const r = A.aplicarSemanal(sem, dados, { cadastrar: ['Fulano Novo'] });
  const ev = JSON.parse(r.arquivos['eventos.json']);
  assert.strictEqual(ev.length, eventos.length + 1);
  assert.strictEqual(ev[ev.length - 1].jogadores[1].nome, 'Fulano Novo');
  assert.ok(r.arquivos['decks.txt'].endsWith('#2026-11-05\nMatheus Mendes: Dragapult ex\n'));
  assert.strictEqual(JSON.parse(r.arquivos['jogadores.json']).slice(-1)[0].nome, 'Fulano Novo');
  const edit = A.aplicarSemanal({ ...sem, data: '2026-11-06' }, { ...dados, eventos: ev, decksTxt: r.arquivos['decks.txt'] }, { editando: '2026-11-05' });
  assert.deepStrictEqual(JSON.parse(edit.arquivos['eventos.json']).map((e) => e.data).slice(-2), ['2026-10-29', '2026-11-06']);
  assert.ok(!edit.arquivos['decks.txt'].includes('#2026-11-05'));
});

test('removerSemanal tira o evento e o bloco de decks', () => {
  const r = A.removerSemanal('2026-10-29', dados);
  assert.ok(!JSON.parse(r.arquivos['eventos.json']).some((e) => e.data === '2026-10-29'));
  assert.ok(!r.arquivos['decks.txt'].includes('#2026-10-29'));
});
