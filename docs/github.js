/* Cliente mínimo da API do GitHub para a área de administração.
   Lê os arquivos de docs/data e publica várias alterações num único commit. */
(function (root) {
  const dec = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

  function criarCliente({ token, owner, repo, branch, pasta }) {
    const base = `https://api.github.com/repos/${owner}/${repo}`;
    const dir = (pasta || 'docs/data').replace(/^\/|\/$/g, '');

    async function req(caminho, opcoes) {
      let r;
      try {
        r = await fetch(base + caminho, Object.assign({
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
        }, opcoes));
      } catch (e) { throw new Error('Sem conexão com o GitHub. Verifique a internet.'); }
      if (r.ok) return r.status === 204 ? null : r.json();
      let detalhe = '';
      try { detalhe = (await r.json()).message || ''; } catch (e) { /* sem corpo */ }
      if (r.status === 401) throw new Error('Token inválido ou expirado. Gere outro e conecte de novo.');
      if (r.status === 403) throw new Error(`O GitHub recusou (403). O token precisa de permissão "Contents: Read and write" neste repositório. ${detalhe}`);
      if (r.status === 404) throw new Error('Repositório, branch ou arquivo não encontrado. Confira usuário/repositório/branch (e se o token enxerga este repositório).');
      if (r.status === 422 || r.status === 409) throw new Error(`Conflito: o repositório mudou enquanto você editava. Recarregue os dados e tente de novo. ${detalhe}`);
      throw new Error(`Erro do GitHub (${r.status}). ${detalhe}`);
    }

    const post = (c, corpo) => req(c, { method: 'POST', body: JSON.stringify(corpo) });

    return {
      async testar() {
        const info = await req('');
        if (info.permissions && !info.permissions.push) throw new Error('Este token só tem leitura. Ele precisa de "Contents: Read and write".');
        return info;
      },
      async ler(nome) {
        const j = await req(`/contents/${dir}/${nome}?ref=${encodeURIComponent(branch)}`);
        return dec(j.content);
      },
      // arquivos: { 'eventos.json': texto, ... } → um só commit com todos
      async publicar(arquivos, mensagem) {
        const ref = await req(`/git/ref/heads/${encodeURIComponent(branch)}`);
        const sha = ref.object.sha;
        const commit = await req(`/git/commits/${sha}`);
        const itens = [];
        for (const [nome, texto] of Object.entries(arquivos)) {
          const blob = await post('/git/blobs', { content: texto, encoding: 'utf-8' });
          itens.push({ path: `${dir}/${nome}`, mode: '100644', type: 'blob', sha: blob.sha });
        }
        const arvore = await post('/git/trees', { base_tree: commit.tree.sha, tree: itens });
        const novo = await post('/git/commits', { message: mensagem, tree: arvore.sha, parents: [sha] });
        await req(`/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: novo.sha }) });
        return novo.sha;
      },
    };
  }

  root.GH = { criarCliente };
})(typeof window !== 'undefined' ? window : globalThis);
