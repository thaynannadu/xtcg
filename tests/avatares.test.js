const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Av = require('../docs/avatares.js');

const nomes = ['Luiz Moreira', 'Renato Almeida', 'Bruno Silveira', 'Thaynan Nadu', 'Mário André', 'Lara Rabelo'];

test('todos os avatares da lista existem em assets/avatares', () => {
  Av.LISTA.forEach((s) => assert.ok(fs.existsSync(path.join(__dirname, '..', 'docs', Av.caminho(s))), s));
});

test('o sorteio é fixo para o mesmo mês e não depende da ordem dos nomes', () => {
  const a = Av.atribuir('2026-11', nomes), b = Av.atribuir('2026-11', nomes.slice().reverse());
  nomes.forEach((n) => assert.strictEqual(a.get(n), b.get(n)));
});

test('meses diferentes sorteiam avatares diferentes', () => {
  const a = Av.atribuir('2026-11', nomes), b = Av.atribuir('2026-12', nomes);
  assert.ok(nomes.some((n) => a.get(n) !== b.get(n)));
});

test('não repete avatar no mês enquanto houver sobra', () => {
  const muitos = Array.from({ length: Av.LISTA.length }, (_, i) => `Jogador ${i}`);
  assert.strictEqual(new Set(Av.atribuir('2026-11', muitos).values()).size, Av.LISTA.length);
  assert.doesNotThrow(() => Av.atribuir('2026-11', muitos.concat(['Extra'])));
});
