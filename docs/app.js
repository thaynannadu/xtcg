(function () {
  const $ = (id) => document.getElementById(id);
  let eventos = [], jogadores = [], mesSel = '', avatarDe = new Map();
  const MOSTRAR_AVISOS = new URLSearchParams(location.search).has('avisos');

  const { nomeMes, plural, dataCurta, dataBarra, json, mesDe } = Util;
  const totalDoMes = () => Util.totalSemanais(eventos, mesSel);

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

  // Avatar pixel art do jogador neste mês (sorteado em avatares.js).
  function avatarImg(nome, classe) {
    const slug = avatarDe.get(nome);
    if (!slug) return null;
    const img = document.createElement('img'); img.className = classe; img.src = Avatares.caminho(slug); img.alt = ''; img.width = 80; img.height = 80;
    img.setAttribute('aria-hidden', 'true'); img.addEventListener('error', () => img.remove());
    return img;
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
      pts.append(forte, ' pts');
      const part = document.createElement('p'); part.className = 'part';
      const tot = totalDoMes();
      part.textContent = `${l.participacao}/${tot}`; part.title = `${plural(l.participacao, 'participação', 'participações')} em ${plural(tot, 'semanal', 'semanais')}`;
      const av = avatarImg(l.nome, 'avatar-podio');
      li.append(...(av ? [av] : []), pos, h, pts, part);

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
      const tdAv = document.createElement('td'); tdAv.className = 'c-av';
      const av = avatarImg(l.nome, 'avatar-mini'); if (av) tdAv.append(av);
      nome.append(b);
      const d = document.createElement('td'); d.className = 'des'; d.textContent = l.desempenho;
      const p = document.createElement('td'); p.textContent = `${l.participacao}/${total}`;
      tr.append(pos, tdAv, nome, d, p);
      corpo.append(tr);

      let det = null;
      const alternar = () => {
        if (det) { det.remove(); det = null; b.setAttribute('aria-expanded', 'false'); return; }
        det = document.createElement('tr'); det.className = 'detalhe';
        const td = document.createElement('td'); td.colSpan = 5;
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
    $('titulo').textContent = 'Líder de Ginásio';
    $('subtitulo').textContent = `${nomeMes(mesSel)} · ${plural(r.eventos.length, 'semanal contabilizado', 'semanais contabilizados')}`;
    $('mes').value = mesSel;

    avatarDe = Avatares.atribuir(mesSel, r.tabela.map((l) => l.nome));
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

  /* ---------- Imagem exportada (mesmo padrão das imagens do feed) ---------- */
  async function baixar() {
    const btn = $('baixar'); btn.disabled = true;
    try {
      const r = resultado(), total = totalDoMes();
      const blob = await Feed.classificacao({
        linha1: `${nomeMes(mesSel).split(' ')[0]} ${mesSel.slice(0, 4)}`.toUpperCase(), linha2: 'LÍDER DE GINÁSIO',
        linhas: r.tabela.map((l, i) => ({ pos: i + 1, nome: l.nome, pontos: l.desempenho, participacao: l.participacao, avatar: avatarDe.get(l.nome) })), total,
        rodapeDir: `${plural(r.eventos.length, 'semanal', 'semanais')} · ${plural(r.tabela.length, 'jogador', 'jogadores')}`,
      });
      Feed.baixar(blob, `lider-ginasio-${mesSel}.png`);
    } catch (e) { alert(e.message); }
    btn.disabled = resultado().tabela.length === 0;
  }

  async function iniciar() {
    Util.avisarSeSemEstilo();
    try {
      [eventos, jogadores] = await Promise.all([json('data/eventos.json'), json('data/jogadores.json')]);
      eventos = eventos.filter(XTCG.ehSemanal);   // cups, challenges e especiais não somam no Líder
    } catch (e) {
      const av = $('avisos'); av.hidden = false; av.textContent = e.message + ' Abra a página por um servidor (veja o README), não direto pelo arquivo.';
      return;
    }
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
