/* PIRATAOSKIN — backend real.
   - Login via Steam (OpenID 2.0, sem API key).
   - Inventario real de CS2 (loja = inventario do storeSteamId; e do usuario logado).
   - Preco real em BRL (Steam Market priceoverview, currency=7) com cache em disco.
   - Persistencia simples em JSON (usuarios + pedidos).
   - Admin: gestao de usuarios + painel financeiro (restrito a adminSteamIds).
   - Pagamento PIX real via Mercado Pago (cobranca + status + webhook).
   Requer: express, express-session. Node 18+ (fetch nativo).
*/
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const { MongoClient } = require("mongodb");
const { SteamBot } = require("./bot/steam-bot");

const app = express();
const PORT = process.env.PORT || 5500;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");

const STEAM_OPENID = "https://steamcommunity.com/openid/login";
const APPID_CS2 = 730;
const CONTEXTID = 2;
const IMG_BASE = "https://community.cloudflare.steamstatic.com/economy/image/";
const MP_API = "https://api.mercadopago.com";

/* ---------- config ---------- */
function loadConfig() {
  const local = path.join(ROOT, "config.local.json");
  const example = path.join(ROOT, "config.example.json");
  const file = fs.existsSync(local) ? local : example;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return {}; }
}
const CONFIG = loadConfig();
const ADMIN_IDS = new Set(CONFIG.adminSteamIds || []);
const STORE_STEAMID = CONFIG.storeSteamId || (CONFIG.adminSteamIds || [])[0] || "";
// Token padrão (config/env). Pode ser sobrescrito pelo painel admin (db.settings).
const MP_TOKEN_DEFAULT = (CONFIG.mercadoPago && CONFIG.mercadoPago.accessToken) || process.env.MP_ACCESS_TOKEN || "";

/* ---------- persistencia ----------
   Prioridade: MongoDB (persistente) se MONGODB_URI existir; senao JSON local (efemero no Render).
*/
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, "db.json");
const PRICE_FILE = path.join(DATA_DIR, "prices.json");
const MONGODB_URI = process.env.MONGODB_URI || (CONFIG.mongodbUri || "");

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function writeJSON(file, obj) {
  try { fs.writeFileSync(file, JSON.stringify(obj, null, 2)); } catch (e) { console.error("writeJSON", e.message); }
}
let db = readJSON(DB_FILE, { users: {}, orders: [], settings: {} });
if (!db.users) db.users = {};
if (!db.orders) db.orders = [];
if (!db.settings) db.settings = {};

let mongoClient = null;
let mongoCol = null; // colecao "appdata" com 1 documento { _id:"main", data: db }

async function initMongo() {
  if (!MONGODB_URI) {
    console.log("[db] MONGODB_URI ausente — usando JSON local (DADOS EFEMEROS no Render).");
    return false;
  }
  // Garante resolucao de registros SRV (mongodb+srv) priorizando DNS publico —
  // algumas redes/ISPs nao resolvem SRV pelo DNS padrao.
  try {
    const dns = require("dns");
    const cur = dns.getServers ? dns.getServers() : [];
    dns.setServers([...new Set(["8.8.8.8", "1.1.1.1", ...cur])]);
  } catch (e) { /* segue com DNS padrao */ }
  try {
    mongoClient = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    await mongoClient.connect();
    mongoCol = mongoClient.db().collection("appdata");
    const doc = await mongoCol.findOne({ _id: "main" });
    if (doc && doc.data) {
      db = doc.data;
      if (!db.users) db.users = {};
      if (!db.orders) db.orders = [];
      if (!db.settings) db.settings = {};
      console.log("[db] MongoDB conectado. Pedidos:", db.orders.length, "| Usuarios:", Object.keys(db.users).length);
    } else {
      // primeira vez: grava o estado atual (migra o JSON local, se houver)
      await mongoCol.updateOne({ _id: "main" }, { $set: { data: db } }, { upsert: true });
      console.log("[db] MongoDB conectado (banco novo — estado inicial gravado).");
    }
    return true;
  } catch (e) {
    console.error("[db] FALHA ao conectar no MongoDB:", e.message, "— caindo p/ JSON local.");
    mongoCol = null;
    return false;
  }
}

