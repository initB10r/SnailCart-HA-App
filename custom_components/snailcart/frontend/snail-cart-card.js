/* snail-cart-card – Einkaufsliste aus SnailCart, ausgeliefert und geladen von der
 * SnailCart-Integration (ab 0.26.0). Ursprünglich v1.2 von der Dashboard-KI.
 *
 * type: custom:snail-cart-card
 * entity: todo.snailcart_einkaufsliste   (für HA freigegebene SnailCart-Liste)
 * title: Einkaufsliste
 * layout: tiles (Standard, Bildleiste) | list (nach Kategorie, Höhe über grid_options.rows)
 *
 * Lesen: snailcart.get_list (return_response), Live: todo/item/subscribe → neu laden
 * Schreiben: nur todo.remove_item (löschen bzw. Löschvormerkung) und snailcart.cancel_delete
 * Sicherheit: alle Inhalte nur per textContent; Bilder nur https:// oder data:image/ als <img src>;
 * innerHTML nur für das statische Gerüst ohne Daten. Keine externen Skripte.
 */
const CARD_VERSION = (() => { try { return new URL(import.meta.url).searchParams.get("v") || "?"; } catch (e) { return "?"; } })();
const CART_CSS = `
  [hidden]{display:none!important}
  .btn{border:none;background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:50%;
    width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex:none;font:inherit}
  .btn ha-icon{--mdc-icon-size:22px}
  .ell{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dim{color:var(--secondary-text-color)}
  .th{flex:none;border-radius:10px;background:var(--secondary-background-color);display:flex;align-items:center;justify-content:center;overflow:hidden}
  .th img{width:100%;height:100%;object-fit:cover}
  .th ha-icon{color:var(--secondary-text-color)}
  .pill{font-size:12px;padding:2px 9px;border-radius:10px;background:var(--secondary-background-color);color:var(--secondary-text-color);white-space:nowrap}
  .pill.on{background:var(--primary-color);color:var(--text-primary-color,#fff)}`;

