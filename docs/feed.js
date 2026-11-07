/* Imagem de feed (1080 px de largura) de um evento: "top4" para postar e "completo" com todos os participantes.
   Desenha em canvas, sem biblioteca. Só roda no navegador (window.Feed). */
(function (root) {
  const COR = { preto: '#070707', chumbo: '#1E1E1E', rodape: '#111111', suave: '#A8A8A8', vermelho: '#E8513F', amarelo: '#EFD456',
    ouro: '#D4A537', prata: '#B8BEC6', bronze: '#B0703C' };
  const W = 1080, M = 64, FOOT = 127;
  const TITULO = '"Londrina Solid", Impact, "Arial Black", sans-serif';
  const TEXTO = 'Figtree, Arial, sans-serif';
  const corDaPos = (p) => (p === 1 ? COR.ouro : p === 2 ? COR.prata : COR.bronze);
  const ROTULO = { semanal: 'Semanal', especial: 'Especial', cup: 'Cup', challenge: 'Challenge' };

  const cacheImg = new Map();
  function carregar(src, cors) {
    return new Promise((ok, falha) => {
      const img = new Image();
      if (cors) img.crossOrigin = 'anonymous';
      img.onload = () => ok(img); img.onerror = () => falha(new Error(`Não consegui carregar ${src}.`));
      img.src = src;
    });
  }
  const imagem = (src) => { if (!cacheImg.has(src)) cacheImg.set(src, carregar(src, false).catch((e) => { cacheImg.delete(src); throw e; })); return cacheImg.get(src); };

  // Ícone de deck: cópia local em assets/decks (única que o canvas consegue exportar sem CORS), depois o Limitless, ou a imagem substituta.
  const cacheIcone = new Map();
  function icone(cfg, slug) {
    const k = slug || '';
    if (!cacheIcone.has(k)) {
      const tentativas = slug ? [() => carregar(`assets/decks/${slug}.png`, false), () => carregar(cfg.iconesBase + slug + (cfg.iconesExt || '.png'), true)] : [];
      const p = tentativas.reduce((acc, t) => acc.catch(t), Promise.reject(new Error('início')))
        .catch(() => carregar(Util.SUBSTITUTA, false));
      cacheIcone.set(k, p);
    }
    return cacheIcone.get(k);
  }

  // Ilustrações do cabeçalho: sorteia uma a cada download, sem repetir a anterior (lista em cabecalhos.js).
  const CHAVE_ULTIMO = 'xtcg-feed-cabecalho';
  async function cabecalhoSorteado() {
    for (const src of Cabecalhos.ordem(CHAVE_ULTIMO)) {
      try { const img = await imagem(src); Cabecalhos.lembrar(CHAVE_ULTIMO, src); return { img, src }; } catch (e) { /* arquivo ausente: tenta o próximo */ }
    }
    return { img: await imagem(Cabecalhos.PADRAO), src: Cabecalhos.PADRAO };
  }

  function ajustar(g, texto, fonte, tam, larg, min = 14) {
    let t = tam;
    g.font = fonte(t);
    while (t > min && g.measureText(texto).width > larg) { t -= 1; g.font = fonte(t); }
    return t;
  }
  const fT = (peso) => (t) => `${peso} ${t}px ${TEXTO}`;
  const fL = (t) => `900 ${t}px ${TITULO}`;
  function caixa(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function cobrir(g, img, x, y, w, h) { // object-fit: cover, ancorado à direita e ao topo
    const r = Math.max(w / img.width, h / img.height);
    const dw = img.width * r, dh = img.height * r;
    g.drawImage(img, x + w - dw, y, dw, dh);
  }

  function cabecalho(g, ctx) {
    const { arte, logoJogo, linha1, linha2, dataTxt } = ctx;
    // Linhas de ação no fundo, abaixo do cabeçalho.
    g.save(); g.beginPath(); g.rect(0, 490, W, 2000); g.clip(); g.strokeStyle = '#0F0F0F'; g.lineWidth = 2;
    for (let x = -3000; x < W + 3000; x += 26) { g.beginPath(); g.moveTo(x, 490); g.lineTo(x + 2000 * Math.tan(12 * Math.PI / 180) * -1, 2490); g.stroke(); }
    g.restore();
    // Faixa vermelha com a ilustração.
    g.save(); g.beginPath(); g.rect(0, 0, W, 550); g.clip();
    g.fillStyle = COR.vermelho; g.fillRect(0, -30, W, 580);
    cobrir(g, arte, -93, -11, 1249, 555);
    g.globalAlpha = 0.18; g.fillStyle = COR.amarelo;
    for (let y = 9; y < 550; y += 18) for (let x = 9; x < W; x += 18) { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
    g.globalAlpha = 0.9;
    let gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, '#070707'); gr.addColorStop(0.26, '#070707'); gr.addColorStop(0.42, 'rgba(7,7,7,.75)'); gr.addColorStop(0.64, 'rgba(7,7,7,0)');
    g.fillStyle = gr; g.fillRect(0, -30, W, 580);
    g.globalAlpha = 1;
    gr = g.createLinearGradient(0, -30, 0, 550);
    gr.addColorStop(0, 'rgba(7,7,7,0)'); gr.addColorStop(0.58, 'rgba(7,7,7,0)'); gr.addColorStop(0.8, 'rgba(7,7,7,.7)'); gr.addColorStop(1, '#070707');
    g.fillStyle = gr; g.fillRect(0, -30, W, 580);
    g.restore();

    const hl = 72; g.drawImage(logoJogo, M, 56, hl * logoJogo.width / logoJogo.height, hl);

    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const sombra = (cor, txt, x, y, dx, dy) => { g.fillStyle = '#070707'; g.fillText(txt, x + dx, y + dy); g.fillStyle = cor; g.fillText(txt, x, y); };
    if (ctx.compacto) { // título menor, colado na base do cabeçalho: sobretítulo (mês) + título
      const base = 478;
      let tt = 100; g.font = fL(tt); while (tt > 50 && g.measureText(linha2).width > 760) { tt -= 2; g.font = fL(tt); }
      sombra('#FFFFFF', linha2, M, base, 5, 5);
      const ys = base - tt * 0.82 - 14;
      g.font = fL(46);
      if ('letterSpacing' in g) g.letterSpacing = '3px';
      sombra(COR.vermelho, linha1, M, ys, 0, 3);
      if ('letterSpacing' in g) g.letterSpacing = '0px';
      return;
    }
    const maxW = 700;
    let t1 = 140; g.font = fL(t1); while (t1 > 60 && g.measureText(linha1).width > maxW) { t1 -= 2; g.font = fL(t1); }
    sombra('#FFFFFF', linha1, M, 164 + t1 * 0.85, 6, 6);
    let t2 = 68; g.font = fL(t2); while (t2 > 30 && g.measureText(linha2).width > maxW) { t2 -= 2; g.font = fL(t2); }
    const y2 = 164 + t1 * 0.85 + 6 + t2 * 0.9;
    sombra(COR.vermelho, linha2, M, y2, 0, 4);
    if (!dataTxt) return;
    // Chip da data.
    g.font = fL(44);
    const cw = g.measureText(dataTxt).width + 40, cy = y2 + 22;
    g.fillStyle = COR.vermelho; g.fillRect(M, cy, cw, 64);
    g.fillStyle = COR.amarelo; g.fillRect(M, cy + 64, cw, 8);
    g.fillStyle = '#FFFFFF'; g.textBaseline = 'middle'; g.fillText(dataTxt, M + 20, cy + 34);
    g.textBaseline = 'alphabetic';
  }

  function rodape(g, ctx, y) {
    g.fillStyle = COR.rodape; g.fillRect(0, y, W, FOOT);
    g.fillStyle = COR.vermelho; g.fillRect(0, y, W, 6);
    const lh = 53, lw = Math.round(ctx.logoXtcg.width * lh / ctx.logoXtcg.height);
    g.drawImage(ctx.logoXtcg, M, y + 6 + (FOOT - 6 - lh) / 2, lw, lh);
    const cy = y + 6 + (FOOT - 6) / 2;
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(M + lw + 20, cy - 18, 2, 36);
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#FFFFFF'; g.font = fT(700)(22);
    g.fillText('@xtcgcardshop', M + lw + 42, cy);
    g.textAlign = 'right'; g.fillStyle = COR.suave; g.font = fT(600)(22);
    g.fillText(ctx.rodapeDir, W - M, cy);
    g.textAlign = 'left';
  }

  function iconesDe(info) {
    if (!info) return null;
    if (info.deck) return { slugs: info.deck.icones.length ? info.deck.icones : [''], nome: info.deck.nome };
    return { slugs: [''], nome: info.texto };
  }
  async function carregarIcones(cfg, jogs) {
    const dist = new Set();
    jogs.forEach((j) => { const d = iconesDe(j.info); if (d) d.slugs.forEach((s) => dist.add(s)); });
    const mapa = new Map();
    await Promise.all([...dist].map(async (s) => mapa.set(s, await icone(cfg, s))));
    return mapa;
  }
  function desenharIcones(g, imgs, x, yBase, altura, larguraBox) {
    if (!imgs.length) return;
    const ws = imgs.map((im) => (im.width / im.height) * altura);
    const total = ws.reduce((a, b) => a + b, 0) + 4 * (imgs.length - 1);
    let cx = x + (larguraBox - total) / 2;
    g.save(); g.imageSmoothingEnabled = false;
    imgs.forEach((im, i) => { g.drawImage(im, cx, yBase - altura, ws[i], altura); cx += ws[i] + 4; });
    g.restore();
  }
  const pctTxt = (x) => (typeof x === 'number' ? x.toFixed(2).replace('.', ',') + '%' : '—');
  const n = (x) => (typeof x === 'number' ? x : '—');

  function cartao(g, j, y, h, mapa) {
    const x = M, w = W - 2 * M, cor = corDaPos(j.pos), primeiro = j.pos === 1;
    g.save();
    g.shadowColor = cor + '33'; g.shadowOffsetX = 8; g.shadowOffsetY = 8; g.shadowBlur = 12;
    caixa(g, x, y, w, h, 12); g.fillStyle = COR.chumbo; g.fill();
    g.restore();
    g.save(); caixa(g, x + 2, y + 2, w - 4, h - 4, 10); g.lineWidth = 4; g.strokeStyle = cor; g.stroke(); g.restore();
    g.save(); caixa(g, x + 4, y + 4, w - 8, h - 8, 8); g.clip();
    if (primeiro) { // faixa diagonal "CAMPEÃO"
      g.translate(x + 40, y + 40); g.rotate(-39 * Math.PI / 180);
      g.fillStyle = COR.ouro; g.fillRect(-82, -9, 165, 18);
      g.fillStyle = '#FFFFFF'; g.font = fT(800)(14); g.textAlign = 'center'; g.textBaseline = 'middle';
      if ('letterSpacing' in g) g.letterSpacing = '2px';
      g.fillText('CAMPEÃO', 0, 1);
      if ('letterSpacing' in g) g.letterSpacing = '0px';
    }
    g.restore();
    const cy = y + h / 2, x0 = x + 4 + 32;
    g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = cor; g.font = fL(68);
    g.fillText(`${j.pos}º`, x0 + 44, cy + 4);
    const d = iconesDe(j.info);
    const ih = primeiro ? 72 : 60;
    if (d) desenharIcones(g, d.slugs.map((s) => mapa.get(s)), x0 + 88 + 24, cy + ih / 2, ih, 140);
    const nx = x0 + 88 + 24 + 140 + 24, rightOw = x + w - 4 - 32;
    const vdeX = rightOw - 110 - 24 - 150; // bloco V/D/E (150 de largura)
    const maxNome = vdeX - 24 - nx + 10;
    g.textAlign = 'left';
    const tamNome = primeiro ? 34 : 30;
    g.fillStyle = '#FFFFFF'; ajustar(g, j.nome.toUpperCase(), fT(700), tamNome, maxNome, 20);
    const dy = d ? 20 : 0;
    g.fillText(j.nome.toUpperCase(), nx, cy - (d ? 14 : 0) + (d ? 0 : 0));
    if (d) { g.fillStyle = COR.suave; ajustar(g, d.nome, fT(600), 22, maxNome, 14); g.fillText(d.nome, nx, cy + 22); }
    // V/D/E
    g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    const rest = `/${n(j.d)}/${n(j.e)}`;
    g.font = fT(700)(34); const wr = g.measureText(rest).width;
    g.fillStyle = COR.suave; g.fillText(rest, vdeX + 150, cy + 24);
    g.font = fL(68); g.fillStyle = '#FFFFFF'; g.fillText(String(n(j.v)), vdeX + 150 - wr - 4, cy + 24);
    // Opp Win
    g.textBaseline = 'middle';
    g.font = fT(700)(20); g.fillStyle = COR.suave; g.fillText('Opp Win', rightOw, cy - 16);
    g.font = fT(700)(26); g.fillStyle = '#FFFFFF'; g.fillText(pctTxt(j.ow), rightOw, cy + 16);
    g.textAlign = 'left';
  }

  function linhaCompleta(g, j, y, h, i, mapa, x = M, w = W - 2 * M) {
    const cor = j.pos <= 4 ? corDaPos(j.pos) : null;
    caixa(g, x, y, w, h, 10); g.fillStyle = i % 2 ? COR.rodape : COR.chumbo; g.fill();
    if (cor) { g.save(); caixa(g, x, y, w, h, 10); g.clip(); g.fillStyle = cor; g.fillRect(x, y, 8, h); g.restore(); }
    const cy = y + h / 2;
    g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = cor || COR.suave; g.font = fL(44);
    g.fillText(`${j.pos}º`, x + 70, cy + 3);
    const d = iconesDe(j.info);
    desenharIcones(g, d ? d.slugs.map((s) => mapa.get(s)) : [], x + 124, cy + 22, 44, 112);
    g.textAlign = 'left';
    const nx = x + 252, rightOw = x + w - 28, vdeDir = rightOw - 120;
    const maxNome = vdeDir - 150 - nx;
    g.fillStyle = '#FFFFFF'; ajustar(g, j.nome, fT(700), 28, maxNome, 18);
    g.fillText(j.nome, nx, cy - (d ? 13 : 0));
    if (d) { g.fillStyle = COR.suave; ajustar(g, d.nome, fT(600), 20, maxNome, 14); g.fillText(d.nome, nx, cy + 17); }
    g.textAlign = 'right'; g.font = fT(700)(26); g.fillStyle = '#FFFFFF';
    g.fillText(`${n(j.v)}-${n(j.d)}-${n(j.e)}`, vdeDir, cy);
    g.fillStyle = COR.suave; g.font = fT(700)(24); g.fillText(pctTxt(j.ow), rightOw, cy);
    g.textAlign = 'left';
  }


  // Stories 9:16: tela fixa de 1080×1920. Até 15 linhas cabem em uma coluna; acima disso, duas colunas.
  const H916 = 1920, TOPO = 501 + 56, MAXLIN = 15;
  function disposicao(n) {
    const livre = H916 - FOOT - 40 - TOPO;
    if (n <= MAXLIN) return { cols: 1, porCol: n, passo: Math.max(40, Math.min(84, Math.floor(livre / Math.max(n, 1)))), x: [M], w: W - 2 * M };
    const porCol = Math.ceil(n / 2), gap = 16, w = (W - 2 * M - gap) / 2;
    return { cols: 2, porCol, passo: Math.max(40, Math.min(92, Math.floor(livre / porCol))), x: [M, M + w + gap], w };
  }
  // Percorre as linhas por coluna (coluna 1 = primeiras posições) e entrega x, y e largura.
  function desenharGrade(g, lista, lay, desenha) {
    lista.forEach((it, i) => {
      const col = Math.floor(i / lay.porCol), r = i % lay.porCol;
      desenha(it, i, lay.x[col], TOPO + r * lay.passo, lay.w, lay.passo - 8);
    });
  }
  function cabecalhoColunas(g, lay, esq, dirA, dirB) {
    g.fillStyle = COR.suave; g.font = fT(600)(lay.cols === 1 ? 20 : 17); g.textBaseline = 'middle';
    lay.x.forEach((x) => {
      g.textAlign = 'left'; g.fillText(esq, x + 8, 501 + 20);
      if (lay.cols === 1) {
        g.textAlign = 'right'; g.fillText(dirA, x + lay.w - 28 - (dirB === 'Opp Win' ? 120 : 150), 501 + 20); g.fillText(dirB, x + lay.w - 28, 501 + 20);
      } else { g.textAlign = 'right'; g.fillText(dirA + ' · ' + dirB, x + lay.w - 14, 501 + 20); }
    });
    g.textAlign = 'left';
  }

  function linhaCompletaMini(g, j, y, h, i, mapa, x, w) {
    const cor = j.pos <= 4 ? corDaPos(j.pos) : null;
    caixa(g, x, y, w, h, 8); g.fillStyle = i % 2 ? COR.rodape : COR.chumbo; g.fill();
    if (cor) { g.save(); caixa(g, x, y, w, h, 8); g.clip(); g.fillStyle = cor; g.fillRect(x, y, 6, h); g.restore(); }
    const cy = y + h / 2;
    g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = cor || COR.suave; g.font = fL(32);
    g.fillText(`${j.pos}º`, x + 36, cy + 2);
    const d = iconesDe(j.info);
    desenharIcones(g, d ? d.slugs.map((s) => mapa.get(s)) : [], x + 68, cy + 15, 30, 68);
    g.textAlign = 'left';
    const nx = x + 142, rightX = x + w - 14, maxNome = rightX - 86 - nx;
    g.fillStyle = '#FFFFFF'; ajustar(g, j.nome, fT(700), 21, maxNome, 13);
    g.fillText(j.nome, nx, cy - (d ? 10 : 0));
    if (d) { g.fillStyle = COR.suave; ajustar(g, d.nome, fT(600), 15, maxNome, 11); g.fillText(d.nome, nx, cy + 12); }
    g.textAlign = 'right'; g.fillStyle = '#FFFFFF'; g.font = fT(700)(21);
    g.fillText(`${n(j.v)}-${n(j.d)}-${n(j.e)}`, rightX, cy - 10);
    g.fillStyle = COR.suave; g.font = fT(700)(16); g.fillText(pctTxt(j.ow), rightX, cy + 12);
    g.textAlign = 'left';
  }

  function linhaPontosMini(g, l, y, h, i, total, av, x, w) {
    const cor = l.pos <= 3 ? corDaPos(l.pos) : null;
    caixa(g, x, y, w, h, 8); g.fillStyle = i % 2 ? COR.rodape : COR.chumbo; g.fill();
    if (cor) { g.save(); caixa(g, x, y, w, h, 8); g.clip(); g.fillStyle = cor; g.fillRect(x, y, 6, h); g.restore(); }
    const cy = y + h / 2, tam = Math.min(44, h - 8);
    g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = cor || COR.suave; g.font = fL(32);
    g.fillText(`${l.pos}º`, x + 36, cy + 2);
    let nx = x + 70;
    if (av) { g.save(); g.imageSmoothingEnabled = false; g.drawImage(av, x + 62, cy - tam / 2, tam, tam); g.restore(); nx = x + 62 + tam + 10; }
    const rightX = x + w - 14;
    g.textAlign = 'left'; g.fillStyle = '#FFFFFF'; ajustar(g, l.nome, fT(700), 21, rightX - 96 - nx, 13);
    g.fillText(l.nome, nx, cy);
    g.textAlign = 'right'; g.font = fL(34); g.fillStyle = '#FFFFFF';
    const pts = String(l.pontos); g.fillText(pts, rightX - 30 - 0, cy - 9);
    const wp = g.measureText(pts).width;
    g.font = fT(600)(14); g.fillStyle = COR.suave; g.fillText('pts', rightX, cy - 7);
    g.font = fT(700)(16); g.fillText(`${l.participacao}/${total}`, rightX, cy + 15);
    g.textAlign = 'left';
  }

  // opcoes: { evento, linhas, decks (Map chave → {texto, deck}), chaveDe (nome → chave), cfgDecks, modo: 'top4' | 'completo', tipo }
  async function gerar(o) {
    try { await Promise.all([document.fonts.load('900 100px "Londrina Solid"'), document.fonts.load('700 30px Figtree'), document.fonts.load('600 20px Figtree')]); } catch (e) { /* usa a fonte reserva */ }
    const [cab, logoJogo, logoXtcg] = await Promise.all([cabecalhoSorteado(), imagem('assets/logo-pokemon-tcg.png'), imagem('assets/logo.png')]);
    const arte = cab.img;
    const tipo = o.tipo || 'semanal';
    const todos = o.linhas.map((l) => ({ ...l, info: o.decks ? o.decks.get(o.chaveDe(l.impresso)) : null }));
    const jogs = o.modo === 'top4' ? todos.slice(0, 4) : todos;
    const mapa = await carregarIcones(o.cfgDecks, jogs);
    const [, mm, dd] = o.evento.data.split('-');
    const yy = o.evento.data.slice(2, 4);
    const nomeUp = String(o.evento.nome || '').toUpperCase();
    const ctx = {
      arte, logoJogo, logoXtcg, dataTxt: `${dd}.${mm}.${yy}`,
      linha1: o.modo === 'top4' ? 'TOP 4' : (tipo === 'semanal' ? 'SEMANAL' : (ROTULO[tipo] || tipo).toUpperCase()),
      linha2: o.modo === 'top4' ? (tipo === 'semanal' ? 'SEMANAL' : nomeUp) : (tipo === 'semanal' ? 'RESULTADO COMPLETO' : nomeUp),
      rodapeDir: `${ROTULO[tipo] || tipo} · ${todos.length} participantes`,
    };

    let H;
    if (o.modo === 'top4') H = 1350; else H = H916;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = COR.preto; g.fillRect(0, 0, W, H);
    cabecalho(g, ctx);

    if (o.modo === 'top4') {
      let y = 501;
      jogs.forEach((j, i) => { const h = i === 0 ? 176 : 148; cartao(g, j, y, h, mapa); y += h + 20; });
    } else {
      const lay = disposicao(jogs.length);
      cabecalhoColunas(g, lay, lay.cols === 1 ? 'Posição · Deck · Jogador' : 'Pos · Deck · Jogador', 'V-D-E', 'Opp Win');
      desenharGrade(g, jogs, lay, (j, i, x, y, w, h) => {
        if (lay.cols === 1) linhaCompleta(g, j, y, h, i, mapa, x, w); else linhaCompletaMini(g, j, y, h, i, mapa, x, w);
      });
    }
    rodape(g, ctx, H - FOOT);
    return paraBlob(c, cab.src);
  }

  function linhaPontos(g, l, y, h, i, total, av, x = M, w = W - 2 * M) {
    const cor = l.pos <= 3 ? corDaPos(l.pos) : null;
    caixa(g, x, y, w, h, 10); g.fillStyle = i % 2 ? COR.rodape : COR.chumbo; g.fill();
    if (cor) { g.save(); caixa(g, x, y, w, h, 10); g.clip(); g.fillStyle = cor; g.fillRect(x, y, 8, h); g.restore(); }
    const cy = y + h / 2;
    g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = cor || COR.suave; g.font = fL(44);
    g.fillText(`${l.pos}º`, x + 70, cy + 3);
    g.textAlign = 'left'; g.fillStyle = '#FFFFFF';
    let nx = x + 140; const partX = x + w - 28, ptsX = partX - 150;
    if (av) { g.save(); g.imageSmoothingEnabled = false; g.drawImage(av, x + 124, y + (h - 60) / 2, 60, 60); g.restore(); nx = x + 196; }
    ajustar(g, l.nome, fT(700), 30, ptsX - 150 - nx, 18);
    g.fillText(l.nome, nx, cy);
    g.textAlign = 'right'; g.font = fT(600)(22); g.fillStyle = COR.suave;
    g.fillText('pts', ptsX, cy + 4);
    const wp = g.measureText('pts').width;
    g.font = fL(50); g.fillStyle = '#FFFFFF';
    g.fillText(String(l.pontos), ptsX - wp - 10, cy + 4);
    g.font = fT(700)(26); g.fillStyle = COR.suave; g.fillText(`${l.participacao}/${total}`, partX, cy);
    g.textAlign = 'left';
  }

  // Classificação do Líder de Ginásio. o: { linha1, linha2, chip, linhas: [{ pos, nome, pontos, participacao }], total, rodapeDir }
  async function classificacao(o) {
    try { await Promise.all([document.fonts.load('900 100px "Londrina Solid"'), document.fonts.load('700 30px Figtree'), document.fonts.load('600 20px Figtree')]); } catch (e) { /* usa a fonte reserva */ }
    const [cab, logoJogo, logoXtcg] = await Promise.all([cabecalhoSorteado(), imagem('assets/logo-pokemon-tcg.png'), imagem('assets/logo.png')]);
    const arte = cab.img;
    const ctx = { arte, logoJogo, logoXtcg, dataTxt: o.chip, linha1: o.linha1, linha2: o.linha2, rodapeDir: o.rodapeDir, compacto: true };
    const avatares = new Map();
    await Promise.all([...new Set(o.linhas.map((l) => l.avatar).filter(Boolean))].map(async (s) => {
      try { avatares.set(s, await imagem(`assets/avatares/${s}.png`)); } catch (e) { /* sem avatar: a linha sai só com o nome */ }
    }));
    const H = H916;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = COR.preto; g.fillRect(0, 0, W, H);
    cabecalho(g, ctx);
    const lay = disposicao(o.linhas.length);
    cabecalhoColunas(g, lay, 'Posição · Jogador', 'Pontos', 'Participações');
    desenharGrade(g, o.linhas, lay, (l, i, x, y, w, h) => {
      if (lay.cols === 1) linhaPontos(g, l, y, h, i, o.total, avatares.get(l.avatar), x, w); else linhaPontosMini(g, l, y, h, i, o.total, avatares.get(l.avatar), x, w);
    });
    rodape(g, ctx, H - FOOT);
    return paraBlob(c, cab.src);
  }

  // PNG do canvas, marcado com o nome da ilustração sorteada (ex.: "team-rocket"), que entra no nome do arquivo.
  function paraBlob(c, src) {
    return new Promise((ok, falha) => c.toBlob((b) => {
      if (!b) return falha(new Error('Não consegui gerar a imagem.'));
      b.cabecalho = String(src).split('/').pop().replace(/\.[a-z]+$/i, '');
      ok(b);
    }, 'image/png'));
  }

  function baixar(blob, nome) {
    if (blob.cabecalho) nome = nome.replace(/\.png$/i, `-${blob.cabecalho}.png`);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  root.Feed = { gerar, classificacao, baixar };
})(window);