function saveDB() {
  if (mongoCol) {
    mongoCol.updateOne({ _id: "main" }, { $set: { data: db } }, { upsert: true })
      .catch((e) => console.error("[db] saveDB mongo:", e.message));
  } else {
    writeJSON(DB_FILE, db);
  }
}

// Token do Mercado Pago: painel admin (db.settings) tem prioridade sobre config/env.
function getMpToken() {
  return (db.settings && db.settings.mpAccessToken) || MP_TOKEN_DEFAULT || "";
}

/* ---------- Steam Trade Bot (escrow de itens) ---------- */
function getBotConfig() {
  const fromFile = CONFIG.botSteam || {};
  const fromDb = (db.settings && db.settings.botSteam) || {};
  return { ...fromFile, ...fromDb, botSteamId: STORE_STEAMID };
}
const bot = new SteamBot(getBotConfig());

// Persiste refresh token do bot para logins futuros sem senha.
bot.on("refreshToken", (token) => {
  db.settings.botSteam = db.settings.botSteam || {};
  db.settings.botSteam.refreshToken = token;
  saveDB();
});

// Mapeia mudanças de oferta -> estado do pedido (libera valor só após confirmação).
bot.on("offer", (ev) => {
  const order = db.orders.find((o) => o.offerId && String(o.offerId) === String(ev.offerId));
  if (!order) return;
  order.tradeState = ev.state;
  const now = new Date().toISOString();
  if (ev.state === "accepted") {
    if (order.type === "sell") {
      // recebemos a skin do vendedor -> liberar pagamento (payout)
      order.status = "payout_pending";
      order.itemsReceivedAt = now;
    } else {
      // comprador recebeu a skin -> pedido concluído
      order.status = "completed";
      order.deliveredAt = now;
    }
  } else if (ev.state === "declined" || ev.state === "canceled") {
    order.status = order.type === "sell" ? "canceled" : "delivery_failed";
  }
  saveDB();
  console.log("[bot] oferta", ev.offerId, "->", ev.state, "| pedido", order.id, "->", order.status);
});

// Dispara a entrega da skin ao comprador (após pagamento confirmado).
async function deliverPaidOrder(order) {
  if (!order || order.type !== "buy") return;
  if (order.offerId || ["trade_sent", "completed"].includes(order.status)) return;
  if (!order.tradeUrl) { order.status = "aguardando_trade_url"; saveDB(); return; }
  try {
    const r = await bot.sendItems({
      tradeUrl: order.tradeUrl,
      assetIds: order.assetIds || [],
      message: "PIRATAOSKIN — entrega do pedido " + order.id,
    });
    order.offerId = r.offerId;
    order.status = "trade_sent";
    order.tradeState = r.state;
    saveDB();
    console.log("[bot] entrega enviada do pedido", order.id, "oferta", r.offerId);
  } catch (e) {
    order.status = "delivery_failed";
    order.deliveryError = e.message;
    saveDB();
    console.error("[bot] falha na entrega do pedido", order.id, e.message);
  }
}
let priceCache = readJSON(PRICE_FILE, {}); // name -> { price (number), display, ts }
const PRICE_TTL = 30 * 60 * 1000;
function savePrices() { writeJSON(PRICE_FILE, priceCache); }

/* ---------- app ---------- */
app.set("trust proxy", 1);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "pirataoskin-dev-secret-troque-em-producao",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);

