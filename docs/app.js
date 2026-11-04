(function () {
  const $ = (id) => document.getElementById(id);
  let eventos = [], jogadores = [], logo = null, arte = null, mesSel = '';
  let cfgDecks = { iconesBase: '', iconesExt: '.png' }, ultimoDeck = new Map();
  const MOSTRAR_AVISOS = new URLSearchParams(location.search).has('avisos');

  const { nomeMes, plural, dataCurta, dataBarra, json, mesDe } = Util;
  const totalDoMes = () => Util.totalSemanais(eventos, mesSel);

  // As imagens do banner só são necessárias para exportar; a página não espera por elas.
  const imagem = (src) => {
    return new Promise((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error(`Não achei ${src}.`));
      i.src = src;
    });
  };

  function resultado() {
    return XTCG.calcular(eventos.filter((e) => mesDe(e.data) === mesSel), jogadores);
  }

  function listaDetalhes(l) {
    const ul = document.createElement('ul');
    ul.className = 'det';
    l.detalhes.forEach((x) => {
      const li = document.createElement('li');
      const d = document.createElement('span'); d.className = 'det-data'; d.textContent = dataBarra(x.data);
      const seta = document.createElement('span'); seta.className = 'det-seta'; seta.textContent = '→';
      const pos = document.createElement('span'); pos.className = 'det-pos'; pos.textContent = `${x.pos}º de ${x.de}`;
      const pts = document.createElement('strong'); pts.className = 'det-pts'; pts.textContent = `${x.pontos} pts`;
      li.append(d, seta, pos, pts);
      ul.append(li);
    });
    return ul;
  }

  // Ícones do último deck que o jogador usou (olhando todos os meses), ao lado do nome.
  function iconesDoDeck(nome) {
    const u = ultimoDeck.get(XTCG.norm(nome));
    if (!u || !u.deck) return null;
    const box = document.createElement('span'); box.className = 'deck-podio';
    box.title = `Último deck (${dataBarra(u.data)}): ${u.deck.nome}`;
    u.deck.icones.forEach((slug) => box.append(Util.iconeImg(cfgDecks, slug, u.deck.nome)));
    return box;
  }

  async function carregarUltimosDecks() {
    try {
      cfgDecks = Object.assign(cfgDecks, await json('data/decks.json'));
      const r = await fetch('data/decks.txt'); if (!r.ok) return;
      const registro = Decks.montarRegistro(cfgDecks.decks || []);
      const { blocos } = Decks.lerTexto(await r.text());
      const chave = XTCG.criarChave(jogadores);
      blocos.slice().sort((a, b) => a.data.localeCompare(b.data)).forEach((b) => {
        b.linhas.forEach((l) => {
          const deck = Decks.identificar(l.deck, registro);
          if (deck) ultimoDeck.set(chave(l.jogador), { data: b.data, deck });
        });
      });
    } catch (e) { /* sem decks, o pódio aparece só com o nome */ }
  }

  function renderPodio(top) {
    const ol = $('podio');
    ol.replaceChildren();
    top.forEach((l, i) => {
      const li = document.createElement('li');
      li.className = `card p${i + 1}`;
      const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = `${i + 1}º`;
      const h = document.createElement('h3');
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = l.nome; b.setAttribute('aria-expanded', 'false');
      h.append(b);
      const dk = iconesDoDeck(l.nome);
      const pts = document.createElement('p'); pts.className = 'pts';
      const forte = document.createElement('strong'); forte.textContent = l.desempenho;
      pts.append(forte, ' pts');
      const part = document.createElement('p'); part.className = 'part';
      const tot = totalDoMes();
      part.textContent = `${l.participacao}/${tot}`; part.title = `${plural(l.participacao, 'participação', 'participações')} em ${plural(tot, 'semanal', 'semanais')}`;
      li.append(pos, ...(dk ? [dk] : []), h, pts, part);

      let det = null;
      const alternar = () => {
        if (det) { det.remove(); det = null; b.setAttribute('aria-expanded', 'false'); return; }
        det = listaDetalhes(l); li.append(det); b.setAttribute('aria-expanded', 'true');
      };
      // O cartão inteiro abre os detalhes; o botão continua sendo o alvo de teclado.
      li.addEventListener('click', (ev) => { if (ev.target.closest('.det') || ev.target === b) return; alternar(); });
      b.addEventListener('click', alternar);
      ol.append(li);
    });
  }

  function renderResto(resto) {
    const total = totalDoMes();
    const corpo = $('tabela').tBodies[0];
    corpo.replaceChildren();
    resto.forEach((l, i) => {
      const tr = document.createElement('tr');
      tr.className = 'linha' + (i % 2 ? ' alt' : '');
      const pos = document.createElement('td'); pos.textContent = `${i + 4}º`;
      const nome = document.createElement('td'); nome.className = 'nome';
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = l.nome; b.setAttribute('aria-expanded', 'false');
      nome.append(b);
      const d = document.createElement('td'); d.className = 'des'; d.textContent = l.desempenho;
      const p = document.createElement('td'); p.textContent = `${l.participacao}/${total}`;
      tr.append(pos, nome, d, p);
      corpo.append(tr);

      let det = null;
      const alternar = () => {
        if (det) { det.remove(); det = null; b.setAttribute('aria-expanded', 'false'); return; }
        det = document.createElement('tr'); det.className = 'detalhe';
        const td = document.createElement('td'); td.colSpan = 4;
        const ul = listaDetalhes(l); ul.className = '';
        td.append(ul); det.append(td); tr.after(det);
        b.setAttribute('aria-expanded', 'true');
      };
      // A linha inteira abre os detalhes; o botão continua sendo o alvo de teclado.
      tr.addEventListener('click', (ev) => { if (ev.target === b) return; alternar(); });
      b.addEventListener('click', alternar);
    });
    $('resto').hidden = resto.length === 0;
  }

  function render() {
    const r = resultado();
    $('titulo').textContent = `Líder de Ginásio - ${nomeMes(mesSel)}`;
    $('subtitulo').textContent = `${plural(r.eventos.length, 'semanal contabilizado', 'semanais contabilizados')}`;
    $('mes').value = mesSel;

    renderPodio(r.tabela.slice(0, 3));
    renderResto(r.tabela.slice(3));
    $('vazio').hidden = r.tabela.length > 0;
    $('baixar').disabled = r.tabela.length === 0;

    const ul = $('lista-semanais'); ul.replaceChildren();
    r.eventos.forEach((e) => {
      const li = document.createElement('li');
      li.textContent = `${dataCurta(e.data)}, ${plural(e.jogadores.length, 'jogador', 'jogadores')}`;
      ul.append(li);
    });

    const av = $('avisos'); av.replaceChildren();
    // Avisos de dados são para quem administra: aparecem só em index.html?avisos
    if (!MOSTRAR_AVISOS) { av.hidden = true; return; }
    if (r.semCadastro.length) {
      const p = document.createElement('p');
      p.textContent = `Nomes sem cadastro em jogadores.json (contados com o nome impresso): ${r.semCadastro.join(', ')}.`;
      av.append(p);
    }
    r.avisos.forEach((t) => { const p = document.createElement('p'); p.textContent = t; av.append(p); });
    av.hidden = av.childElementCount === 0;
  }

  /* ---------- Imagem exportada ---------- */
  const COR = { preto: '#070707', chumbo: '#1a1a1a', grafite: '#1d1d1d', suave: '#b9b9b9',
    coral: '#e8513f', amarelo: '#efd456', azul: '#3f7cae', roxo: '#834084', marinho: '#08163b' };
  const GRAD = { 1: [COR.amarelo, COR.coral], 2: [COR.azul, COR.roxo], 3: [COR.coral, COR.roxo] };
  const FONTE = 'Figtree, "Helvetica Neue", Arial, sans-serif';

  function caixa(g, x, y, w, h, r) {
    g.beginPath();
    if (g.roundRect) { g.roundRect(x, y, w, h, r); return; }
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function degrade(g, x0, y0, x1, y1, cores) {
    const d = g.createLinearGradient(x0, y0, x1, y1);
    d.addColorStop(0, cores[0]); d.addColorStop(1, cores[1]);
    return d;
  }
  function ajustar(g, texto, peso, tam, larg) {
    let t = tam;
    g.font = `${peso} ${t}px ${FONTE}`;
    while (g.measureText(texto).width > larg && t > 12) { t -= 1; g.font = `${peso} ${t}px ${FONTE}`; }
  }

  function desenharBanner(g, x, y, w, h, titulo, sub) {
    g.save();
    caixa(g, x, y, w, h, 28); g.clip();
    g.fillStyle = degrade(g, x, y, x + w, y + h * 0.4, [COR.preto, COR.marinho]);
    g.fillRect(x, y, w, h);

    const aw = Math.round(w * 0.6);
    const off = document.createElement('canvas');
    off.width = aw * 2; off.height = h * 2;
    const o = off.getContext('2d'); o.scale(2, 2);
    // recorte "cover" ancorado à direita, como no site
    const nw = arte.naturalWidth, nh = arte.naturalHeight, ta = aw / h;
    let sw = nw, sh = nw / ta, sx = 0, sy = 0;
    if (nw / nh > ta) { sh = nh; sw = nh * ta; sx = nw - sw; } else { sy = (nh - sh) / 2; }
    o.drawImage(arte, sx, sy, sw, sh, 0, 0, aw, h);
    o.globalCompositeOperation = 'destination-in';
    const m = o.createLinearGradient(0, 0, aw, 0);
    m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.62, 'rgba(0,0,0,1)');
    o.fillStyle = m; o.fillRect(0, 0, aw, h);
    g.drawImage(off, x + w - aw, y, aw, h);

    const lw = 250, lh = lw * logo.naturalHeight / logo.naturalWidth;
    g.drawImage(logo, x + 40, y + 40, lw, lh);
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = `800 46px ${FONTE}`; g.fillText(titulo, x + 40, y + h - 70);
    g.font = `500 22px ${FONTE}`; g.fillStyle = COR.suave; g.fillText(sub, x + 40, y + h - 34);

    const seg = w / 4;
    [COR.coral, COR.amarelo, COR.azul, COR.roxo].forEach((c, i) => { g.fillStyle = c; g.fillRect(x + seg * i, y + h - 6, seg + 1, 6); });
    g.restore();
  }

  const CARD_H = 246;

  function desenharCard(g, l, lugar, x, yBase, cw, total) {
    const ch = CARD_H, y = yBase - ch;
    const [c1, c2] = GRAD[lugar];
    g.save();
    g.translate(x, y);
    const w = cw, h = ch;
    if (lugar === 1) { g.shadowColor = 'rgba(239,212,86,.28)'; g.shadowBlur = 30; }
    caixa(g, 0, 0, w, h, 12); g.fillStyle = COR.preto; g.fill();
    g.shadowBlur = 0; g.shadowColor = 'transparent';
    caixa(g, 1.5, 1.5, w - 3, h - 3, 11); g.lineWidth = 3; g.strokeStyle = degrade(g, 0, 0, w, h, [c1, c2]); g.stroke();

    g.textAlign = 'left'; g.textBaseline = 'top';
    g.font = `800 38px ${FONTE}`; g.fillStyle = degrade(g, 20, h - 160, 20 + 56, h - 112, [c1, c2]); g.fillText(`${lugar}º`, 20, h - 160);
    g.fillStyle = '#fff'; ajustar(g, l.nome, 800, 25, w - 40); g.textBaseline = 'alphabetic'; g.fillText(l.nome, 20, h - 26 - 62); g.textBaseline = 'top';
    g.textBaseline = 'alphabetic';
    g.font = `800 62px ${FONTE}`; g.fillStyle = '#fff'; g.fillText(String(l.desempenho), 20, h - 26);
    const larg = g.measureText(String(l.desempenho)).width;
    g.font = `500 20px ${FONTE}`; g.fillStyle = COR.suave;
    g.fillText('pts', 20 + larg + 8, h - 26);
    g.font = `300 18px ${FONTE}`; g.fillStyle = '#fff'; g.textAlign = 'right';
    g.fillText(`${l.participacao}/${total}`, w - 20, h - 26);
    g.textAlign = 'left'; g.textBaseline = 'top';
    g.restore();
  }

  async function baixar() {
    const btn = $('baixar'); btn.disabled = true;
    try { [logo, arte] = logo && arte ? [logo, arte] : await Promise.all([imagem('assets/logo.png'), imagem('assets/banner-tcg.jpg')]); }
    catch (e) { btn.disabled = false; alert(e.message); return; }
    try { await Promise.all([document.fonts.load(`800 40px Figtree`), document.fonts.load(`500 20px Figtree`), document.fonts.load(`300 20px Figtree`)]); } catch (e) { /* segue com a fonte reserva */ }
    const r = resultado(), total = totalDoMes();
    const top = r.tabela.slice(0, 3), resto = r.tabela.slice(3);
    const W = 1080, S = 2, M = 40, IN = W - 2 * M, BH = 300, GAP = 20, CW = (IN - 2 * GAP) / 3;
    const RH = 38, RG = 4, HH = 28;
    const podioH = top.length ? CARD_H : 0;
    const H = M + BH + (top.length ? 20 + podioH : 0) + (resto.length ? 20 + HH + resto.length * (RH + RG) : 0) + M;

    const c = document.createElement('canvas');
    c.width = W * S; c.height = H * S;
    const g = c.getContext('2d'); g.scale(S, S);
    g.fillStyle = COR.grafite; g.fillRect(0, 0, W, H);

    desenharBanner(g, M, M, IN, BH, `Líder de Ginásio - ${nomeMes(mesSel)}`, plural(r.eventos.length, 'semanal contabilizado', 'semanais contabilizados'));

    let y = M + BH;
    if (top.length) {
      y += 20;
      const base = y + podioH;
      const xs = { 1: M, 2: M + CW + GAP, 3: M + 2 * (CW + GAP) };
      top.forEach((l, i) => desenharCard(g, l, i + 1, xs[i + 1], base, CW, total));
      y = base;
    }
    if (resto.length) {
      y += 20;
      g.textBaseline = 'middle'; g.fillStyle = COR.suave; g.font = `600 14px ${FONTE}`;
      const cx = { pos: M + 32, nome: M + 120, des: M + 660, part: M + 890 };
      g.textAlign = 'left'; g.fillText('Posição', cx.pos, y + HH / 2); g.fillText('Nome', cx.nome, y + HH / 2);
      g.textAlign = 'center'; g.fillText('Pontos', cx.des, y + HH / 2); g.fillText('Participações', cx.part, y + HH / 2);
      y += HH;
      resto.forEach((l, i) => {
        caixa(g, M, y, IN, RH, 12); g.fillStyle = i % 2 ? COR.chumbo : COR.preto; g.fill();
        const m = y + RH / 2 + 1;
        g.textAlign = 'left'; g.fillStyle = COR.suave; g.font = `700 17px ${FONTE}`; g.fillText(`${i + 4}º`, cx.pos, m);
        g.fillStyle = '#fff'; ajustar(g, l.nome, 700, 19, 400); g.fillText(l.nome, cx.nome, m);
        g.textAlign = 'center'; g.font = `800 20px ${FONTE}`; g.fillText(String(l.desempenho), cx.des, m);
        g.fillStyle = COR.suave; g.font = `600 17px ${FONTE}`; g.fillText(`${l.participacao}/${total}`, cx.part, m);
        y += RH + RG;
      });
    }

    btn.disabled = false;
    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lider-ginasio-${mesSel}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  }

  async function iniciar() {
    Util.avisarSeSemEstilo();
    try {
      [eventos, jogadores] = await Promise.all([json('data/eventos.json'), json('data/jogadores.json')]);
    } catch (e) {
      const av = $('avisos'); av.hidden = false; av.textContent = e.message + ' Abra a página por um servidor (veja o README), não direto pelo arquivo.';
      return;
    }
    await carregarUltimosDecks();
    const meses = Util.mesesComDados(eventos);
    mesSel = Util.mesPadrao(meses, Util.mesAtual());
    const sel = $('mes');
    meses.forEach((m) => {
      const o = document.createElement('option');
      o.value = m; o.textContent = `${nomeMes(m)} ${m.slice(0, 4)}`;
      sel.append(o);
    });
    sel.addEventListener('change', () => { mesSel = sel.value; render(); });
    $('baixar').addEventListener('click', baixar);
    render();
  }
  iniciar();
})();
