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
  // [ícone, título, subtítulo, href]
  function navLinks() {
    return [
      ["⚓", "Mercado", "Comprar skins", "catalogo.html"],
      ["🪙", "Contrabando", "Vender skins", "vender.html"],
      ["🔄", "Trocas", "Upgrades", "upgrade.html"],
      ["📖", "Diário de Bordo", "Histórico", "meu-historico.html"],
      ["🍺", "Taverna", "FAQ & Suporte", "#faq"],
    ];
  }

  function renderHeader() {
    const host = document.getElementById("site-header");
    if (!host) return;
    const nav = navLinks().map(([ico, t, sub, h]) =>
      `<a href="${h}"><span>${ico} ${t}</span><span class="nsub">${sub}</span></a>`).join("");
    const navMobile = navLinks().map(([ico, t, sub, h]) => `<a href="${h}">${ico} ${t} <span style="color:var(--text-muted)">— ${sub}</span></a>`).join("");
    host.innerHTML = `
    <header class="header">
      <div class="wrap header-inner">
        <a class="logo display" href="index.html"><img src="img/logo.png" alt="PIRATAOSKIN" class="logo-img" /></a>
        <nav class="nav">${nav}</nav>
        <form class="search" onsubmit="return PIRATA.goSearch(event)">
          ${searchSVG}<input type="search" name="q" placeholder="Buscar skin, arma, coleção..." />
        </form>
        <div class="header-actions">
          <div class="wallet" title="Sua carteira">🪙 <b>R$ 0,00</b></div>
          <a class="icon-btn" href="carrinho.html" aria-label="Carrinho">
            ${cartSVG}<span class="cart-badge" data-cart-badge style="display:none">0</span>
          </a>
          <div id="auth-area"><a class="btn btn-gold btn-sm" href="/auth/steam">Entrar com Steam</a></div>
          <button class="icon-btn burger" aria-label="Menu" onclick="document.getElementById('mobile-menu').classList.toggle('open')">☰</button>
        </div>
      </div>
      <div class="wrap"><div class="mobile-menu" id="mobile-menu">${navMobile}</div></div>
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
          <a class="logo display" href="index.html"><img src="img/logo.png" alt="PIRATAOSKIN" class="logo-img" style="max-height:64px" /></a>
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

  /* ---------- Papagaio do Capitão (chatbot pirata) ---------- */
  const WHATSAPP = "5551995426032";
  // base de conhecimento: cada regra tem palavras-chave e resposta pirata
  const botKB = [
    { k: ["ola","olá","oi","eai","e ai","salve","bom dia","boa tarde","boa noite","hello"],
      a: "Arrr, avante marujo! 🦜 Aqui é o Papagaio do Capitão. Pergunta o que quiseres sobre o tesouro: comprar, vender, pagamento, entrega, segurança..." },
    { k: ["comprar","compra","como compro","adquirir"],
      a: "Pra fisgar uma skin: escolhe no <b>Mercado</b> ⚓, joga no carrinho e paga no Pix. Assim que o ouro cai, o bot dispara a trade na tua Steam na hora! 🪙" },
    { k: ["vender","venda","vender minhas","quero vender"],
      a: "Pra largar tuas skins no nosso porão: vai em <b>Contrabando</b> 🪙, conecta teu inventário, escolhe as peças e informa tua chave Pix. O bot pede a trade e o ouro cai após recebermos as skins! 💰" },
    { k: ["pagamento","pagar","pix","cartao","cartão","parcelar","parcela","12x","boleto"],
      a: "Aceitamos <b>Pix</b> (aprovação na hora ⚡) e <b>cartão em até 12x</b> 💳. Sem mistério, marujo!" },
    { k: ["entrega","receber","quando","prazo","demora","quanto tempo"],
      a: "A entrega é <b>automática e instantânea</b> via trade na Steam assim que o pagamento é confirmado. Rapidinho que nem corsário! ⚡🏴‍☠️" },
    { k: ["trade url","tradeurl","trade","link de troca","url"],
      a: "Tua <b>Trade URL</b> tu pegas na Steam em: Inventário → Trade Offers → 'Who can send me Trade Offers?'. Cola ela no carrinho que o bote faz o resto! 🚢" },
    { k: ["seguro","seguranca","segurança","confiavel","confiável","golpe","roubo","medo"],
      a: "Águas tranquilas, marujo! 🛡️ Usamos um <b>bot de escrow</b>: o ouro só é liberado depois que a skin troca de mãos de verdade. Ninguém fica a ver navios." },
    { k: ["upgrade","trocar por","melhorar skin","troca de skin"],
      a: "No <b>Trocas</b> 🔄 tu dás tuas skins de entrada (vale 85% do mercado) e pagas só a diferença pra subir pra uma skin melhor. Sobe de nível no arsenal! ⚔️" },
    { k: ["taxa","desconto","comissao","comissão","quanto fica","margem"],
      a: "Nos preços de pirata o que tu vês é o que paga 🪙. Na venda, tu recebes 85% do valor de mercado da peça." },
    { k: ["historico","histórico","meus pedidos","minhas compras","diario","diário"],
      a: "Teu <b>Diário de Bordo</b> 📖 guarda todas as tuas compras, vendas e o ouro movimentado. Tá no menu lá em cima!" },
    { k: ["obrigado","valeu","brigado","obg","tks","thanks"],
      a: "Arrr, é um prazer servir! 🦜 Que os ventos te levem a bons tesouros, marujo!" },
    { k: ["steam","login","entrar","logar","conta"],
      a: "Pra entrar, clica em <b>Entrar com Steam</b> ⚓ no topo. É login oficial da Steam, sem senha passando por aqui!" },
  ];

  function botReply(text) {
    const t = (" " + text.toLowerCase() + " ").replace(/[.,!?]/g, " ");
    for (const rule of botKB) {
      if (rule.k.some((kw) => t.includes(kw))) return { found: true, msg: rule.a };
    }
    return { found: false, msg: "Arrr... essa nem o velho Capitão sabe responder! 🤔 <b>Queres um atendimento personalizado</b> com a tripulação de verdade?" };
  }

  function initChatbot() {
    if (document.getElementById("pirata-chat")) return;
    const wrap = document.createElement("div");
    wrap.id = "pirata-chat";
    wrap.innerHTML = `
      <button class="pc-fab" id="pc-fab" aria-label="Abrir chat">🦜<span class="pc-dot"></span></button>
      <div class="pc-box" id="pc-box" role="dialog" aria-label="Papagaio do Capitão">
        <div class="pc-head">
          <span class="pc-av">🦜</span>
          <div><b>Papagaio do Capitão</b><i>IA da tripulação · online</i></div>
          <button class="pc-x" id="pc-x" aria-label="Fechar">✕</button>
        </div>
        <div class="pc-msgs" id="pc-msgs"></div>
        <div class="pc-quick" id="pc-quick"></div>
        <form class="pc-input" id="pc-form">
          <input id="pc-text" autocomplete="off" placeholder="Pergunta ao papagaio, marujo..." />
          <button type="submit" aria-label="Enviar">➤</button>
        </form>
      </div>`;
    document.body.appendChild(wrap);

    const box = wrap.querySelector("#pc-box");
    const msgs = wrap.querySelector("#pc-msgs");
    const quick = wrap.querySelector("#pc-quick");
    let greeted = false, pendingHandoff = false;

    function add(side, html) {
      const m = document.createElement("div");
      m.className = "pc-msg " + side;
      m.innerHTML = html;
      msgs.appendChild(m);
      msgs.scrollTop = msgs.scrollHeight;
    }
    function botSay(html, delay) {
      const typing = document.createElement("div");
      typing.className = "pc-msg bot pc-typing";
      typing.innerHTML = "<span></span><span></span><span></span>";
      msgs.appendChild(typing); msgs.scrollTop = msgs.scrollHeight;
      setTimeout(() => { typing.remove(); add("bot", html); }, delay || 650);
    }
    function whatsappLink() {
      const txt = encodeURIComponent("Ahoy! Vim do site PIRATAOSKIN e quero um atendimento personalizado, marujo. 🏴‍☠️");
      return "https://wa.me/" + WHATSAPP + "?text=" + txt;
    }
    function offerHandoff() {
      pendingHandoff = true;
      quick.innerHTML =
        '<button data-yes>✅ Sim, falar no WhatsApp</button>' +
        '<button data-no>Não, continuar aqui</button>';
      quick.querySelector("[data-yes]").onclick = () => {
        add("me", "Sim, quero atendimento personalizado");
        botSay("Içar velas pro WhatsApp! 🦜 Te levando pra falar com a tripulação...", 500);
        setTimeout(() => window.open(whatsappLink(), "_blank"), 900);
        quick.innerHTML = ""; pendingHandoff = false;
      };
      quick.querySelector("[data-no]").onclick = () => {
        add("me", "Não, continuar aqui");
        botSay("Beleza, marujo! Manda outra pergunta que eu tento desvendar. 🗺️", 400);
        quick.innerHTML = ""; pendingHandoff = false;
      };
    }
    function renderQuick() {
      if (pendingHandoff) return;
      const opts = ["Como comprar?", "Como vender?", "Formas de pagamento", "É seguro?"];
      quick.innerHTML = opts.map((o) => '<button data-q="' + o + '">' + o + "</button>").join("");
      quick.querySelectorAll("[data-q]").forEach((b) => {
        b.onclick = () => handleUser(b.dataset.q);
      });
    }
    function handleUser(text) {
      add("me", text.replace(/</g, "&lt;"));
      quick.innerHTML = "";
      const r = botReply(text);
      botSay(r.msg, 700);
      if (!r.found) setTimeout(offerHandoff, 800);
      else setTimeout(renderQuick, 800);
    }

    function openChat() {
      box.classList.add("open");
      wrap.querySelector("#pc-fab").classList.add("hide");
      if (!greeted) {
        greeted = true;
        botSay("Arrr, avante marujo! 🦜 Eu sou o <b>Papagaio do Capitão</b>, a IA dessa nau. Pergunta o que quiseres sobre comprar, vender, pagamento ou entrega de skins!", 400);
        setTimeout(renderQuick, 1100);
      }
    }
    function closeChat() {
      box.classList.remove("open");
      wrap.querySelector("#pc-fab").classList.remove("hide");
    }

    wrap.querySelector("#pc-fab").onclick = openChat;
    wrap.querySelector("#pc-x").onclick = closeChat;
    wrap.querySelector("#pc-form").onsubmit = (e) => {
      e.preventDefault();
      const inp = wrap.querySelector("#pc-text");
      const v = inp.value.trim();
      if (!v) return;
      inp.value = "";
      handleUser(v);
    };

    // abre sozinho ao rolar a página (uma vez), com alô pirata
    let autoOpened = false;
    function onScroll() {
      if (autoOpened) return;
      if (window.scrollY > 500) {
        autoOpened = true;
        window.removeEventListener("scroll", onScroll);
        openChat();
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderHeader();
    renderFooter();
    updateCartBadge();
    refreshAuth();
    initChatbot();
    // feedback pós-login
    const p = new URLSearchParams(location.search).get("login");
    if (p === "ok") toast("⚓ Login com Steam realizado!");
    else if (p === "falhou" || p === "erro") toast("Não foi possível entrar com a Steam.");
  });
})();