/* ---------- helpers ---------- */
function baseUrl(req) {
  return process.env.BASE_URL || req.protocol + "://" + req.get("host");
}
function isAdmin(steamid) { return ADMIN_IDS.has(steamid); }
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "nao_autenticado" });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || !isAdmin(req.session.user.steamid))
    return res.status(403).json({ error: "acesso_negado" });
  next();
}
function parseBRL(str) {
  if (!str) return null;
  const n = parseFloat(String(str).replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

/* ---------- Steam OpenID ---------- */
function buildSteamRedirect(base) {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": base + "/auth/steam/return",
    "openid.realm": base,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return STEAM_OPENID + "?" + params.toString();
}
async function verifySteamOpenId(query) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (k.startsWith("openid.")) params.append(k, v);
  params.set("openid.mode", "check_authentication");
  const resp = await fetch(STEAM_OPENID, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await resp.text();
  if (!/is_valid\s*:\s*true/i.test(text)) return null;
  const m = (query["openid.claimed_id"] || "").match(/\/openid\/id\/(\d{17})$/);
  return m ? m[1] : null;
}
async function fetchProfile(steamid) {
  try {
    const r = await fetch("https://steamcommunity.com/profiles/" + steamid + "?xml=1", {
      headers: { "User-Agent": "Mozilla/5.0 PIRATAOSKIN" },
    });
    const xml = await r.text();
    const name = (xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/) || [])[1] || "Capitão";
    const avatar = (xml.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/) || [])[1] || "";
    return { name, avatar };
  } catch { return { name: "Capitão", avatar: "" }; }
}

/* ---------- auth routes ---------- */
app.get("/auth/steam", (req, res) => res.redirect(buildSteamRedirect(baseUrl(req))));

app.get("/auth/steam/return", async (req, res) => {
  try {
    const steamid = await verifySteamOpenId(req.query);
    if (!steamid) return res.redirect("/?login=falhou");
    const profile = await fetchProfile(steamid);
    const now = new Date().toISOString();
    const existing = db.users[steamid];
    db.users[steamid] = {
      steamid,
      name: profile.name,
      avatar: profile.avatar,
      admin: isAdmin(steamid),
      firstLogin: existing ? existing.firstLogin : now,
      lastLogin: now,
      logins: (existing ? existing.logins || 0 : 0) + 1,
    };
    saveDB();
    req.session.user = { steamid, name: profile.name, avatar: profile.avatar, admin: isAdmin(steamid) };
    res.redirect("/?login=ok");
  } catch (e) { res.redirect("/?login=erro"); }
});

app.get("/auth/logout", (req, res) => req.session.destroy(() => res.redirect("/")));

app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));

app.get("/api/my-orders", requireAuth, (req, res) => {
  const steamid = req.session.user.steamid;
  const orders = db.orders.filter((o) => o.steamid === steamid).slice().reverse();
  const buys = orders.filter((o) => (o.type || "buy") === "buy");
  const sells = orders.filter((o) => o.type === "sell");
  const totalSpent = buys.reduce((s, o) => s + (o.status === "paid" || o.status === "completed" ? o.total : 0), 0);
  const totalEarned = sells.reduce((s, o) => s + (o.status === "paid_out" ? o.total : 0), 0);
  res.json({
    orders,
    buys,
    sells,
    stats: {
      totalOrders: orders.length,
      totalBuys: buys.length,
      totalSells: sells.length,
      totalSpent,
      totalEarned,
      balance: totalEarned - totalSpent,
    },
  });
});

