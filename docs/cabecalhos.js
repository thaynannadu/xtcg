// Ilustrações de cabeçalho (site e imagens do feed). Para acrescentar uma, coloque o arquivo em assets/feed/ e inclua o nome aqui.
// Cada uso sorteia uma ilustração diferente da última mostrada (lembrada no navegador).
(function (raiz) {
  'use strict';
  const LISTA = ['gary-blastoise', 'misty-togetic', 'erika-vileplume', 'sabrina-alakazam', 'blaine-magmar', 'team-rocket', 'brock-geodude']
    .map((n) => `assets/feed/${n}.jpg`);
  const PADRAO = 'assets/banner-tcg.jpg'; // banner original: entra no sorteio e também serve de reserva
  LISTA.push(PADRAO);

  function ler(chave) { try { return localStorage.getItem(chave); } catch (e) { return null; } }
  function gravar(chave, v) { try { localStorage.setItem(chave, v); } catch (e) { /* sem armazenamento: só sorteia */ } }

  // Lista embaralhada, com a última usada por último.
  function ordem(chave) {
    const ultimo = ler(chave);
    const l = LISTA.slice();
    for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
    l.sort((a, b) => (a === ultimo) - (b === ultimo));
    return l;
  }
  function lembrar(chave, src) { gravar(chave, src); }

  const Cabecalhos = { LISTA, PADRAO, ordem, lembrar };
  raiz.Cabecalhos = Cabecalhos;

  // Cabeçalho do site: sorteia ao abrir cada página.
  function aplicar() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const chave = 'xtcg-site-cabecalho';
    const src = ordem(chave)[0];
    const img = new Image();
    img.onload = () => { hero.style.setProperty('--hero-arte', `url("${src}")`); lembrar(chave, src); };
    img.src = src; // se o arquivo faltar, fica a arte padrão do CSS
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar); else aplicar();
  }
})(typeof window !== 'undefined' ? window : globalThis);
