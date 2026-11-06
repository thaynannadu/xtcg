// Avatares pixel art dos jogadores no Líder de Ginásio: cada mês, cada jogador recebe um avatar sorteado.
// O sorteio é fixo para o mesmo mês e o mesmo nome (não muda ao recarregar) e evita repetir avatar no mês enquanto houver sobra.
// Sprites de treinadores do Pokémon Showdown (https://play.pokemonshowdown.com/sprites/trainers/), em assets/avatares/.
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api; else raiz.Avatares = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const LISTA = ['acetrainer', 'acetrainerf', 'artist', 'backpacker', 'backpackerf', 'baker', 'ballguy', 'battlegirl', 'beauty', 'biker', 'birdkeeper', 'blackbelt',
    'boarder', 'bugcatcher', 'burglar', 'camper', 'chef', 'clown', 'collector', 'cook', 'cowgirl', 'cyclist', 'cyclistf', 'dancer', 'doctor', 'dragontamer',
    'firefighter', 'fisherman', 'gambler', 'gardener', 'gentleman', 'golfer', 'guitarist', 'hiker', 'hoopster', 'janitor', 'jogger', 'juggler', 'kimonogirl',
    'lady', 'lass', 'maid', 'medium', 'musician', 'nurse', 'picnicker', 'pilot', 'pokefan', 'pokemaniac', 'pokemonbreeder', 'pokemonranger', 'psychic',
    'punkgirl', 'punkguy', 'ruinmaniac', 'sailor', 'schoolboy', 'schoolgirl', 'scientist', 'skier', 'supernerd', 'surfer', 'swimmer', 'teacher', 'tourist',
    'youngathlete', 'youngster'];

  // Hash de texto (cyrb53, 32 bits): estável entre navegadores.
  function hash(txt) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < txt.length; i++) {
      const c = txt.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0) * 4294967296 + (h1 >>> 0);
  }
  const chave = (nome) => String(nome).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

  // mes: "2026-11". nomes: nomes dos jogadores do mês. Devolve Map(nome → arquivo sem extensão).
  function atribuir(mes, nomes, lista = LISTA) {
    const unicos = [...new Set(nomes)];
    const ordem = unicos.map((n) => ({ n, h: hash(`${mes}|${chave(n)}`) })).sort((a, b) => (a.h - b.h) || (a.n < b.n ? -1 : 1));
    const usados = new Set(), mapa = new Map();
    ordem.forEach(({ n, h }) => {
      let i = h % lista.length;
      if (usados.size < lista.length) while (usados.has(i)) i = (i + 1) % lista.length; // sem repetir enquanto houver sobra
      usados.add(i); mapa.set(n, lista[i]);
    });
    return mapa;
  }
  const caminho = (slug) => `assets/avatares/${slug}.png`;

  return { LISTA, atribuir, caminho, hash };
});