/* ---------- inventario + preco ---------- */
function tagValue(tags, category) {
  if (!tags) return null;
  const t = tags.find((x) => x.category === category);
  return t ? (t.localized_tag_name || t.name) : null;
}
function rarityColorFromTags(tags) {
  if (!tags) return null;
  const t = tags.find((x) => x.category === "Rarity");
  return t && t.color ? "#" + t.color : null;
}
async function fetchInventory(steamid) {
  const url = "https://steamcommunity.com/inventory/" + steamid + "/" + APPID_CS2 + "/" + CONTEXTID + "?l=english&count=2000";
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 PIRATAOSKIN" } });
  if (r.status === 403 || r.status === 401) return { error: "private", items: [] };
  if (!r.ok) return { error: "http_" + r.status, items: [] };
  const data = await r.json();
  if (!data || !data.assets) return { error: "vazio", items: [] };
  const desc = {};
  for (const d of data.descriptions) desc[d.classid + "_" + d.instanceid] = d;
  const items = [];
  for (const a of data.assets) {
    const d = desc[a.classid + "_" + a.instanceid];
    if (!d) continue;
    items.push({
      assetid: a.assetid,
      name: d.market_name || d.name,
      market_hash_name: d.market_hash_name,
      image: d.icon_url ? IMG_BASE + d.icon_url + "/256fx256f" : "",
      type: d.type || "",
      wear: tagValue(d.tags, "Exterior"),
      rarity: tagValue(d.tags, "Rarity"),
      rarityColor: rarityColorFromTags(d.tags),
      tradable: d.tradable === 1,
      marketable: d.marketable === 1,
    });
  }
  return { items, count: items.length };
}

app.get("/api/inventory", async (req, res) => {
  const steamid = (req.query.steamid || (req.session.user && req.session.user.steamid) || "").toString().trim();
  if (!/^\d{17}$/.test(steamid)) return res.status(400).json({ error: "steamid_invalido", items: [] });
  try { res.json(await fetchInventory(steamid)); }
  catch (e) { res.status(502).json({ error: "falha_steam", detail: e.message, items: [] }); }
});

async function getPrice(name) {
  const c = priceCache[name];
  if (c && Date.now() - c.ts < PRICE_TTL) return c;
  const r = await fetch(
    "https://steamcommunity.com/market/priceoverview/?appid=" + APPID_CS2 + "&currency=7&market_hash_name=" + encodeURIComponent(name),
    { headers: { "User-Agent": "Mozilla/5.0 PIRATAOSKIN" } }
  );
  if (r.status === 429) { const e = new Error("rate_limit"); e.code = 429; throw e; }
  const d = await r.json();
  const display = d.lowest_price || d.median_price || null;
  const entry = { ok: !!d.success, price: parseBRL(display), display, volume: d.volume || null, ts: Date.now() };
  priceCache[name] = entry; savePrices();
  return entry;
}

app.get("/api/price", async (req, res) => {
  const name = (req.query.name || "").toString();
  if (!name) return res.status(400).json({ error: "sem_nome" });
  try {
    const e = await getPrice(name);
    res.json({ ok: e.ok, lowest: e.display, price: e.price, volume: e.volume });
  } catch (e) {
    if (e.code === 429) return res.status(429).json({ error: "rate_limit" });
    res.status(502).json({ error: "falha_steam", detail: e.message });
  }
});

/* ---------- loja (inventario do storeSteamId, com markup) ---------- */
const STORE_MARKUP = 1.0; // 1.0 = preco de mercado; ajuste para margem (ex.: 1.08)
app.get("/api/store", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "12", 10) || 12, 240);
  if (!/^\d{17}$/.test(STORE_STEAMID)) return res.status(400).json({ error: "store_nao_configurada", items: [] });
  try {
    const inv = await fetchInventory(STORE_STEAMID);
    if (inv.error) return res.json(inv);
    const marketable = inv.items.filter((i) => i.marketable);
    // anexa preco (do cache) a TODOS os itens
    const withPrice = marketable.map((i) => {
      const c = priceCache[i.market_hash_name];
      const price = c && c.price != null ? Math.round(c.price * STORE_MARKUP * 100) / 100 : null;
      return { ...i, id: i.assetid, price }; // id = assetid (chave usada nos cards/carrinho)
    });
    // ordena SEMPRE do mais caro p/ o mais barato (itens sem preco ficam por ultimo)
    withPrice.sort((a, b) => {
      if (a.price == null && b.price == null) return 0;
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return b.price - a.price;
    });
    res.json({ items: withPrice.slice(0, limit), count: marketable.length });
  } catch (e) { res.status(502).json({ error: "falha_steam", detail: e.message, items: [] }); }
});

