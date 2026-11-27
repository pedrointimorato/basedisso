// MOR-38 — imagens e vídeos enviados: miniatura estilo chan (tipo e tamanho embaixo), abrir no tamanho original
// (clicar de novo fecha), vídeo com ✕ fechar, seletor de arquivo no formulário (miniatura gerada aqui, no navegador).
// O servidor confere tudo (tipo pelos bytes, tamanho, permissão, limite de envios).
(function () {
  "use strict";
  var V = "20261203b";
  var THUMB = 250;
  var IMG_MAX = 8 * 1024 * 1024, VID_MAX = 50 * 1024 * 1024;
  var TIPOS = { "image/jpeg": "image", "image/png": "image", "image/gif": "image", "image/webp": "image", "video/mp4": "video", "video/webm": "video" };
  var EXTS = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm" };
  var ACCEPT = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm";
  if (!document.querySelector("link[data-midia-css]")) {
    var lk = document.createElement("link");
    lk.rel = "stylesheet"; lk.href = "/midia.css?v=" + V; lk.setAttribute("data-midia-css", "");
    document.head.appendChild(lk);
  }
  function el(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) if (attrs[k] != null && attrs[k] !== false) { if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); }
    return n;
  }
  function fmtSize(b) {
    b = Number(b || 0);
    if (b < 1024) return b + " B";
    if (b < 1048576) return Math.max(1, Math.round(b / 1024)) + " KB";
    return (b / 1048576).toFixed(1).replace(".", ",") + " MB";
  }
  function fmtDur(s) {
    var t = Math.round(Number(s || 0)); if (!t) return "";
    var m = Math.floor(t / 60), ss = ("0" + (t % 60)).slice(-2);
    return m >= 60 ? Math.floor(m / 60) + ":" + ("0" + (m % 60)).slice(-2) + ":" + ss : m + ":" + ss;
  }
  function info(m) { return fmtSize(m.tamanho) + " " + m.ext + (m.tipo === "video" && m.duracao ? " · " + fmtDur(m.duracao) : ""); }

  // ---------- exibição ----------
  function node(m, opts) {
    opts = opts || {};
    var video = m.tipo === "video";
    var img = el("img", { class: "bd-midia-mini", src: m.miniatura, alt: video ? "vídeo anexado" : "imagem anexada", loading: "lazy", decoding: "async",
      width: m.mini_largura || null, height: m.mini_altura || null });
    var a = el("a", { class: "bd-midia-thumb", href: m.url, target: "_blank", rel: "noopener", title: video ? "assistir" : "abrir no tamanho original" },
      img, video ? el("span", { class: "bd-midia-play", "aria-hidden": "true" }, "▶") : null, el("span", { class: "bd-midia-ph" }, video ? "[vídeo]" : "[imagem]"));
    var cap = el("figcaption", { class: "bd-midia-cap" }, opts.nome ? el("span", { class: "bd-midia-nome", title: m.nome }, m.nome) : null, el("span", { class: "bd-midia-info" }, info(m)));
    var fig = el("figure", { class: "bd-midia bd-midia-" + (video ? "video" : "image") }, a, cap);
    fig._midia = m;
    if (opts.removivel) addRemove(fig);
    return fig;
  }
  function dataOf(fig) {
    if (fig._midia) return fig._midia;
    try { fig._midia = JSON.parse(fig.getAttribute("data-midia") || "null"); } catch (e) { fig._midia = null; }
    return fig._midia;
  }
  function addRemove(fig) {
    var cap = fig.querySelector(".bd-midia-cap");
    if (!cap || cap.querySelector(".bd-midia-remover")) return;
    cap.appendChild(el("button", { type: "button", class: "bd-midia-remover", "data-midia-remover": "1" }, "remover arquivo"));
  }
  function isOpen(fig) { return fig.classList.contains("is-open"); }
  function open(fig) {
    var m = dataOf(fig); if (!m || isOpen(fig)) return;
    var a = fig.querySelector(".bd-midia-thumb");
    if (m.tipo === "video") {
      var v = el("video", { src: m.url, controls: "controls", autoplay: "autoplay", playsinline: "playsinline", preload: "auto", width: m.largura || null, height: m.altura || null });
      var fechar = el("button", { type: "button", class: "bd-midia-fechar", "aria-label": "fechar vídeo" }, "✕ fechar");
      var player = el("div", { class: "bd-midia-player" }, el("div", { class: "bd-midia-bar" }, fechar), v);
      a.hidden = true;
      fig.insertBefore(player, a.nextSibling);
      fig.classList.add("is-open");
      try { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
      return;
    }
    var full = el("img", { class: "bd-midia-full", src: m.url, alt: "imagem anexada (tamanho original)", width: m.largura || null, height: m.altura || null });
    fig.classList.add("is-open", "is-loading");
    full.addEventListener("load", function () { fig.classList.remove("is-loading"); });
    full.addEventListener("error", function () { fig.classList.remove("is-loading"); });
    a.appendChild(full);
    a.title = "voltar à miniatura";
    a.setAttribute("aria-expanded", "true");
    if (full.complete) fig.classList.remove("is-loading");
  }
  function close(fig) {
    if (!isOpen(fig)) return;
    var a = fig.querySelector(".bd-midia-thumb");
    var player = fig.querySelector(".bd-midia-player");
    if (player) { var v = player.querySelector("video"); if (v) { try { v.pause(); v.removeAttribute("src"); v.load(); } catch (e) {} } player.parentNode.removeChild(player); }
    var full = fig.querySelector(".bd-midia-full");
    if (full) full.parentNode.removeChild(full);
    a.hidden = false;
    a.title = fig.classList.contains("bd-midia-video") ? "assistir" : "abrir no tamanho original";
    a.setAttribute("aria-expanded", "false");
    fig.classList.remove("is-open", "is-loading");
    var r = fig.getBoundingClientRect();
    if (r.top < 0) fig.scrollIntoView({ block: "nearest" });
  }
  function toggle(fig) { if (isOpen(fig)) close(fig); else open(fig); }

  function remove(fig, btn) {
    var m = dataOf(fig); if (!m) return;
    if (!window.confirm("Remover este arquivo? Não dá para desfazer.")) return;
    btn.disabled = true;
    fetch("/api/midia/" + encodeURIComponent(m.id), { method: "DELETE", credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, d: d }; }); })
      .then(function (o) {
        if (!o.res.ok) { btn.disabled = false; window.alert(o.d.erro || "Não foi possível remover."); return; }
        var p = el("p", { class: "bd-midia-removido" }, "[arquivo removido]");
        fig.parentNode.replaceChild(p, fig);
        try { document.dispatchEvent(new CustomEvent("bd-midia-removida", { detail: { id: m.id } })); } catch (e) {}
      })
      .catch(function () { btn.disabled = false; window.alert("Falha de rede."); });
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var f = t.closest(".bd-midia-fechar");
    if (f) { ev.preventDefault(); close(f.closest(".bd-midia")); return; }
    var r = t.closest("[data-midia-remover]");
    if (r) { ev.preventDefault(); remove(r.closest(".bd-midia"), r); return; }
    var a = t.closest(".bd-midia-thumb");
    if (!a) return;
    if (ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var fig = a.closest(".bd-midia");
    if (!fig || !dataOf(fig)) return;
    ev.preventDefault();
    toggle(fig);
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    var openVid = document.querySelector(".bd-midia-video.is-open");
    if (openVid && (!document.activeElement || openVid.contains(document.activeElement) || document.activeElement === document.body)) close(openVid);
  });

  // Quadradinho do modo compacto.
  function square(m) {
    var frag = document.createDocumentFragment();
    frag.appendChild(el("img", { class: "bd-midia-sq", src: m.miniatura, alt: "", loading: "lazy", decoding: "async" }));
    if (m.tipo === "video") frag.appendChild(el("span", { class: "bd-midia-sq-play", "aria-hidden": "true" }, "▶"));
    return frag;
  }

  function hydrate(root) {
    var figs = (root || document).querySelectorAll("figure.bd-midia[data-midia]");
    for (var i = 0; i < figs.length; i++) if (figs[i].getAttribute("data-removivel") === "1") addRemove(figs[i]);
  }

  // ---------- envio ----------
  var permCache = {};
  function perm(o) {
    var q = o.b ? "b=" + encodeURIComponent(o.b) : "page=" + encodeURIComponent(o.page || "");
    if (!permCache[q]) {
      permCache[q] = fetch("/api/midia?" + q, { credentials: "same-origin", headers: { Accept: "application/json" } })
        .then(function (r) { return r.ok ? r.json() : { pode: false }; })
        .catch(function () { return { pode: false }; });
    }
    return permCache[q];
  }
  function realType(file) {
    var t = String(file.type || "").toLowerCase();
    if (TIPOS[t]) return t;
    var ext = String(file.name || "").split(".").pop().toLowerCase();
    return EXTS[ext] || "";
  }
  function canvasThumb(src, w, h) {
    return new Promise(function (resolve, reject) {
      var s = Math.min(1, THUMB / Math.max(w, h));
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
      var g = c.getContext("2d");
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height);
      g.imageSmoothingQuality = "high";
      g.drawImage(src, 0, 0, c.width, c.height);
      c.toBlob(function (b) { if (b) resolve(b); else reject(new Error("miniatura")); }, "image/jpeg", 0.85);
    });
  }
  function makeThumb(file, kind) {
    var url = URL.createObjectURL(file);
    function done(x) { URL.revokeObjectURL(url); return x; }
    if (kind === "image") {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) { reject(new Error("Não deu para ler esta imagem.")); return; }
          canvasThumb(img, w, h).then(function (b) { resolve({ blob: b, w: w, h: h, dur: null }); }, reject);
        };
        img.onerror = function () { reject(new Error("Não deu para ler esta imagem.")); };
        img.src = url;
      }).then(done, function (e) { done(); throw e; });
    }
    return new Promise(function (resolve, reject) {
      var v = document.createElement("video");
      var timer = setTimeout(function () { reject(new Error("Não deu para ler este vídeo neste navegador (formato/codec não suportado?).")); }, 20000);
      v.muted = true; v.playsInline = true; v.preload = "auto";
      v.onloadedmetadata = function () {
        var d = isFinite(v.duration) ? v.duration : 0;
        try { v.currentTime = d ? Math.min(1, d / 3) : 0; } catch (e) {}
      };
      v.onseeked = function () {
        clearTimeout(timer);
        var w = v.videoWidth, h = v.videoHeight;
        if (!w || !h) { reject(new Error("Não deu para ler este vídeo neste navegador.")); return; }
        canvasThumb(v, w, h).then(function (b) { resolve({ blob: b, w: w, h: h, dur: isFinite(v.duration) ? v.duration : null }); }, reject);
      };
      v.onerror = function () { clearTimeout(timer); reject(new Error("Não deu para ler este vídeo neste navegador (formato/codec não suportado?).")); };
      v.src = url;
    }).then(done, function (e) { done(); throw e; });
  }

  function picker(o) {
    o = o || {};
    var input = el("input", { type: "file", accept: ACCEPT, class: "bd-midia-input", "aria-label": "escolher imagem ou vídeo" });
    var status = el("p", { class: "bd-midia-status", role: "status", "aria-live": "polite" });
    var sel = el("div", { class: "bd-midia-sel", hidden: "hidden" });
    var prog = el("div", { class: "bd-midia-bar-prog", hidden: "hidden" }, el("span"));
    var box = el("fieldset", { class: "bd-midia-picker", hidden: "hidden" },
      el("legend", null, "Arquivo ", el("small", null, "(opcional)")),
      input,
      el("p", { class: "bd-midia-hint" }, "Imagem (JPG, PNG, GIF, WebP) até 8 MB ou vídeo (MP4, WebM) até 50 MB. Um arquivo por envio."),
      prog, sel, status);
    var st = { id: null, busy: false, xhr: null, preview: null, seq: 0 };
    var api = { node: box, ready: false };
    function say(t, k) { status.textContent = t || ""; status.className = "bd-midia-status" + (k ? " " + k : ""); }
    function clearSel() {
      while (sel.firstChild) sel.removeChild(sel.firstChild);
      sel.hidden = true;
      if (st.preview) { URL.revokeObjectURL(st.preview); st.preview = null; }
    }
    function discardPending() {
      var id = st.id; st.id = null;
      if (id) fetch("/api/midia/" + encodeURIComponent(id), { method: "DELETE", credentials: "same-origin", headers: { Accept: "application/json" } }).catch(function () {});
    }
    function cancelUpload() { if (st.xhr) { try { st.xhr.abort(); } catch (e) {} st.xhr = null; } st.busy = false; prog.hidden = true; }
    function showSel(m, thumbBlob) {
      clearSel();
      st.preview = URL.createObjectURL(thumbBlob);
      var rm = el("button", { type: "button" }, "remover");
      rm.addEventListener("click", function () { discardPending(); clearSel(); input.value = ""; say(""); });
      sel.appendChild(el("img", { src: st.preview, alt: "" }));
      sel.appendChild(el("span", { class: "bd-midia-sel-txt", title: m.nome }, info(m) + " · " + m.nome));
      sel.appendChild(rm);
      sel.hidden = false;
    }
    function upload(file, th, seq) {
      return new Promise(function (resolve, reject) {
        var fd = new FormData();
        fd.append("arquivo", file, file.name || "arquivo");
        fd.append("miniatura", th.blob, "miniatura.jpg");
        if (o.b) fd.append("b", o.b); else fd.append("page", o.page || "");
        if (th.w) fd.append("largura", String(th.w));
        if (th.h) fd.append("altura", String(th.h));
        if (th.dur) fd.append("duracao", String(th.dur));
        var x = new XMLHttpRequest();
        st.xhr = x;
        x.open("POST", "/api/midia");
        x.withCredentials = true;
        x.setRequestHeader("Accept", "application/json");
        prog.hidden = false; prog.firstChild.style.width = "0%";
        x.upload.onprogress = function (e) {
          if (seq !== st.seq || !e.lengthComputable) return;
          var p = Math.round((e.loaded / e.total) * 100);
          prog.firstChild.style.width = p + "%";
          say("Enviando… " + p + "%");
        };
        x.onload = function () {
          var d = {}; try { d = JSON.parse(x.responseText || "{}"); } catch (e) {}
          if (x.status === 201 && d.midia) resolve(d.midia); else reject(new Error(d.erro || "Não foi possível enviar o arquivo."));
        };
        x.onerror = function () { reject(new Error("Falha de rede ao enviar o arquivo.")); };
        x.onabort = function () { reject(new Error("")); };
        x.send(fd);
      });
    }
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      cancelUpload(); discardPending(); clearSel(); say("");
      var seq = ++st.seq;
      if (!file) return;
      var type = realType(file), kind = TIPOS[type];
      if (!kind) { say("Tipo não aceito. Use JPG, PNG, GIF, WebP, MP4 ou WebM.", "erro"); input.value = ""; return; }
      if (file.size > (kind === "video" ? VID_MAX : IMG_MAX)) { say(kind === "video" ? "Vídeo grande demais (máx. 50 MB)." : "Imagem grande demais (máx. 8 MB).", "erro"); input.value = ""; return; }
      st.busy = true;
      say(kind === "video" ? "Lendo o vídeo…" : "Preparando a miniatura…");
      var th = null;
      makeThumb(file, kind)
        .then(function (t) { th = t; if (seq !== st.seq) throw new Error(""); return upload(file, t, seq); })
        .then(function (m) {
          if (seq !== st.seq) { st.id = m.id; discardPending(); return; }
          st.id = m.id; st.busy = false; st.xhr = null; prog.hidden = true;
          showSel(m, th.blob);
          say("Arquivo pronto — sai junto ao publicar.", "ok");
        })
        .catch(function (e) {
          if (seq !== st.seq) return;
          st.busy = false; st.xhr = null; prog.hidden = true;
          input.value = "";
          if (e && e.message) say(e.message, "erro");
        });
    });
    api.value = function () { return st.id || undefined; };
    api.busy = function () { return st.busy; };
    api.reset = function () { st.seq++; cancelUpload(); st.id = null; clearSel(); input.value = ""; say(""); };
    api.discard = function () { st.seq++; cancelUpload(); discardPending(); clearSel(); input.value = ""; say(""); };
    api.ready = perm(o).then(function (d) { box.hidden = !(d && d.pode); api.pode = Boolean(d && d.pode); return api.pode; });
    return api;
  }

  window.BDMidia = { node: node, open: open, close: close, toggle: toggle, square: square, hydrate: hydrate, picker: picker, info: info, fmtSize: fmtSize };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { hydrate(document); });
  else hydrate(document);
})();
