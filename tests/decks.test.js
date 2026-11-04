const test = require('node:test');
const assert = require('node:assert');
const Decks = require('../docs/decks.js');

const registro = Decks.montarRegistro([
  { nome: 'Dragapult ex', icones: ['dragapult'], palavras: ['dragapult'] },
  { nome: 'Dragapult ex / Dusknoir', icones: ['dragapult', 'dusknoir'], palavras: ['dragapult', 'dusknoir'] },
  { nome: 'Lucario', icones: ['lucario'], palavras: ['lucario'] },
]);

test('deck com mais palavras vence', () => {
  assert.strictEqual(Decks.identificar('Dragapult Dusknoir', registro).nome, 'Dragapult ex / Dusknoir');
  assert.strictEqual(Decks.identificar('draga', registro), null);
  assert.strictEqual(Decks.identificar('Dragapult', registro).nome, 'Dragapult ex');
});

test('texto desconhecido não casa com nenhum deck', () => {
  assert.strictEqual(Decks.identificar('Charizard', registro), null);
  assert.strictEqual(Decks.identificar('', registro), null);
});

test('leitura do decks.txt', () => {
  const { blocos, erros } = Decks.lerTexto('# 29.10.26\nAna: lucario\n2º Beto - dragapult\nsem separador\n');
  assert.strictEqual(blocos.length, 1);
  assert.strictEqual(blocos[0].data, '2026-10-29');
  assert.deepStrictEqual(blocos[0].linhas.map((l) => l.jogador), ['Ana', 'Beto']);
  assert.strictEqual(erros.length, 1);
});