/* ---------- pedidos ---------- */
app.post("/api/orders", requireAuth, (req, res) => {
  const { items, total, method } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "pedido_vazio" });
  const order = {
    id: "PO-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 1000),
    steamid: req.session.user.steamid,
    buyer: req.session.user.name,
    items: items.map((i) => ({ name: i.name, price: Number(i.price) || 0 })),
    total: Number(total) || 0,
    method: method || "pix",
    status: "pending",
    mpPaymentId: null,
    createdAt: new Date().toISOString(),
    paidAt: null,
  };
  db.orders.push(order); saveDB();
  res.json({ ok: true, order });
});

/* ---------- venda (usuário vende skins para a loja) ---------- */
app.post("/api/sell", requireAuth, async (req, res) => {
  const { items, tradeUrl, pixKey } = req.body || {};
  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) return res.status(400).json({ error: "sem_itens" });
  if (!tradeUrl) return res.status(400).json({ error: "sem_trade_url", msg: "Informe sua Trade URL da Steam." });
  if (!pixKey) return res.status(400).json({ error: "sem_pix", msg: "Informe sua chave PIX para receber." });
  const user = req.session.user;
  const assetIds = arr.map((i) => i.assetid || i.id).filter((id) => /^\d+$/.test(String(id)));
  const market = arr.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const payout = Math.round(market * 0.85 * 100) / 100; // você recebe 85%
  const order = {
    id: "SO-" + Date.now().toString(36).toUpperCase(),
    type: "sell",
    steamid: user.steamid, buyer: user.name,
    items: arr.map((i) => ({ name: i.name, price: Number(i.price) || 0, id: i.assetid || i.id, image: i.image || null })),
    assetIds,
    tradeUrl, pixKey,
    market, total: payout, method: "pix_payout",
    status: "awaiting_items",
    offerId: null, tradeState: null,
    createdAt: new Date().toISOString(), itemsReceivedAt: null, paidOutAt: null,
  };
  try {
    const r = await bot.requestItems({
      tradeUrl, assetIds,
      message: "PIRATAOSKIN — venda " + order.id + ". Aceite para enviar suas skins; o PIX é liberado após o recebimento.",
    });
    order.offerId = r.offerId;
    order.tradeState = r.state;
    order.status = "trade_sent";
  } catch (e) {
    order.status = "trade_failed";
    order.tradeError = e.message;
  }
  db.orders.push(order); saveDB();
  res.json({ ok: order.status === "trade_sent", order: { id: order.id, status: order.status, offerId: order.offerId, payout }, error: order.tradeError });
});

/* ---------- Mercado Pago: cobranca PIX ---------- */
async function mpCreatePixPayment({ amount, description, email, name }) {
  const token = getMpToken();
  if (!token) { const e = new Error("mp_sem_token"); e.code = "no_token"; throw e; }
  const body = {
    transaction_amount: Math.round(amount * 100) / 100,
    description: description || "Pedido PIRATAOSKIN",
    payment_method_id: "pix",
    payer: { email: email || CONFIG.payerEmailFallback || "comprador@pirataoskin.com", first_name: name || "Cliente" },
  };
  const r = await fetch(MP_API + "/v1/payments", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) { const e = new Error(d.message || "mp_erro"); e.detail = d; throw e; }
  return d;
}

