(function () {
  const $ = (id) => document.getElementById(id);
  let eventos = [], jogadores = [], logo = null;

  const nomeMes = (ym) => {
    const [a, m] = ym.split('-').map(Number);
    const n = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
  const dataCurta = (iso) => iso.slice(8, 10) + '.' + iso.slice(5, 7);

  async function json(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Não consegui carregar ${url} (${r.status}).`);
    return r.json();
  }

  function mesAtual() { return $('mes').value; }

  function resultado() {
    const mes = mesAtual();
    return XTCG.calcular(eventos.filter((e) => e.data.startsWith(mes)), jogadores);
  }

  function render() {
    const mes = mesAtual();
    const r = resultado();
    $('titulo').textContent = `Líder de Ginásio - ${nomeMes(mes)}`;

    const corpo = $('tabela').tBodies[0];
    corpo.replaceChildren();
    r.tabela.forEach((l, i) => {
      const tr = document.createElement('tr');
      const pos = document.createElement('td'); pos.textContent = `${i + 1}º`;
      const nome = document.createElement('td'); nome.className = 'nome';
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = l.nome; b.setAttribute('aria-expanded', 'false');
      nome.append(b);
      const d = document.createElement('td'); d.textContent = l.desempenho;
      const p = document.createElement('td'); p.textContent = l.participacao;
      tr.append(pos, nome, d, p);
      corpo.append(tr);

      let det = null;
      b.addEventListener('click', () => {
        if (det) { det.remove(); det = null; b.setAttribute('aria-expanded', 'false'); return; }
        det = document.createElement('tr'); det.className = 'detalhe';
        const td = document.createElement('td'); td.colSpan = 4;
        const ul = document.createElement('ul');
        l.detalhes.forEach((x) => {
          const li = document.createElement('li');
          li.textContent = `${dataCurta(x.data)}: ${x.pos}º de ${x.de} = ${x.pontos} pontos`;
          ul.append(li);
        });
        td.append(ul);
        if (l.nota) { const n = document.createElement('p'); n.className = 'nota'; n.textContent = l.nota; td.append(n); }
        det.append(td); tr.after(det);
        b.setAttribute('aria-expanded', 'true');
      });
    });

    $('vazio').hidden = r.tabela.length > 0;
    $('tabela').parentElement.hidden = r.tabela.length === 0;

    const ul = $('lista-semanais'); ul.replaceChildren();
    r.eventos.forEach((e) => {
      const li = document.createElement('li');
      li.textContent = `${dataCurta(e.data)} (${e.jogadores.length} jogadores)`;
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

  function baixar() {
    const mes = mesAtual();
    const r = resultado();
    const W = 739, S = 2, RH = 22, TITULO = 100;
    const logoH = Math.round((logo.naturalHeight * W) / logo.naturalWidth);
    const H = logoH + TITULO + RH * (r.tabela.length + 1) + 2;
    const c = document.createElement('canvas');
    c.width = W * S; c.height = H * S;
    const g = c.getContext('2d');
    g.scale(S, S);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.drawImage(logo, 0, 0, W, logoH);

    g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 28px "Arial Black", "Helvetica Neue", Arial, sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = '2px';
    g.fillText(`Líder de Ginásio - ${nomeMes(mes)}`, W / 2, logoH + TITULO / 2);
    if ('letterSpacing' in g) g.letterSpacing = '0px';

    const xs = [0, 88, 294, 516, 738];
    const linha = (y, vals) => {
      g.font = 'bold 15px "Helvetica Neue", Arial, sans-serif';
      vals.forEach((v, i) => g.fillText(String(v), (xs[i] + xs[i + 1]) / 2, y + RH / 2 + 1));
      g.strokeStyle = '#000'; g.lineWidth = 1;
      g.strokeRect(0.5, y + 0.5, W - 1, RH);
      xs.slice(1, -1).forEach((x) => { g.beginPath(); g.moveTo(x + 0.5, y); g.lineTo(x + 0.5, y + RH); g.stroke(); });
    };
    let y = logoH + TITULO;
    linha(y, ['Posição', 'Nome', 'Pontos de desempenho', 'Pontos de Participação']);
    r.tabela.forEach((l, i) => { y += RH; linha(y, [`${i + 1}º`, l.nome, l.desempenho, l.participacao]); });

    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lider-ginasio-${mes}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  }

  async function iniciar() {
    try {
      [eventos, jogadores] = await Promise.all([json('data/eventos.json'), json('data/jogadores.json')]);
      logo = new Image();
      await new Promise((ok, erro) => { logo.onload = ok; logo.onerror = () => erro(new Error('Não achei assets/logo.png.')); logo.src = 'assets/logo.png'; });
    } catch (e) {
      const av = $('avisos'); av.hidden = false; av.textContent = e.message + ' Abra a página por um servidor (veja o README), não direto pelo arquivo.';
      return;
    }
    const meses = [...new Set(eventos.map((e) => e.data.slice(0, 7)))].sort().reverse();
    const sel = $('mes');
    meses.forEach((m) => { const o = document.createElement('option'); o.value = m; o.textContent = `${nomeMes(m)} de ${m.slice(0, 4)}`; sel.append(o); });
    sel.addEventListener('change', render);
    $('baixar').addEventListener('click', baixar);
    render();
  }
  iniciar();
})();