class SnailCartCard extends HTMLElement {
  setConfig(c) {
    if (!c.entity) throw new Error("snail-cart-card: 'entity' angeben (z. B. todo.einkaufsliste)");
    this._c = Object.assign({ title: "Einkaufsliste" }, c);
    this._data = null; this._err = null;
    this._opt = { pending: false, done: false, sort: "name" };
    this._open_notes = new Set(); this._arm = null;
    this._built = false;
  }
  set hass(h) {
    const first = !this._h; this._h = h;
    if (!this._built) this._build();
    const st = h.states[this._c.entity];
    const stamp = st ? st.last_updated : "-";
    if (first || stamp !== this._stamp) { this._stamp = stamp; this._reload(); }
    if (!this._unsub && this.isConnected) this._subscribe();
  }
  connectedCallback() { if (this._h && !this._unsub) this._subscribe(); }
  disconnectedCallback() { this._close(true); this._unsubscribe(); }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, rows: 3, min_columns: 6 }; }

  /* ---------- Daten ---------- */
  _mode() { return this._h.services?.snailcart?.get_list ? "live" : "missing"; }
  async _subscribe() {
    if (this._mode() !== "live" || this._subbing) return;
    this._subbing = true;
    try {
      this._unsub = await this._h.connection.subscribeMessage(() => this._reload(), { type: "todo/item/subscribe", entity_id: this._c.entity });
    } catch (e) { this._unsub = null; }
    this._subbing = false;
  }
  _unsubscribe() { if (this._unsub) { try { this._unsub(); } catch (e) { /* egal */ } this._unsub = null; } }
  _reload() {                                         // Meldungen bündeln
    clearTimeout(this._rt);
    this._rt = setTimeout(() => this._fetch(), 250);
  }
  async _fetch() {
    const mode = this._mode();
    if (mode === "missing") { this._data = null; this._err = null; return this._render(); }
    const n = (this._fn = (this._fn || 0) + 1);
    try {
      const res = await this._h.callWS({ type: "call_service", domain: "snailcart", service: "get_list",
        service_data: { entity_id: this._c.entity, include_pending: true, include_done: this._opt.done }, return_response: true });
      if (n !== this._fn) return;
      this._data = (res && res.response) || null; this._err = null;
    } catch (e) { if (n !== this._fn) return; this._err = (e && e.message) || String(e); }
    this._render();
  }
  _items() { return (this._data && Array.isArray(this._data.items)) ? this._data.items : []; }
  _openItems() { return this._items().filter(i => !i.delete_requested && (i.state === "open" || i.state === "unavailable")); }
  _cats() {
    const m = new Map();
    ((this._data && this._data.categories) || []).forEach(c => m.set(c.name, c));
    return m;
  }
  _icon(cat) {
    const c = cat && this._cats().get(cat), ic = c && c.icon;
    return typeof ic === "string" && /^mdi:[a-z0-9-]+$/.test(ic) ? ic : "mdi:cart-outline";
  }
  _src(u) { return typeof u === "string" && (/^https:\/\//.test(u) || /^data:image\/(png|jpe?g|webp|gif);base64,/.test(u)) ? u : null; }

  /* ---------- DOM-Helfer (nur textContent) ---------- */
  _el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  _ico(icon, size) { const i = document.createElement("ha-icon"); i.setAttribute("icon", icon); if (size) i.style.setProperty("--mdc-icon-size", size + "px"); return i; }
  _thumb(it, size) {
    const box = this._el("div", "th"); box.style.width = box.style.height = size + "px";
    const src = this._src(it.image), fallback = () => { box.textContent = ""; box.appendChild(this._ico(this._icon(it.category), Math.round(size * 0.5))); };
    if (src) { const img = document.createElement("img"); img.loading = "lazy"; img.alt = ""; img.addEventListener("error", fallback); img.src = src; box.appendChild(img); }
    else fallback();
    return box;
  }
  _qty(it) {
    const q = it.quantity, u = it.unit || "";
    if (q == null || q === "") return u;
    return (typeof q === "number" ? q.toLocaleString("de-DE") : String(q)) + (u ? " " + u : "");
  }
  _ago(iso) {
    const t = Date.parse(iso); if (isNaN(t)) return "";
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "gerade eben"; if (m < 60) return `vor ${m} Min.`;
    const h = Math.round(m / 60); if (h < 24) return `vor ${h} Std.`;
    const d = Math.round(h / 24); return d === 1 ? "gestern" : `vor ${d} Tagen`;
  }

  /* ---------- Kachel ---------- */
  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>${CART_CSS}
      ha-card{height:100%;box-sizing:border-box;padding:12px 14px;display:flex;flex-direction:column;gap:10px;cursor:pointer;-webkit-tap-highlight-color:transparent;overflow:hidden}
      .hd{display:flex;align-items:center;gap:8px} .hd ha-icon{--mdc-icon-size:20px;color:var(--secondary-text-color)}
      .ti{font-weight:500;font-size:15px;flex:1;min-width:0}
      .row{flex:1;display:flex;gap:10px;min-height:0;overflow:hidden;align-items:flex-start}
      .it{flex:none;width:72px;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}
      .it .nm{font-size:12px;width:100%;text-align:center}
      .it.na{opacity:.55}
      .more{flex:none;width:64px;height:64px;border-radius:10px;background:var(--secondary-background-color);display:flex;align-items:center;justify-content:center;font-weight:500}
      .msg{flex:1;display:flex;align-items:center;gap:12px;background:var(--secondary-background-color);border-radius:12px;padding:8px 12px;font-size:13px}
      .msg ha-icon{--mdc-icon-size:28px;color:var(--secondary-text-color);flex:none}
      .ft{font-size:12px;color:var(--secondary-text-color);display:flex;gap:8px}
      .lst{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;margin:0 -4px;padding:0 4px}
      .lg{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--secondary-text-color);margin:10px 0 4px;display:flex;align-items:center;gap:6px}
      .lg:first-child{margin-top:0} .lg ha-icon{--mdc-icon-size:14px}
      .li{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--divider-color,rgba(127,127,127,.15))}
      .li.na{opacity:.55} .li .th{border-radius:8px}
      .li .tx{flex:1;min-width:0} .li .n1{font-size:14px;font-weight:500} .li .n2{font-size:12px;color:var(--secondary-text-color)}
      .li .bd{font-size:10px;padding:1px 6px;border-radius:5px;font-weight:600;text-transform:uppercase;background:var(--warning-color,#ff9800);color:#000;flex:none}</style>
      <ha-card><div class="hd"><ha-icon icon="mdi:cart"></ha-icon><span class="ti ell"></span><span class="pill cnt"></span></div>
        <div class="row"></div><div class="lst" hidden></div><div class="msg" hidden></div><div class="ft" hidden></div></ha-card>`;
    const r = this.shadowRoot, $ = q => r.querySelector(q);
    this._t = { card: $("ha-card"), ti: $(".ti"), cnt: $(".cnt"), row: $(".row"), lst: $(".lst"), msg: $(".msg"), ft: $(".ft") };
    this._t.ti.textContent = this._c.title;
    this._t.card.addEventListener("click", () => this._open());
    this._built = true;
    this._render();
  }
  _setMsg(el, icon, title, text) {
    el.textContent = ""; el.appendChild(this._ico(icon));
    const d = this._el("div"); d.appendChild(this._el("b", null, title)); d.appendChild(document.createElement("br")); d.appendChild(this._el("span", "dim", text));
    el.appendChild(d);
  }
  _render() {
    if (!this._built || !this._h) return;
    const t = this._t, mode = this._mode(), open = this._openItems();
    const pend = this._items().filter(i => i.delete_requested).length;
    t.cnt.textContent = mode === "missing" ? "–" : `${open.length} offen`;
    t.cnt.classList.toggle("on", open.length > 0);
    const list = this._c.layout === "list";
    t.row.textContent = ""; t.lst.textContent = ""; t.msg.hidden = true; t.row.hidden = list; t.lst.hidden = !list;
    if (mode === "missing") { t.row.hidden = t.lst.hidden = true; t.msg.hidden = false; this._setMsg(t.msg, "mdi:puzzle-outline", "SnailCart ist noch nicht verbunden", "Sobald die SnailCart-Integration installiert ist, erscheint hier die Einkaufsliste."); }
    else if (this._err && !this._data) { t.row.hidden = t.lst.hidden = true; t.msg.hidden = false; this._setMsg(t.msg, "mdi:alert-circle-outline", "Liste konnte nicht geladen werden", this._err); }
    else if (!open.length) { t.row.hidden = t.lst.hidden = true; t.msg.hidden = false; this._setMsg(t.msg, "mdi:cart-check", "Alles eingekauft", "Die Liste ist leer."); }
    else if (list) this._renderList(open);
    else {
      const sorted = open.slice().sort((a, b) => Date.parse(b.added_at) - Date.parse(a.added_at));
      const w = this._t.row.clientWidth || 600, fit = Math.max(2, Math.floor((w + 10) / 82));
      const show = sorted.length > fit ? sorted.slice(0, fit - 1) : sorted;
      show.forEach(it => {
        const d = this._el("div", "it" + (it.state === "unavailable" ? " na" : ""));
        d.appendChild(this._thumb(it, 64)); d.appendChild(this._el("div", "nm ell", it.name));
        t.row.appendChild(d);
      });
      if (sorted.length > show.length) t.row.appendChild(this._el("div", "more", "+" + (sorted.length - show.length)));
    }
    const na = open.filter(i => i.state === "unavailable").length;
    const ft = [];
    if (na) ft.push(`${na} nicht bekommen`);
    if (pend) ft.push(`${pend} zum Löschen vorgemerkt`);
    t.ft.hidden = !ft.length || mode === "missing"; t.ft.textContent = ft.join(" · ");
    if (this._ov) this._renderOv();
  }

  _renderList(open) {
    const t = this._t, cats = this._cats(), groups = new Map();
    open.forEach(i => { const k = i.category || null; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
    const order = [...groups.keys()].sort((a, b) => {
      if (a == null) return 1; if (b == null) return -1;
      return (cats.get(a)?.sort ?? 9999) - (cats.get(b)?.sort ?? 9999) || String(a).localeCompare(String(b), "de");
    });
    order.forEach(k => {
      const h = this._el("div", "lg"); h.appendChild(this._ico(k == null ? "mdi:dots-horizontal" : this._icon(k)));
      h.appendChild(this._el("span", null, k == null ? "Sonstiges" : k)); t.lst.appendChild(h);
      groups.get(k).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de")).forEach(it => {
        const r = this._el("div", "li" + (it.state === "unavailable" ? " na" : ""));
        r.appendChild(this._thumb(it, 36));
        const tx = this._el("div", "tx"); tx.appendChild(this._el("div", "n1 ell", it.name));
        const sub = [it.brand, this._qty(it), it.added_by && it.added_by.name].filter(Boolean).join(" · ");
        if (sub) tx.appendChild(this._el("div", "n2 ell", sub));
        r.appendChild(tx);
        if (it.state === "unavailable") r.appendChild(this._el("span", "bd", "nicht bekommen"));
        t.lst.appendChild(r);
      });
    });
  }

  /* ---------- Fenster ---------- */
  _open() {
    if (this._ov) return;
    const r = this.getBoundingClientRect();
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999";
    const s = ov.attachShadow({ mode: "open" });
    s.innerHTML = `<style>${CART_CSS}
      .bd{position:absolute;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.55);opacity:0;transition:opacity .25s}
      .wrap{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
      .pn{pointer-events:auto;width:min(96vw,820px);height:min(92vh,880px);box-sizing:border-box;border-radius:26px;overflow:hidden;
        background:var(--card-background-color,#1c1c1c);color:var(--primary-text-color);box-shadow:0 10px 40px rgba(0,0,0,.5);opacity:0;
        transition:transform .28s cubic-bezier(.2,.9,.3,1.15),opacity .2s;display:flex;flex-direction:column}
      @media (max-width:600px){.pn{width:100vw;height:100%;border-radius:0;padding-top:env(safe-area-inset-top)}}
      .top{flex:none;padding:18px 22px 12px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--divider-color,rgba(127,127,127,.2))}
      .hd{display:flex;align-items:center;gap:10px} .hd .ti{font-size:19px;font-weight:500;flex:1;min-width:0} .x{width:36px;height:36px}
      .tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
      .chip{border:1px solid var(--divider-color,rgba(127,127,127,.35));background:none;color:var(--primary-text-color);border-radius:16px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
      .chip ha-icon{--mdc-icon-size:16px}
      .chip.on{background:var(--primary-color);border-color:var(--primary-color);color:var(--text-primary-color,#fff)}
      .sp{flex:1}
      .body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 22px 20px}
      .grp{display:flex;align-items:center;gap:8px;margin:20px 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--secondary-text-color)}
      .grp ha-icon{--mdc-icon-size:16px}
      .gbox{background:var(--secondary-background-color);border-radius:14px;overflow:hidden}
      .item{display:flex;gap:14px;align-items:center;padding:12px 14px;border-bottom:1px solid var(--divider-color,rgba(127,127,127,.15))}
      .item:last-child{border-bottom:none}
      .item .th{background:var(--card-background-color,#1c1c1c)}
      .item.done{opacity:.5} .item.pend{opacity:.7}
      .info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
      .l1{display:flex;align-items:center;gap:8px;flex-wrap:wrap} .nm{font-size:16px;font-weight:600;min-width:0}
      .l2 b{font-weight:600;color:var(--primary-text-color)} .sep{margin:0 5px;opacity:.6}
      .item.done .nm{text-decoration:line-through}
      .qty{flex:none;font-size:12px;padding:1px 8px;border-radius:9px;background:var(--secondary-background-color)}
      .l2{font-size:12px;color:var(--secondary-text-color)}
      .badge{font-size:11px;padding:2px 7px;border-radius:6px;font-weight:600;text-transform:uppercase;letter-spacing:.03em}
      .badge.na{background:var(--warning-color,#ff9800);color:#000} .badge.ok{background:var(--success-color,#4caf50);color:#fff}
      .badge.pd{background:var(--error-color,#f44336);color:#fff}
      .note{font-size:13px;white-space:pre-wrap;background:var(--secondary-background-color);border-radius:10px;padding:8px 10px;margin-top:4px;line-height:1.4}
      .acts{display:flex;gap:6px;align-items:center;flex:none}
      .acts .btn{width:36px;height:36px} .acts .btn ha-icon{--mdc-icon-size:20px}
      .btn.nt.on{background:var(--primary-color);color:var(--text-primary-color,#fff)}
      .del.armed{width:auto;border-radius:18px;padding:0 12px;background:var(--error-color,#f44336);color:#fff;font-size:13px;gap:4px}
      .keep{border:none;border-radius:18px;padding:8px 12px;font:inherit;font-size:13px;cursor:pointer;background:var(--primary-color);color:var(--text-primary-color,#fff)}
      .empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:50px 0;color:var(--secondary-text-color);text-align:center}
      .empty ha-icon{--mdc-icon-size:48px}
      .toast{flex:none;font-size:13px;color:var(--secondary-text-color);padding:0 22px}
      .toast:not(:empty){padding:10px 22px calc(10px + env(safe-area-inset-bottom));border-top:1px solid var(--divider-color,rgba(127,127,127,.2))}</style>
      <div class="bd"></div><div class="wrap"><div class="pn">
        <div class="top">
          <div class="hd"><ha-icon icon="mdi:cart"></ha-icon><span class="ti ell"></span><span class="pill cnt"></span>
            <button class="btn x" aria-label="Schließen"><ha-icon icon="mdi:close"></ha-icon></button></div>
          <div class="tools">
            <button class="chip" data-s="name"><ha-icon icon="mdi:sort-alphabetical-ascending"></ha-icon>A–Z</button>
            <button class="chip" data-s="new"><ha-icon icon="mdi:clock-outline"></ha-icon>Neueste</button>
            <span class="sp"></span>
            <button class="chip" data-o="pending"><ha-icon icon="mdi:delete-clock-outline"></ha-icon>Vorgemerkte</button>
            <button class="chip" data-o="done"><ha-icon icon="mdi:check-all"></ha-icon>Erledigte</button>
          </div>
        </div>
        <div class="body"></div>
        <div class="toast"></div>
      </div></div>`;
    document.body.appendChild(ov);
    const $ = q => s.querySelector(q);
    const pn = $(".pn"), bd = $(".bd");
    const dx = r.left + r.width / 2 - innerWidth / 2, dy = r.top + r.height / 2 - innerHeight / 2;
    this._from = `translate(${dx.toFixed(0)}px,${dy.toFixed(0)}px) scale(.15)`;
    pn.style.transform = this._from;
    bd.addEventListener("click", () => this._close());
    $(".x").addEventListener("click", () => this._close());
    s.querySelectorAll("[data-s]").forEach(b => b.addEventListener("click", () => { this._opt.sort = b.dataset.s; this._renderOv(); }));
    s.querySelectorAll("[data-o]").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.o; this._opt[k] = !this._opt[k];
      if (k === "done") this._fetch(); else this._renderOv();
    }));
    $(".ti").textContent = this._c.title;
    this._o = { s, pn, bd, body: $(".body"), cnt: $(".cnt"), toast: $(".toast") };
    this._ov = ov;
    this._renderOv();
    const raf = window.requestAnimationFrame || (f => setTimeout(f, 16));
    raf(() => raf(() => { pn.style.transform = "none"; pn.style.opacity = "1"; bd.style.opacity = "1"; }));
  }
  _close(now) {
    if (!this._ov) return;
    const ov = this._ov, { pn, bd } = this._o;
    this._ov = null; this._arm = null;
    if (now) { ov.remove(); return; }
    pn.style.transform = this._from; pn.style.opacity = "0"; bd.style.opacity = "0";
    setTimeout(() => ov.remove(), 280);
  }
  _say(t) { if (!this._o) return; this._o.toast.textContent = t; clearTimeout(this._tt); this._tt = setTimeout(() => this._o && (this._o.toast.textContent = ""), 6000); }

  _renderOv() {
    const o = this._o; if (!o) return;
    const mode = this._mode(), open = this._openItems();
    o.cnt.textContent = mode === "missing" ? "–" : `${open.length} offen`;
    o.cnt.classList.toggle("on", open.length > 0);
    o.s.querySelectorAll("[data-s]").forEach(b => b.classList.toggle("on", b.dataset.s === this._opt.sort));
    o.s.querySelectorAll("[data-o]").forEach(b => b.classList.toggle("on", !!this._opt[b.dataset.o]));
    const body = o.body, keep = body.scrollTop;
    body.textContent = "";
    const empty = (icon, title, text) => {
      const d = this._el("div", "empty"); d.appendChild(this._ico(icon)); d.appendChild(this._el("b", null, title)); if (text) d.appendChild(this._el("span", null, text));
      body.appendChild(d);
    };
    if (mode === "missing") return empty("mdi:puzzle-outline", "SnailCart ist noch nicht verbunden", "Sobald die SnailCart-Integration installiert ist, erscheint hier die Einkaufsliste.");
    if (this._err && !this._data) return empty("mdi:alert-circle-outline", "Liste konnte nicht geladen werden", this._err);

    const vis = this._items().filter(i => {
      if (i.delete_requested) return this._opt.pending;
      if (i.state === "bought" || i.state === "stored") return this._opt.done;
      return true;
    });
    if (!vis.length) return empty("mdi:cart-check", "Alles eingekauft", "Neue Artikel kommen über die SnailCart-App oder Siri.");

    const cats = this._cats(), groups = new Map();
    vis.forEach(i => { const k = i.category && cats.has(i.category) ? i.category : (i.category || null); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
    const order = [...groups.keys()].sort((a, b) => {
      if (a == null) return 1; if (b == null) return -1;
      const sa = cats.get(a)?.sort ?? 9999, sb = cats.get(b)?.sort ?? 9999;
      return sa - sb || String(a).localeCompare(String(b), "de");
    });
    const cmp = this._opt.sort === "new" ? (a, b) => Date.parse(b.added_at) - Date.parse(a.added_at)
      : (a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de");
    const rank = i => i.delete_requested ? 2 : (i.state === "bought" || i.state === "stored") ? 1 : 0;
    order.forEach(k => {
      const list = groups.get(k).sort((a, b) => rank(a) - rank(b) || cmp(a, b));
      const h = this._el("div", "grp"); h.appendChild(this._ico(k == null ? "mdi:dots-horizontal" : this._icon(k)));
      h.appendChild(this._el("span", null, `${k == null ? "Sonstiges" : k} (${list.length})`));
      body.appendChild(h);
      const box = this._el("div", "gbox");
      list.forEach(it => box.appendChild(this._row(it)));
      body.appendChild(box);
    });
    body.scrollTop = keep;
  }
  _row(it) {
    const done = it.state === "bought" || it.state === "stored", pend = !!it.delete_requested;
    const row = this._el("div", "item" + (done ? " done" : "") + (pend ? " pend" : ""));
    row.appendChild(this._thumb(it, 48));
    const info = this._el("div", "info");
    const l1 = this._el("div", "l1"); l1.appendChild(this._el("span", "nm", it.name));
    info.appendChild(l1);
    const l2 = this._el("div", "l2 ell");
    const parts = [];
    if (it.brand) parts.push(this._el("b", null, it.brand));
    const q = this._qty(it); if (q) parts.push(document.createTextNode(q));
    const who = it.added_by && it.added_by.name; if (who) parts.push(document.createTextNode(who));
    parts.forEach((p, i) => { if (i) l2.appendChild(this._el("span", "sep", "·")); l2.appendChild(p); });
    info.appendChild(l2);
    const badges = l1;
    if (it.state === "unavailable") badges.appendChild(this._el("span", "badge na", "nicht bekommen"));
    if (it.state === "bought") badges.appendChild(this._el("span", "badge ok", "gekauft"));
    if (it.state === "stored") badges.appendChild(this._el("span", "badge ok", "eingeräumt"));
    if (pend) {
      const by = it.delete_requested.by && it.delete_requested.by.name;
      badges.appendChild(this._el("span", "badge pd", "Löschen vorgemerkt"));
      badges.appendChild(this._el("span", "l2", (by ? `von ${by} · ` : "") + this._ago(it.delete_requested.at)));
    }
    const hasNote = typeof it.notes === "string" && it.notes.trim() !== "";
    if (hasNote && this._open_notes.has(it.id)) info.appendChild(this._el("div", "note", it.notes));
    row.appendChild(info);

    const acts = this._el("div", "acts");
    if (hasNote) {
      const nb = this._el("button", "btn nt" + (this._open_notes.has(it.id) ? " on" : "")); nb.title = "Hinweise"; nb.appendChild(this._ico("mdi:text-box-outline"));
      nb.addEventListener("click", () => { this._open_notes.has(it.id) ? this._open_notes.delete(it.id) : this._open_notes.add(it.id); this._renderOv(); });
      acts.appendChild(nb);
    }
    if (pend) {
      const kb = this._el("button", "keep", "Behalten"); kb.addEventListener("click", () => this._cancelDelete(it)); acts.appendChild(kb);
    } else if (!done) {
      const armed = this._arm === it.id;
      const db = this._el("button", "btn del" + (armed ? " armed" : ""));
      db.appendChild(this._ico(armed ? "mdi:delete" : "mdi:delete-outline"));
      if (armed) db.appendChild(this._el("span", null, "Löschen?"));
      db.title = "Löschen";
      db.addEventListener("click", () => {
        if (this._arm !== it.id) { this._arm = it.id; clearTimeout(this._at); this._at = setTimeout(() => { this._arm = null; this._renderOv(); }, 4000); this._renderOv(); }
        else { this._arm = null; this._remove(it); }
      });
      acts.appendChild(db);
    }
    row.appendChild(acts);
    return row;
  }

  /* ---------- Aktionen ---------- */
  async _remove(it) {
    try {
      await this._h.callService("todo", "remove_item", { item: it.id }, { entity_id: this._c.entity });
    } catch (e) { this._say(`Fehler: ${(e && e.message) || e}`); return this._reload(); }
    clearTimeout(this._rt);
    await this._fetch();                                // frischer Stand: gelöscht oder nur vorgemerkt?
    const now = this._items().find(i => i.id === it.id);
    if (now && now.delete_requested) {
      this._say(`„${it.name}“ zum Löschen vorgemerkt – ${(it.added_by && it.added_by.name) || "der Ersteller"} bestätigt das in SnailCart.`);
    } else {
      this._say(`„${it.name}“ gelöscht.`);
    }
  }
  async _cancelDelete(it) {
    try {
      await this._h.callService("snailcart", "cancel_delete", { item_id: it.id });
      this._say(`„${it.name}“ bleibt auf der Liste.`);
    } catch (e) { this._say(`Fehler: ${(e && e.message) || e}`); }
    this._reload();
  }
}
if (!customElements.get("snail-cart-card")) {
  customElements.define("snail-cart-card", SnailCartCard);
  console.info(`snail-cart-card ${CARD_VERSION} (SnailCart-Integration)`);
}
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "snail-cart-card")) window.customCards.push({ type: "snail-cart-card", name: "Snail Einkaufsliste", description: "SnailCart-Einkaufsliste: kompakte Kachel und Overlay mit Kategorien, Bildern und Löschvormerkung" });