app.post("/api/checkout/pix", requireAuth, async (req, res) => {
  const { items, total, tradeUrl } = req.body || {};
  const amount = Number(total);
  if (!amount || amount <= 0) return res.status(400).json({ error: "valor_invalido" });
  if (!getMpToken()) return res.status(503).json({ error: "mp_sem_token", msg: "Configure o Access Token do Mercado Pago no painel admin." });
  const arr = Array.isArray(items) ? items : [];
  const assetIds = arr.map((i) => i.id).filter((id) => /^\d+$/.test(String(id))); // ids reais = assetids
  try {
    const user = req.session.user;
    const pay = await mpCreatePixPayment({
      amount,
      description: "PIRATAOSKIN — " + arr.length + " skin(s)",
      email: user.steamid + "@pirataoskin.com",
      name: user.name,
    });
    const approved = pay.status === "approved";
    const order = {
      id: "PO-" + Date.now().toString(36).toUpperCase(),
      type: "buy",
      steamid: user.steamid, buyer: user.name,
      items: arr.map((i) => ({ name: i.name, price: Number(i.price) || 0, id: i.id, image: i.image || null })),
      assetIds,
      tradeUrl: tradeUrl || null,
      total: amount, method: "pix",
      status: approved ? "paid" : "pending",
      mpPaymentId: pay.id,
      offerId: null, tradeState: null,
      createdAt: new Date().toISOString(), paidAt: approved ? new Date().toISOString() : null,
    };
    db.orders.push(order); saveDB();
    if (approved) deliverPaidOrder(order);
    const tx = (pay.point_of_interaction && pay.point_of_interaction.transaction_data) || {};
    res.json({
      ok: true, orderId: order.id, paymentId: pay.id, status: pay.status,
      qr_code: tx.qr_code || null, qr_code_base64: tx.qr_code_base64 || null, ticket_url: tx.ticket_url || null,
    });
  } catch (e) {
    if (e.code === "no_token") return res.status(503).json({ error: "mp_sem_token" });
    res.status(502).json({ error: "mp_falha", detail: e.message });
  }
});

app.get("/api/checkout/status/:paymentId", requireAuth, async (req, res) => {
  if (!getMpToken()) return res.status(503).json({ error: "mp_sem_token" });
  try {
    const r = await fetch(MP_API + "/v1/payments/" + req.params.paymentId, {
      headers: { Authorization: "Bearer " + getMpToken() },
    });
    const d = await r.json();
    const order = db.orders.find((o) => String(o.mpPaymentId) === String(req.params.paymentId));
    if (order && d.status === "approved" && order.status === "pending") {
      order.status = "paid"; order.paidAt = new Date().toISOString(); saveDB();
      deliverPaidOrder(order);
    }
    res.json({ status: d.status, status_detail: d.status_detail, orderStatus: order ? order.status : null });
  } catch (e) { res.status(502).json({ error: "mp_falha", detail: e.message }); }
});

// Webhook do Mercado Pago (precisa de URL publica em producao)
app.post("/api/webhooks/mercadopago", async (req, res) => {
  res.sendStatus(200); // responde rapido
  try {
    const id = (req.body && req.body.data && req.body.data.id) || req.query.id;
    const type = (req.body && req.body.type) || req.query.type;
    if (!id || (type && type !== "payment") || !getMpToken()) return;
    const r = await fetch(MP_API + "/v1/payments/" + id, { headers: { Authorization: "Bearer " + getMpToken() } });
    const d = await r.json();
    const order = db.orders.find((o) => String(o.mpPaymentId) === String(id));
    if (order && d.status === "approved" && order.status === "pending") {
      order.status = "paid"; order.paidAt = new Date().toISOString(); saveDB();
      console.log("Pedido pago via webhook:", order.id);
      deliverPaidOrder(order);
    }
  } catch (e) { console.error("webhook", e.message); }
});

