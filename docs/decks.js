/* Decks dos semanais: lê o texto escrito à mão e reconhece qual deck é.
   Funciona no navegador (window.Decks) e no Node (require). */
(function (root) {
  const RUIDO = new Set(['ex', 'deck', 'de', 'do', 'da', 'e']);

  function norm(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const palavrasDe = (s) => norm(s).split(' ').filter((t) => t && !RUIDO.has(t));

  // Prepara a lista de decks (decks.json) para a busca.
  function montarRegistro(decks) {
    return decks.map((d) => {
      const base = d.palavras && d.palavras.length ? d.palavras : (d.icones || []).flatMap((i) => i.split('-'));
      return {
        nome: d.nome,
        icones: d.icones || [],
        palavras: [...new Set(base.flatMap(palavrasDe))],
        aliases: (d.aliases || []).map((a) => palavrasDe(a).join(' ')).filter(Boolean),
        nomeNorm: palavrasDe(d.nome).join(' '),
      };
    });
  }

  // Descobre qual deck do registro o texto descreve (ou null).
  function identificar(texto, registro) {
    const t = palavrasDe(texto);
    if (!t.length) return null;
    const conjunto = new Set(t);
    const frase = ' ' + t.join(' ') + ' ';
    let melhor = null, melhorPontos = 0;
    for (const d of registro) {
      let p = 0;
      if (d.nomeNorm && d.nomeNorm === t.join(' ')) p = 1000;
      if (d.palavras.length && d.palavras.every((w) => conjunto.has(w))) p = Math.max(p, d.palavras.length * 10);
      for (const a of d.aliases) if (frase.includes(' ' + a + ' ')) p = Math.max(p, a.split(' ').length * 10 + 5);
      if (p > melhorPontos) { melhorPontos = p; melhor = d; }
    }
    return melhor;
  }

  function dataDe(s) {
    const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[0];
    const br = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
    if (!br) return null;
    const ano = br[3].length === 2 ? '20' + br[3] : br[3];
    return `${ano}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }

  // Lê o decks.txt: "# 2026-10-22" abre um semanal e cada linha seguinte é "Jogador: deck".
  function lerTexto(texto) {
    const blocos = [], erros = [];
    let atual = null;
    String(texto).split(/\r?\n/).forEach((bruta, i) => {
      const linha = bruta.trim();
      if (!linha || linha.startsWith('//')) return;
      if (linha.startsWith('#')) {
        const data = dataDe(linha);
        if (data) { atual = { data, linhas: [] }; blocos.push(atual); }
        else erros.push(`Linha ${i + 1}: não entendi a data em "${linha}".`);
        return;
      }
      if (!atual) { erros.push(`Linha ${i + 1}: "${linha}" está antes de qualquer data (# AAAA-MM-DD).`); return; }
      const semPosicao = linha.replace(/^\d+\s*[º°.)]\s*/, '');
      const m = /\s*(?::|\t|\s[-–—|]\s)\s*/.exec(semPosicao);
      if (!m) { erros.push(`Linha ${i + 1}: use "Jogador: deck" (faltou o separador em "${linha}").`); return; }
      const jogador = semPosicao.slice(0, m.index).trim();
      const deck = semPosicao.slice(m.index + m[0].length).trim();
      if (!jogador || !deck) { erros.push(`Linha ${i + 1}: faltou o nome ou o deck em "${linha}".`); return; }
      atual.linhas.push({ jogador, deck });
    });
    return { blocos, erros };
  }

  const API = { norm, montarRegistro, identificar, lerTexto };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Decks = API;
})(typeof window !== 'undefined' ? window : globalThis);
