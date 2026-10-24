(function () {
  const $ = (id) => document.getElementById(id);
  let eventos = [], jogadores = [], logo = null, arte = null, mesSel = '';

  const nomeMes = (ym) => {
    const [a, m] = ym.split('-').map(Number);
    const n = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
  const dataCurta = (iso) => iso.slice(8, 10) + '.' + iso.slice(5, 7);
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  async function json(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Não consegui carregar ${url} (${r.status}).`);
    return r.json();
  }
  function imagem(src) {
    return new Promise((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error(`Não achei ${src}.`));
      i.src = src;
    });
  }

  function resultado() {
    return XTCG.calcular(eventos.filter((e) => e.data.startsWith(mesSel)), jogadores);
  }

  function listaDetalhes(l) {
    const ul = document.createElement('ul');
    ul.className = 'det';
    l.detalhes.forEach((x) => {
      const li = document.createElement('li');
      li.textContent = `${dataCurta(x.data)}: ${x.pos}º de ${x.de} = ${x.pontos} pontos`;
      ul.append(li);
    });
    return ul;
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
      const pts = document.createElement('p'); pts.className = 'pts';
      const forte = document.createElement('strong'); forte.textContent = l.desempenho;
      pts.append(forte, 'pontos de desempenho');
      const part = document.createElement('p'); part.className = 'part';
      part.textContent = plural(l.participacao, 'participação', 'participações');
      li.append(pos, h, pts, part);

      let det = null;
      b.addEventListener('click', () => {
        if (det) { det.remove(); det = null; b.setAttribute('aria-expanded', 'false'); return; }
        det = listaDetalhes(l); li.append(det); b.setAttribute('aria-expanded', 'true');
      });
      ol.append(li);
    });
  }

  function renderResto(resto) {
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
      const p = document.createElement('td'); p.textContent = l.participacao;
      tr.append(pos, nome, d, p);
      corpo.append(tr);

      let det = null;
      b.addEventListener('click', () => {
        if (det) { det.remove(); det = null; b.setAttribute('aria-expanded', 'false'); return; }
        det = document.createElement('tr'); det.className = 'detalhe';
        const td = document.createElement('td'); td.colSpan = 4;
        const ul = listaDetalhes(l); ul.className = '';
        td.append(ul); det.append(td); tr.after(det);
        b.setAttribute('aria-expanded', 'true');
      });
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

  function caixa(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
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

    const aw = Math.round(w * 0.6), esc = aw / arte.naturalWidth, ah = arte.naturalHeight * esc;
    const off = document.createElement('canvas');
    off.width = aw * 2; off.height = h * 2;
    const o = off.getContext('2d'); o.scale(2, 2);
    o.drawImage(arte, 0, -(ah - h) * 0.2, aw, ah);
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

  const CARD_H = 188, K1 = 1.1;

  function desenharCard(g, l, lugar, x, yBase, cw) {
    const k = lugar === 1 ? K1 : 1, ch = CARD_H * k, y = yBase - ch;
    const [c1, c2] = GRAD[lugar];
    g.save();
    g.translate(x, y); g.scale(k, k);
    const w = cw / k, h = CARD_H;
    if (lugar === 1) { g.shadowColor = 'rgba(239,212,86,.28)'; g.shadowBlur = 30; }
    caixa(g, 0, 0, w, h, 22); g.fillStyle = COR.preto; g.fill();
    g.shadowBlur = 0; g.shadowColor = 'transparent';
    caixa(g, 1.5, 1.5, w - 3, h - 3, 21); g.lineWidth = 3; g.strokeStyle = degrade(g, 0, 0, w, h, [c1, c2]); g.stroke();

    g.textAlign = 'left'; g.textBaseline = 'top';
    g.font = `800 38px ${FONTE}`; g.fillStyle = degrade(g, 20, 0, 20 + 56, 48, [c1, c2]); g.fillText(`${lugar}º`, 20, 14);
    g.fillStyle = '#fff'; ajustar(g, l.nome, 800, 23, w - 40); g.fillText(l.nome, 20, 62);
    g.font = `800 50px ${FONTE}`; g.fillText(String(l.desempenho), 20, 90);
    g.font = `500 14px ${FONTE}`; g.fillStyle = COR.suave;
    g.fillText('pontos de desempenho', 20, 148);
    g.fillText(plural(l.participacao, 'participação', 'participações'), 20, 166);
    g.restore();
  }

  async function baixar() {
    try { await Promise.all([document.fonts.load(`800 40px Figtree`), document.fonts.load(`500 20px Figtree`)]); } catch (e) { /* segue com a fonte reserva */ }
    const r = resultado();
    const top = r.tabela.slice(0, 3), resto = r.tabela.slice(3);
    const W = 1080, S = 2, M = 40, IN = W - 2 * M, BH = 300, GAP = 20, CW = (IN - 2 * GAP) / 3;
    const RH = 38, RG = 4, HH = 28;
    const podioH = top.length ? CARD_H * K1 : 0;
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
      const xs = { 1: M + CW + GAP, 2: M, 3: M + 2 * (CW + GAP) };
      top.forEach((l, i) => desenharCard(g, l, i + 1, xs[i + 1], base, CW));
      y = base;
    }
    if (resto.length) {
      y += 20;
      g.textBaseline = 'middle'; g.fillStyle = COR.suave; g.font = `600 14px ${FONTE}`;
      const cx = { pos: M + 32, nome: M + 120, des: M + 660, part: M + 890 };
      g.textAlign = 'left'; g.fillText('Posição', cx.pos, y + HH / 2); g.fillText('Nome', cx.nome, y + HH / 2);
      g.textAlign = 'center'; g.fillText('Pontos de desempenho', cx.des, y + HH / 2); g.fillText('Pontos de participação', cx.part, y + HH / 2);
      y += HH;
      resto.forEach((l, i) => {
        caixa(g, M, y, IN, RH, 12); g.fillStyle = i % 2 ? COR.chumbo : COR.preto; g.fill();
        const m = y + RH / 2 + 1;
        g.textAlign = 'left'; g.fillStyle = COR.suave; g.font = `700 17px ${FONTE}`; g.fillText(`${i + 4}º`, cx.pos, m);
        g.fillStyle = '#fff'; ajustar(g, l.nome, 700, 19, 400); g.fillText(l.nome, cx.nome, m);
        g.textAlign = 'center'; g.font = `800 20px ${FONTE}`; g.fillText(String(l.desempenho), cx.des, m);
        g.fillStyle = COR.suave; g.font = `600 17px ${FONTE}`; g.fillText(String(l.participacao), cx.part, m);
        y += RH + RG;
      });
    }

    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lider-ginasio-${mesSel}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  }

  function avisarSeSemEstilo() {
    if (getComputedStyle(document.documentElement).getPropertyValue('--preto').trim()) return;
    const p = document.createElement('p');
    p.setAttribute('style', 'background:#fff3c4;color:#000;padding:12px;margin:0;font:16px sans-serif');
    p.textContent = 'O arquivo style.css não foi carregado. Confira se ele está na mesma pasta do index.html e do semanais.html, com esse nome exato (sem "(1)" no final).';
    document.body.prepend(p);
  }

  async function iniciar() {
    avisarSeSemEstilo();
    try {
      [eventos, jogadores] = await Promise.all([json('data/eventos.json'), json('data/jogadores.json')]);
      [logo, arte] = await Promise.all([imagem('assets/logo.png'), imagem('assets/banner.jpg')]);
    } catch (e) {
      const av = $('avisos'); av.hidden = false; av.textContent = e.message + ' Abra a página por um servidor (veja o README), não direto pelo arquivo.';
      return;
    }
    const hoje = new Date();
    const atual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    // O mês atual sempre está na lista e começa selecionado, mesmo sem semanal registrado ainda.
    const meses = [...new Set([...eventos.map((e) => e.data.slice(0, 7)), atual])].sort().reverse();
    mesSel = atual;
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