/* ---------- ADMIN ---------- */
app.get("/api/admin/summary", requireAdmin, (req, res) => {
  const orders = db.orders;
  const paid = orders.filter((o) => o.status === "paid");
  const pending = orders.filter((o) => o.status === "pending");
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const pendingValue = pending.reduce((s, o) => s + o.total, 0);
  res.json({
    users: Object.keys(db.users).length,
    orders: orders.length,
    paidCount: paid.length,
    pendingCount: pending.length,
    revenue,
    pendingValue,
    ticketMedio: paid.length ? revenue / paid.length : 0,
  });
});
app.get("/api/admin/users", requireAdmin, (req, res) => {
  res.json({ users: Object.values(db.users).sort((a, b) => (b.lastLogin || "").localeCompare(a.lastLogin || "")) });
});
app.get("/api/admin/user/:steamid", requireAdmin, (req, res) => {
  const user = db.users[req.params.steamid];
  if (!user) return res.status(404).json({ error: "usuario_nao_encontrado" });
  const orders = db.orders.filter((o) => o.steamid === req.params.steamid).slice().reverse();
  const buys = orders.filter((o) => (o.type || "buy") === "buy");
  const sells = orders.filter((o) => o.type === "sell");
  const totalSpent = buys.reduce((s, o) => s + (o.status === "paid" || o.status === "completed" ? o.total : 0), 0);
  const totalEarned = sells.reduce((s, o) => s + (o.status === "paid_out" ? o.total : 0), 0);
  res.json({
    user,
    orders,
    buys,
    sells,
    stats: {
      totalOrders: orders.length,
      totalBuys: buys.length,
      totalSells: sells.length,
      totalSpent,
      totalEarned,
      balance: totalEarned - totalSpent,
    },
  });
});
app.get("/api/admin/orders", requireAdmin, (req, res) => {
  res.json({ orders: db.orders.slice().reverse() });
});
// marcar pedido manualmente (util p/ PIX estatico ou ajustes)
app.post("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "nao_encontrado" });
  const status = (req.body && req.body.status) || "";
  if (!["pending", "paid", "canceled"].includes(status)) return res.status(400).json({ error: "status_invalido" });
  order.status = status;
  order.paidAt = status === "paid" ? new Date().toISOString() : null;
  saveDB();
  // se marcado como "paid" e for compra, envia o bot
  if (status === "paid" && order.type === "buy") {
    await deliverPaidOrder(order);
  }
  res.json({ ok: true, order });
});
// configuracoes de pagamento (Access Token do Mercado Pago) — geridas pelo painel
function maskToken(t) {
  if (!t) return "";
  if (t.length <= 10) return "•".repeat(t.length);
  return t.slice(0, 8) + "…" + t.slice(-4);
}
app.get("/api/admin/settings", requireAdmin, (req, res) => {
  const token = getMpToken();
  res.json({
    mpConfigured: !!token,
    mpTokenMasked: maskToken(token),
    mpEnv: token.startsWith("TEST-") ? "teste" : token ? "producao" : null,
    source: db.settings.mpAccessToken ? "painel" : (MP_TOKEN_DEFAULT ? "config/env" : "nenhum"),
  });
});
app.post("/api/admin/settings", requireAdmin, (req, res) => {
  const body = req.body || {};
  if (typeof body.mpAccessToken === "string") {
    const t = body.mpAccessToken.trim();
    if (t === "") {
      delete db.settings.mpAccessToken; // limpa -> volta pro default de config/env
    } else if (!/^(APP_USR-|TEST-)/.test(t)) {
      return res.status(400).json({ error: "token_invalido", msg: "O Access Token deve começar com APP_USR- (produção) ou TEST- (teste)." });
    } else {
      db.settings.mpAccessToken = t;
    }
    saveDB();
  }
  const token = getMpToken();
  res.json({ ok: true, mpConfigured: !!token, mpTokenMasked: maskToken(token), mpEnv: token.startsWith("TEST-") ? "teste" : token ? "producao" : null });
});

