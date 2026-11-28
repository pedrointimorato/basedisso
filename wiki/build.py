#!/usr/bin/env python3
"""Gera a wiki (HTML estático) a partir de fonte/*.md e atualiza as entradas "wiki" da busca.

Uso (na pasta da raiz do site):  python3 wiki/build.py
Dependência só para gerar: pip install markdown. O site publicado não usa Python.
Cada fonte/NN-nome.md começa com um bloco "---" com: titulo, nav, grupo, resumo.
00-index.md vira /wiki/ ; as outras viram /wiki/<nome>/ (sem o NN-).
"""
import html, json, re, sys
from datetime import date
from pathlib import Path
import markdown

RAIZ = Path(__file__).resolve().parent.parent
FONTE = Path(__file__).resolve().parent / "fonte"
VER_WIKI = "20261209a"
ATUALIZADO = "27/11/2026"
GRUPOS = ["Visão geral", "Como funciona", "Conta e site"]


def le(p):
    t = p.read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---\n(.*)", t, re.S)
    meta = {}
    for ln in m.group(1).splitlines():
        k, v = ln.split(":", 1)
        meta[k.strip()] = v.strip()
    return meta, m.group(2)


def plano(h):
    h = re.sub(r"<[^>]+>", " ", h)
    return re.sub(r"\s+", " ", html.unescape(h)).strip()


paginas = []
for f in sorted(FONTE.glob("[0-9][0-9]-*.md")):
    meta, corpo = le(f)
    nome = f.stem.split("-", 1)[1]
    slug = "" if nome == "index" else nome
    paginas.append(dict(slug=slug, url="/wiki/" + (slug + "/" if slug else ""), meta=meta, md=corpo))

base = (FONTE / "_base.html").read_text(encoding="utf-8")


def nav_html(atual):
    out = []
    for g in GRUPOS:
        itens = [p for p in paginas if p["meta"].get("grupo") == g]
        if not itens:
            continue
        li = []
        for p in itens:
            cur = ' aria-current="page"' if p["slug"] == atual else ""
            li.append(f'<li><a href="{p["url"]}"{cur}>{html.escape(p["meta"]["nav"])}</a></li>')
        out.append(f'<div class="wiki-nav-grupo"><h2>{html.escape(g)}</h2><ul>{"".join(li)}</ul></div>')
    return "\n".join(out)


def cartoes():
    out = []
    for g in GRUPOS[1:]:
        itens = [p for p in paginas if p["meta"].get("grupo") == g]
        out.append(f'<h2 class="wiki-grupo-titulo">{html.escape(g)}</h2><div class="wiki-cards">')
        for p in itens:
            out.append(f'<a class="wiki-card" href="{p["url"]}"><b>{html.escape(p["meta"]["nav"])}</b><span>{html.escape(p["meta"]["resumo"])}</span></a>')
        out.append("</div>")
    return "\n".join(out)


indice_busca = []
for i, p in enumerate(paginas):
    md = markdown.Markdown(extensions=["tables", "attr_list", "md_in_html", "toc", "sane_lists"],
                           extension_configs={"toc": {"toc_depth": "2-2", "permalink": False}})
    corpo = md.convert(p["md"])
    corpo = corpo.replace("<!--CARTOES-->", cartoes())
    corpo = re.sub(r"<table>", '<div class="wiki-tabela"><table>', corpo)
    corpo = corpo.replace("</table>", "</table></div>")
    titulo = p["meta"]["titulo"]
    secoes = md.toc_tokens
    toc = ""
    if p["slug"] and len(secoes) >= 3:
        li = "".join(f'<li><a href="#{t["id"]}">{html.escape(plano(t["name"]))}</a></li>' for t in secoes)
        toc = f'<div class="wiki-toc"><p>Nesta página</p><ul>{li}</ul></div>'
    crumb = f'<p class="wiki-crumb"><a href="/wiki/">Wiki</a> › {html.escape(p["meta"]["nav"])}</p>' if p["slug"] else ""
    pager = ""
    if p["slug"]:
        ant = paginas[i - 1] if i > 1 else None
        prox = paginas[i + 1] if i + 1 < len(paginas) else None
        a = f'<a href="{ant["url"]}"><small>Anterior</small>{html.escape(ant["meta"]["nav"])}</a>' if ant else '<span class="vazio"></span>'
        b = f'<a class="prox" href="{prox["url"]}"><small>Próxima</small>{html.escape(prox["meta"]["nav"])}</a>' if prox else '<span class="vazio"></span>'
        pager = f'<div class="wiki-pager">{a}{b}</div>'
    artigo = (f'{crumb}\n<h1>{html.escape(titulo)}</h1>\n<p class="wiki-resumo">{html.escape(p["meta"]["resumo"])}</p>\n'
              f'{toc}\n{corpo}\n{pager}\n<p class="wiki-rodape">Wiki do basedisso · atualizada em {ATUALIZADO}. '
              f'Achou algo errado ou faltando? Avise pela aba ADM ou em <a href="/b/adm/">b/adm</a>.</p>')
    head = f"{titulo} — Wiki — basedisso" if p["slug"] else "Wiki — basedisso"
    pagina = (base.replace("{{TITULO_HEAD}}", html.escape(head)).replace("{{DESCRICAO}}", html.escape(p["meta"]["resumo"], quote=True))
              .replace("{{NAV}}", nav_html(p["slug"])).replace("{{ARTIGO}}", artigo).replace("{{VER_WIKI}}", VER_WIKI))
    destino = RAIZ / "wiki" / (p["slug"] if p["slug"] else "") / "index.html"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(pagina, encoding="utf-8")
    # busca: a página e cada seção (h2)
    texto = plano(corpo)
    indice_busca.append(dict(id="wiki-" + (p["slug"] or "inicio"), tipo="wiki", title="Wiki: " + titulo, author="", url=p["url"],
                             body=(p["meta"]["resumo"] + " " + texto)[:600]))
    partes = re.split(r"(?=<h2 id=)", corpo)
    for parte in partes:
        m = re.match(r'<h2 id="([^"]+)">(.*?)</h2>', parte, re.S)
        if not m or not p["slug"]:
            continue
        indice_busca.append(dict(id=f'wiki-{p["slug"]}-{m.group(1)}', tipo="wiki", title=f'Wiki: {titulo} — {plano(m.group(2))}',
                                 author="", url=f'{p["url"]}#{m.group(1)}', body=plano(parte)[:360]))

arq = RAIZ / "busca" / "indice.json"
dados = json.loads(arq.read_text(encoding="utf-8"))
dados = [d for d in dados if not str(d.get("id", "")).startswith("wiki-")] + indice_busca
arq.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(len(paginas), "páginas;", len(indice_busca), "entradas de busca")
