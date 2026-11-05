/* Funções compartilhadas entre Classificação e Semanais.
   Funciona no navegador (window.Util) e no Node (require). */
(function (root) {
  const nomeMes = (ym) => {
    const [a, m] = ym.split('-').map(Number);
    const n = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const dataCurta = (iso) => iso.slice(8, 10) + '.' + iso.slice(5, 7);
  const dataBarra = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
  const mesDe = (data) => data.slice(0, 7);
  const mesAtual = (hoje = new Date()) => `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  // Quintas-feiras do mês (AAAA-MM): o total de semanais esperado desde o dia 1.
  function quintasDoMes(ym) {
    const [a, m] = ym.split('-').map(Number);
    const dias = new Date(a, m, 0).getDate();
    let n = 0;
    for (let d = 1; d <= dias; d++) if (new Date(a, m - 1, d).getDay() === 4) n++;
    return n;
  }
  // Se o mês teve mais semanais registrados do que quintas, vale o maior.
  const totalSemanais = (eventos, ym) => Math.max(quintasDoMes(ym), eventos.filter((e) => mesDe(e.data) === ym).length);

  // Só meses com semanal registrado, do mais novo para o mais antigo.
  const mesesComDados = (eventos) => [...new Set(eventos.map((e) => mesDe(e.data)))].sort().reverse();
  // Mês que abre selecionado: o atual; se ele não tem semanal, o último que tem (sem passar do atual).
  function mesPadrao(meses, atual) {
    const ate = meses.filter((m) => m <= atual);
    return ate.length ? ate[0] : (meses[0] || atual);
  }

  async function json(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Não consegui carregar ${url} (${r.status}).`);
    return r.json();
  }

  function avisarSeSemEstilo() {
    if (getComputedStyle(document.documentElement).getPropertyValue('--preto').trim()) return;
    const p = document.createElement('p');
    p.setAttribute('style', 'background:#fff3c4;color:#000;padding:12px;margin:0;font:16px sans-serif');
    p.textContent = 'O arquivo style.css não foi carregado. Confira se ele está na mesma pasta do index.html e do semanais.html, com esse nome exato (sem "(1)" no final).';
    document.body.prepend(p);
  }

  // Imagens do deck (Limitless ou cópia local). Deck sem ícone ou ícone que ainda não foi lançado
  // usa a imagem substituta (substitute.png, na raiz do site), com o nome do Pokémon no tooltip.
  const SUBSTITUTA = 'substitute.png';
  function iconeImg(cfg, slug, alt) {
    const img = document.createElement('img');
    img.src = slug ? cfg.iconesBase + slug + (cfg.iconesExt || '.png') : SUBSTITUTA;
    img.alt = alt || (slug ? slug.replace(/-/g, ' ') : ''); img.title = img.alt;
    img.loading = 'lazy'; img.decoding = 'async';
    img.addEventListener('error', () => {
      if (img.getAttribute('src') === SUBSTITUTA) return;
      img.classList.add('icone-substituta'); img.src = SUBSTITUTA;
    });
    return img;
  }

  const API = { nomeMes, plural, dataCurta, dataBarra, mesDe, mesAtual, quintasDoMes, totalSemanais, mesesComDados, mesPadrao, json, avisarSeSemEstilo, iconeImg, SUBSTITUTA };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Util = API;
})(typeof window !== 'undefined' ? window : globalThis);