// ---- Bot de trade (status, credenciais, ações de escrow) ----
app.get("/api/admin/bot", requireAdmin, (req, res) => {
  const c = getBotConfig();
  res.json({
    status: bot.status(),
    credentials: {
      accountName: c.accountName ? c.accountName : null,
      hasPassword: !!c.password,
      hasSharedSecret: !!c.sharedSecret,
      hasIdentitySecret: !!c.identitySecret,
      hasApiKey: !!c.apiKey,
    },
  });
});
app.post("/api/admin/bot/credentials", requireAdmin, async (req, res) => {
  const b = req.body || {};
  db.settings.botSteam = db.settings.botSteam || {};
  ["accountName", "password", "sharedSecret", "identitySecret", "apiKey"].forEach((k) => {
    if (typeof b[k] === "string" && b[k].trim() !== "") db.settings.botSteam[k] = b[k].trim();
    if (b[k] === "") delete db.settings.botSteam[k];
  });
  saveDB();
  bot.configure(getBotConfig());
  try { await bot.start(); } catch (e) {}
  res.json({ ok: true, status: bot.status() });
});
app.post("/api/admin/bot/guardcode", requireAdmin, (req, res) => {
  const code = (req.body && req.body.code) || "";
  if (!code) return res.status(400).json({ error: "sem_codigo" });
  const result = bot.submitGuardCode(code);
  res.json(result);
});
// liberar pagamento de uma venda (após confirmar recebimento da skin)
app.post("/api/admin/orders/:id/payout", requireAdmin, (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "nao_encontrado" });
  if (order.type !== "sell") return res.status(400).json({ error: "nao_e_venda" });
  order.status = "paid_out";
  order.paidOutAt = new Date().toISOString();
  saveDB();
  res.json({ ok: true, order });
});
// reenviar a entrega de uma compra
app.post("/api/admin/orders/:id/redeliver", requireAdmin, async (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "nao_encontrado" });
  order.offerId = null;
  if (order.status === "delivery_failed" || order.status === "aguardando_trade_url") order.status = "paid";
  await deliverPaidOrder(order);
  res.json({ ok: true, order });
});
// simular avanço de oferta (apenas modo simulação, para testes do fluxo)
app.post("/api/admin/orders/:id/simulate", requireAdmin, (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order || !order.offerId) return res.status(404).json({ error: "sem_oferta" });
  if (bot.status().mode !== "simulation") return res.status(400).json({ error: "apenas_simulacao" });
  const state = (req.body && req.body.state) || "accepted";
  bot.simulateOfferState(order.offerId, state);
  res.json({ ok: true });
});

// promover/rebaixar admin
app.post("/api/admin/users/:steamid/admin", requireAdmin, (req, res) => {
  const u = db.users[req.params.steamid];
  if (!u) return res.status(404).json({ error: "nao_encontrado" });
  u.admin = !!(req.body && req.body.admin);
  if (u.admin) ADMIN_IDS.add(u.steamid); else ADMIN_IDS.delete(u.steamid);
  saveDB();
  res.json({ ok: true, user: u });
});

/* ---------- estaticos ---------- */
// HTML/JS/CSS nunca cacheados (evita ficar preso em versao antiga apos deploy)
app.use((req, res, next) => {
  if (/\.(html|js|css)$/.test(req.path) || req.path === "/") {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  }
  next();
});
app.use(express.static(ROOT, { extensions: ["html"] }));

// healthcheck simples (mostra versao no ar — util p/ confirmar deploy)
app.get("/version", (req, res) => res.json({
  version: "2026-06-15-mongo",
  db: mongoCol ? "mongodb" : "json-local",
  ok: true,
}));

(async () => {
  await initMongo(); // carrega estado persistido (pedidos/usuarios/settings) ANTES de subir
  // reconfigura o bot com as settings carregadas do banco
  bot.configure(getBotConfig());
  app.listen(PORT, () => {
    console.log("PIRATAOSKIN (backend real) em http://localhost:" + PORT);
    console.log("Persistencia:", mongoCol ? "MongoDB (persistente)" : "JSON local (efemero)");
    console.log("Admins:", [...ADMIN_IDS].join(", ") || "(nenhum)");
    console.log("Mercado Pago:", getMpToken() ? "token configurado" : "SEM token (configure no painel admin)");
    bot.start().catch((e) => console.error("[bot] start:", e.message));
  });
})();
