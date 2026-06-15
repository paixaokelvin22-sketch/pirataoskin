/* PIRATAOSKIN — lógica compartilhada (header, footer, carrinho, cards, filtros). */
(function () {
  const D = window.PIRATA_DATA;
  const CART_KEY = "pirata_cart";

  /* ---------- util ---------- */
  const brl = (n) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  const skinById = (id) => D.skins.find((s) => s.id === id);

  function rarityGradient(rar) {
    const c = D.raridadeCor[rar] || "#5E98D9";
    return `radial-gradient(circle at 50% 35%, ${c}55, transparent 60%), linear-gradient(135deg, #0e1a28, #1b2c40)`;
  }

  /* ---------- carrinho (armazena snapshots de itens) ---------- */
  // Itens da loja real (não-catálogo) ficam registrados aqui por id (assetid).
  const storeRegistry = {};
  function registerStoreItem(it) { storeRegistry[it.id] = it; }

  function snapshotFromCatalog(s) {
    return {
      id: s.id,
      name: s.arma + " | " + s.skin,
      image: s.image || "",
      price: s.preco,
      meta: (s.wear ? D.wearLabels[s.wear] : "") + (s.stattrak ? " • ST™" : ""),
      market_hash_name: null,
      rarityColor: D.raridadeCor[s.raridade],
    };
  }
  function snapshotFromStore(it) {
    return {
      id: it.id || it.assetid, name: it.name, image: it.image || "", price: it.price,
      meta: it.wear || it.type || "", market_hash_name: it.market_hash_name || null,
      rarityColor: it.rarityColor || null,
    };
  }

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }
  function setCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
    document.dispatchEvent(new CustomEvent("cart:change"));
  }
  function cartContains(id) { return getCart().some((x) => x.id === id); }
  function addToCart(id) {
    if (cartContains(id)) { toast("Esse item já está no seu baú ⚓"); return; }
    let item = null;
    const s = skinById(id);
    if (s) item = snapshotFromCatalog(s);
    else if (storeRegistry[id]) item = snapshotFromStore(storeRegistry[id]);
    if (!item) { toast("Item indisponível."); return; }
    if (item.price == null) { toast("Preço ainda cotando, tente em 1s ⏳"); return; }
    const cart = getCart(); cart.push(item); setCart(cart);
    toast(item.name + " no baú! ⚓");
  }
  function removeFromCart(id) { setCart(getCart().filter((x) => x.id !== id)); }
  function cartTotal() { return getCart().reduce((t, i) => t + (Number(i.price) || 0), 0); }
  function updateCartBadge() {
    const n = getCart().length;
    document.querySelectorAll("[data-cart-badge]").forEach((el) => {
      el.textContent = n;
      el.style.display = n > 0 ? "flex" : "none";
    });
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------- ícones ---------- */
  const skullSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C7 2 3.5 5.4 3.5 10c0 2.6 1.3 4.4 2.8 5.6.5.4.7.7.7 1.3v1.3c0 .8.6 1.4 1.4 1.4h.8l.5 1.4c.1.3.4.5.7.5h.9V19h1.2v3.2h1.4l.5-1.4h.8c.8 0 1.4-.6 1.4-1.4v-1.3c0-.6.2-.9.7-1.3 1.5-1.2 2.8-3 2.8-5.6C20.5 5.4 17 2 12 2Z" fill="#FFC233"/>
    <circle cx="8.6" cy="10.4" r="2" fill="#0B1622"/><circle cx="15.4" cy="10.4" r="2" fill="#0B1622"/>
    <path d="M12 13.2l-1 2.2h2l-1-2.2Z" fill="#0B1622"/></svg>`;

  const cartSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>`;
  const searchSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`;

  /* ---------- header / footer ---------- */
  function navLinks() {
    return [
      ["Comprar", "catalogo.html"],
      ["Vender", "vender.html"],
      ["Upgrade", "upgrade.html"],
      ["Meu Histórico", "meu-historico.html"],
      ["FAQ", "#faq"],
    ];
  }

  function renderHeader() {
    const host = document.getElementById("site-header");
    if (!host) return;
    const nav = navLinks().map(([t, h]) => `<a href="${h}">${t}</a>`).join("");
    host.innerHTML = `
    <header class="header">
      <div class="wrap header-inner">
        <a class="logo display" href="index.html">${skullSVG}<span>PIRATAOSKIN</span></a>
        <nav class="nav">${nav}</nav>
        <form class="search" onsubmit="return PIRATA.goSearch(event)">
          ${searchSVG}<input type="search" name="q" placeholder="Buscar skin, arma, coleção..." />
        </form>
        <div class="header-actions">
          <div class="wallet" title="Sua carteira">⚓ <b>R$ 0,00</b></div>
          <a class="icon-btn" href="carrinho.html" aria-label="Carrinho">
            ${cartSVG}<span class="cart-badge" data-cart-badge style="display:none">0</span>
          </a>
          <div id="auth-area"><a class="btn btn-gold btn-sm" href="/auth/steam">Entrar com Steam</a></div>
          <button class="icon-btn burger" aria-label="Menu" onclick="document.getElementById('mobile-menu').classList.toggle('open')">☰</button>
        </div>
      </div>
      <div class="wrap"><div class="mobile-menu" id="mobile-menu">${nav}</div></div>
    </header>`;
    updateCartBadge();
  }

  function renderFooter() {
    const host = document.getElementById("site-footer");
    if (!host) return;
    const cats = D.categorias.slice(0, 6)
      .map((c) => `<li><a href="catalogo.html?cat=${encodeURIComponent(c.slug)}">${c.nome}</a></li>`).join("");
    host.innerHTML = `
    <footer class="footer">
      <div class="wrap footer-inner">
        <div class="brand">
          <a class="logo display" href="index.html">${skullSVG}<span>PIRATAOSKIN</span></a>
          <p>O baú de skins de CS2 com preço de pirata. Comprar, vender e dar upgrade no seu inventário, com entrega automática via trade na Steam.</p>
          <div class="pays">
            <span class="pay">PIX</span><span class="pay">VISA</span><span class="pay">MASTERCARD</span><span class="pay">ELO</span>
          </div>
          <div class="socials">
            <a href="#" aria-label="X">𝕏</a><a href="#" aria-label="Instagram">◎</a>
            <a href="#" aria-label="Discord">✆</a><a href="#" aria-label="TikTok">♪</a>
          </div>
        </div>
        <div><h5>Loja</h5><ul>${cats}</ul></div>
        <div><h5>Conta</h5><ul>
          <li><a href="carrinho.html">Carrinho</a></li>
          <li><a href="vender.html">Vender skins</a></li>
          <li><a href="upgrade.html">Upgrade</a></li>
          <li><a href="#">Entrar com Steam</a></li>
        </ul></div>
        <div><h5>Suporte</h5><ul>
          <li><a href="#faq">FAQ</a></li><li><a href="#">Contato</a></li>
          <li><a href="#">Termos de uso</a></li><li><a href="#">Privacidade</a></li>
        </ul></div>
      </div>
      <div class="legal wrap">
        PIRATAOSKIN não é afiliado, associado ou endossado pela Valve Corporation. Counter-Strike e CS2 são marcas da Valve.
        <br/>© ${new Date().getFullYear()} PIRATAOSKIN — Projeto de demonstração.
      </div>
    </footer>`;
  }

  function goSearch(e) {
    e.preventDefault();
    const q = e.target.q.value.trim();
    window.location.href = "catalogo.html" + (q ? "?q=" + encodeURIComponent(q) : "");
    return false;
  }

  /* ---------- card de skin ---------- */
  function cardHTML(s) {
    const cor = D.raridadeCor[s.raridade];
    const wearTxt = s.wear ? `${D.wearLabels[s.wear]}` : "—";
    const floatBar = s.float != null
      ? `<div class="floatbar"><span class="mk" style="left:${(s.float * 100).toFixed(1)}%"></span></div>
         <div class="floatval tnum">Float ${s.float.toFixed(4)}</div>`
      : `<div style="height:5px;margin:.45rem 0 .2rem"></div><div class="floatval">Item sem desgaste</div>`;
    return `
    <div class="card" style="border-top-color:${cor}">
      <div class="thumb" style="background:${rarityGradient(s.raridade)}">
        <span class="badge" style="color:${cor}">${D.raridadeNome[s.raridade]}</span>
        ${s.stattrak ? `<span class="badge-st">StatTrak™</span>` : ""}
        ${s.image
          ? `<img class="skinimg" src="${s.image}" alt="${s.arma} | ${s.skin}" loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
             <span class="wpn" style="display:none">${s.arma}<br>${s.skin}</span>`
          : `<span class="wpn">${s.arma}<br>${s.skin}</span>`}
      </div>
      <div class="body">
        <span class="wpnlabel">${s.arma}</span>
        <span class="skinname">${s.skin}</span>
        <span class="wearline">${wearTxt}${s.stattrak ? " • ST™" : ""}</span>
        ${floatBar}
        <div class="pricerow">
          <span class="price tnum">${brl(s.preco)}</span>
          <button class="btn btn-gold btn-sm" onclick="PIRATA.addToCart('${s.id}')">Comprar</button>
        </div>
      </div>
    </div>`;
  }

  function renderGrid(target, list) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    if (!list.length) {
      el.outerHTML = `<div class="empty"><div class="big">🪙</div><p>Nenhuma skin encontrada nesse baú. Tente outros filtros, marujo!</p></div>`;
      return;
    }
    el.innerHTML = list.map(cardHTML).join("");
  }

  /* ---------- autenticação Steam (real) ---------- */
  let currentUser = null;

  async function refreshAuth() {
    try {
      const r = await fetch("/api/me", { credentials: "same-origin" });
      const data = await r.json();
      currentUser = data.user;
    } catch {
      currentUser = null;
    }
    renderAuthArea();
    document.dispatchEvent(new CustomEvent("auth:change", { detail: currentUser }));
    return currentUser;
  }

  function renderAuthArea() {
    const el = document.getElementById("auth-area");
    if (!el) return;
    if (currentUser) {
      const av = currentUser.avatar
        ? `<img src="${currentUser.avatar}" alt="" style="width:26px;height:26px;border-radius:50%;border:1px solid var(--gold)" />`
        : "⚓";
      const adminBtn = currentUser.admin
        ? `<a class="btn btn-ghost btn-sm" href="/admin.html" title="Painel admin">⚙ Admin</a>`
        : "";
      el.innerHTML =
        `<div style="display:flex;align-items:center;gap:.5rem">
           ${adminBtn}
           <span style="display:flex;align-items:center;gap:.45rem;background:var(--bg-elev);border:1px solid var(--border);border-radius:.6rem;padding:.35rem .6rem;font-weight:600;font-size:.85rem">
             ${av}<span class="hide-sm">${currentUser.name}</span>
           </span>
           <a class="btn btn-soft btn-sm" href="/auth/logout" title="Sair">Sair</a>
         </div>`;
    } else {
      el.innerHTML = `<a class="btn btn-gold btn-sm" href="/auth/steam">Entrar com Steam</a>`;
    }
  }

  function getUser() { return currentUser; }

  /* ---------- inventário / preço reais ---------- */
  // Extrai um SteamID64 (17 dígitos) de um ID puro ou URL /profiles/<id>.
  function parseSteamId(input) {
    if (!input) return null;
    const s = input.toString().trim();
    let m = s.match(/(\d{17})/);
    return m ? m[1] : null;
  }

  async function loadInventory(steamid) {
    const qs = steamid ? "?steamid=" + encodeURIComponent(steamid) : "";
    const r = await fetch("/api/inventory" + qs, { credentials: "same-origin" });
    return r.json();
  }

  async function fetchPrice(marketHashName) {
    try {
      const r = await fetch("/api/price?name=" + encodeURIComponent(marketHashName), { credentials: "same-origin" });
      if (!r.ok) return null;
      return r.json();
    } catch { return null; }
  }

  // Converte "R$ 1.234,56" -> 1234.56 (number) ou null.
  function parseBRL(str) {
    if (!str) return null;
    const n = parseFloat(str.replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  }

  // Card de item REAL à venda na loja (inventário do admin), com preço de mercado.
  function storeCardHTML(it) {
    const cor = it.rarityColor || "#5E98D9";
    const priceHtml = it.price != null
      ? brl(it.price)
      : '<span style="color:var(--text-muted);font-size:.82rem">cotando…</span>';
    return `
    <div class="card" style="border-top-color:${cor}">
      <div class="thumb" style="background:radial-gradient(circle at 50% 35%, ${cor}55, transparent 60%), linear-gradient(135deg,#0e1a28,#1b2c40)">
        ${it.rarity ? `<span class="badge" style="color:${cor}">${it.rarity}</span>` : ""}
        ${it.image ? `<img class="skinimg" src="${it.image}" alt="${it.name}" loading="lazy" />` : `<span class="wpn">${it.name}</span>`}
      </div>
      <div class="body">
        <span class="skinname" style="font-size:.9rem">${it.name}</span>
        <span class="wearline">${it.wear || it.type || "—"}</span>
        <div class="pricerow">
          <span class="price tnum" data-price-for="${it.id}">${priceHtml}</span>
          <button class="btn btn-gold btn-sm" data-buy="${it.id}">Comprar</button>
        </div>
      </div>
    </div>`;
  }

  function renderStore(target, items) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    items.forEach(registerStoreItem);
    el.innerHTML = items.map(storeCardHTML).join("");
    el.querySelectorAll("[data-buy]").forEach((b) =>
      b.addEventListener("click", () => addToCart(b.dataset.buy))
    );
    fillStorePrices(el, items);
  }

  // Coteja preços faltantes em série (respeita o rate limit do Steam Market).
  async function fillStorePrices(el, items) {
    for (const it of items) {
      if (it.price != null) continue;
      const span = el.querySelector('[data-price-for="' + it.id + '"]');
      let p = null;
      try { p = await fetchPrice(it.market_hash_name); } catch {}
      const val = p ? (p.price != null ? p.price : parseBRL(p.lowest)) : null;
      if (val != null) { it.price = val; registerStoreItem(it); if (span) span.textContent = brl(val); }
      else if (span) span.textContent = "s/ preço";
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  // Card para item REAL do inventário (sem float, com selo de tradable).
  function inventoryCardHTML(it) {
    const cor = it.rarityColor || "#5E98D9";
    return `
    <div class="card" style="border-top-color:${cor}">
      <div class="thumb" style="background:radial-gradient(circle at 50% 35%, ${cor}55, transparent 60%), linear-gradient(135deg,#0e1a28,#1b2c40)">
        ${it.rarity ? `<span class="badge" style="color:${cor}">${it.rarity}</span>` : ""}
        ${it.image
          ? `<img class="skinimg" src="${it.image}" alt="" loading="lazy" />`
          : `<span class="wpn">${it.name}</span>`}
      </div>
      <div class="body">
        <span class="skinname" style="font-size:.9rem">${it.name}</span>
        <span class="wearline">${it.wear || it.type || "—"}</span>
        <div class="pricerow">
          <span class="price tnum" data-price>—</span>
          <span class="btn btn-soft btn-sm sel-tag">Selecionar</span>
        </div>
      </div>
    </div>`;
  }

  /* expõe API global */
  window.PIRATA = {
    D, brl, skinById, rarityGradient,
    getCart, setCart, addToCart, removeFromCart, cartTotal, updateCartBadge,
    renderGrid, cardHTML, toast, goSearch,
    refreshAuth, getUser,
    parseSteamId, loadInventory, fetchPrice, parseBRL, inventoryCardHTML,
    storeCardHTML, renderStore, registerStoreItem, cartContains,
  };

  document.addEventListener("DOMContentLoaded", () => {
    renderHeader();
    renderFooter();
    updateCartBadge();
    refreshAuth();
    // feedback pós-login
    const p = new URLSearchParams(location.search).get("login");
    if (p === "ok") toast("⚓ Login com Steam realizado!");
    else if (p === "falhou" || p === "erro") toast("Não foi possível entrar com a Steam.");
  });
})();
