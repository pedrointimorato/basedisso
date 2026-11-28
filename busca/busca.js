(function () {
  "use strict";

  var INDICE_URL = "/busca/indice.json";
  var API_URL = "/api/busca";
  var Q_MIN = 2;

  function fold(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
  }

  function termsOf(q) {
    var seen = {};
    var terms = [];
    fold(q)
      .split(/\s+/)
      .forEach(function (t) {
        if (t.length < 2 || seen[t]) return;
        seen[t] = true;
        terms.push(t);
      });
    return terms;
  }

  function foldMap(s) {
    var folded = "";
    var map = [];
    var i, piece, j;
    s = String(s || "");
    for (i = 0; i < s.length; i++) {
      piece = s.charAt(i).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      if (!piece) continue;
      for (j = 0; j < piece.length; j++) {
        folded += piece.charAt(j);
        map.push(i);
      }
    }
    return { folded: folded, map: map };
  }

  function matchRanges(text, terms) {
    var fm = foldMap(text);
    var ranges = [];
    var t, idx, start, end, last;
    for (t = 0; t < terms.length; t++) {
      idx = 0;
      while ((idx = fm.folded.indexOf(terms[t], idx)) !== -1) {
        start = fm.map[idx];
        last = fm.map[idx + terms[t].length - 1];
        end = last == null ? start + 1 : last + 1;
        ranges.push([start, end]);
        idx += terms[t].length;
      }
    }
    ranges.sort(function (a, b) {
      return a[0] - b[0] || a[1] - b[1];
    });
    var merged = [];
    for (t = 0; t < ranges.length; t++) {
      if (!merged.length || ranges[t][0] > merged[merged.length - 1][1]) {
        merged.push(ranges[t].slice());
      } else if (ranges[t][1] > merged[merged.length - 1][1]) {
        merged[merged.length - 1][1] = ranges[t][1];
      }
    }
    return merged;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function highlight(text, terms) {
    var ranges = matchRanges(text, terms);
    if (!ranges.length) return escapeHtml(text);
    var html = "";
    var cursor = 0;
    var i, a, b;
    for (i = 0; i < ranges.length; i++) {
      a = ranges[i][0];
      b = ranges[i][1];
      html += escapeHtml(text.slice(cursor, a));
      html += '<mark class="busca-mark">' + escapeHtml(text.slice(a, b)) + "</mark>";
      cursor = b;
    }
    html += escapeHtml(text.slice(cursor));
    return html;
  }

  function snippet(text, terms, maxLen) {
    maxLen = maxLen || 220;
    var raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    var fm = foldMap(raw);
    var first = -1;
    var t, idx;
    for (t = 0; t < terms.length; t++) {
      idx = fm.folded.indexOf(terms[t]);
      if (idx !== -1 && (first === -1 || idx < first)) first = idx;
    }
    var start = 0;
    if (first >= 0) {
      start = fm.map[first] || 0;
      start = Math.max(0, start - 40);
      if (start > 0) {
        var sp = raw.lastIndexOf(" ", start);
        if (sp > start - 20) start = sp + 1;
      }
    }
    var chunk = raw.slice(start, start + maxLen);
    var prefix = start > 0 ? "…" : "";
    var suffix = start + maxLen < raw.length ? "…" : "";
    return prefix + chunk + suffix;
  }

  function matchesItem(item, terms) {
    var hay = fold(
      (item.title || "") + " " + (item.author || "") + " " + (item.body || "")
    );
    return terms.every(function (t) {
      return hay.indexOf(t) !== -1;
    });
  }

  function scoreItem(item, terms) {
    var title = fold(item.title || "");
    var author = fold(item.author || "");
    var body = fold(item.body || "");
    var s = 0;
    terms.forEach(function (t) {
      if (title.indexOf(t) !== -1) s += 6;
      if (author.indexOf(t) !== -1) s += 3;
      if (body.indexOf(t) !== -1) s += 1;
    });
    return s;
  }

  function tipoLabel(tipo) {
    if (tipo === "publicacao") return "Publicação";
    if (tipo === "literatura" || tipo === "satira") return "literatura";
    if (tipo === "ferramenta") return "Ferramenta";
    if (tipo === "comentario") return "Comentário";
    if (tipo === "comunidade") return "Comunidade";
    if (tipo === "postagem") return "Postagem";
    if (tipo === "perfil") return "Perfil";
    if (tipo === "wiki") return "Wiki";
    return "Resultado";
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    var key, val, i, child;
    attrs = attrs || {};
    for (key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      val = attrs[key];
      if (val == null || val === false) continue;
      if (key === "class") node.className = val;
      else if (key === "html") node.innerHTML = val;
      else node.setAttribute(key, val);
    }
    for (i = 2; i < arguments.length; i++) {
      child = arguments[i];
      if (child == null || child === false) continue;
      if (typeof child === "string") node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function renderItem(item, terms) {
    var meta = item.author || "";
    var trecho = snippet(item.body || "", terms);
    var a = el("a", { class: "busca-item", href: item.url || "#" });
    a.appendChild(el("span", { class: "busca-tipo" }, tipoLabel(item.tipo)));
    var h2 = el("h2", { class: "busca-item-title" });
    h2.innerHTML = highlight(item.title || "Sem título", terms);
    a.appendChild(h2);
    if (meta) {
      var pmeta = el("p", { class: "busca-item-meta" });
      pmeta.innerHTML = highlight(meta, terms);
      a.appendChild(pmeta);
    }
    if (trecho) {
      var p = el("p", { class: "busca-item-trecho" });
      p.innerHTML = highlight(trecho, terms);
      a.appendChild(p);
    }
    return a;
  }

  function setStatus(node, text, kind) {
    node.className = "busca-status" + (kind ? " " + kind : "");
    node.textContent = text || "";
  }

  function currentQuery() {
    return new URLSearchParams(location.search).get("q") || "";
  }

  function fillNavInputs(q) {
    document.querySelectorAll(".nav-search-input").forEach(function (input) {
      input.value = q;
    });
  }

  async function loadIndice() {
    var res = await fetch(INDICE_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("indice");
    var data = await res.json();
    return Array.isArray(data) ? data : data.itens || data.items || [];
  }

  async function loadRemote(q) {
    try {
      var res = await fetch(API_URL + "?q=" + encodeURIComponent(q), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return { comentarios: [], postagens: [], wiki: [] };
      var data = await res.json();
      return {
        comentarios: Array.isArray(data.comentarios) ? data.comentarios : [],
        postagens: Array.isArray(data.postagens) ? data.postagens : [],
        wiki: Array.isArray(data.wiki) ? data.wiki : [],
      };
    } catch (e) {
      return { comentarios: [], postagens: [], wiki: [] };
    }
  }

  function renderResults(host, q, items, terms) {
    host.innerHTML = "";
    if (!items.length) {
      host.appendChild(
        el(
          "p",
          { class: "busca-empty", role: "status" },
          "Nenhum resultado para “" + q + "”."
        )
      );
      return;
    }
    var count = items.length === 1 ? "1 resultado" : items.length + " resultados";
    host.appendChild(
      el("p", { class: "busca-count", role: "status" }, count + " para “" + q + "”.")
    );
    var list = el("div", { class: "busca-lista" });
    items.forEach(function (item) {
      list.appendChild(renderItem(item, terms));
    });
    host.appendChild(list);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var q = currentQuery().trim();
    var host = document.getElementById("busca-resultados");
    var status = document.getElementById("busca-status");
    fillNavInputs(q);
    if (!host) return;
    if (!q) {
      setStatus(status, "");
      host.innerHTML = "";
      host.appendChild(
        el(
          "p",
          { class: "busca-empty", role: "status" },
          "Digite um termo na barra de pesquisa e pressione Enter."
        )
      );
      return;
    }
    if (q.length < Q_MIN) {
      setStatus(status, "");
      host.innerHTML = "";
      host.appendChild(
        el(
          "p",
          { class: "busca-empty", role: "status" },
          "Digite pelo menos " + Q_MIN + " caracteres para buscar."
        )
      );
      return;
    }
    var terms = termsOf(q);
    setStatus(status, "Buscando…");
    Promise.all([loadIndice(), loadRemote(q)])
      .then(function (parts) {
        var itens = parts[0].filter(function (item) {
          return matchesItem(item, terms);
        });
        var api = parts[1] || {};
        var comentarios = api.comentarios || (Array.isArray(parts[1]) ? parts[1] : []);
        var postagens = api.postagens || [];
        var seen = {};
        var all = [];
        itens.concat(api.wiki || []).concat(postagens).concat(comentarios).forEach(function (item) {
          var key = (item.tipo || "") + "|" + (item.url || "") + "|" + (item.id || item.title);
          if (seen[key]) return;
          seen[key] = true;
          all.push(item);
        });
        all.sort(function (a, b) {
          return scoreItem(b, terms) - scoreItem(a, terms);
        });
        setStatus(status, "");
        renderResults(host, q, all, terms);
      })
      .catch(function () {
        setStatus(status, "Não foi possível carregar a busca. Tente de novo.", "erro");
      });
  });
})();
