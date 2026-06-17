/* PIRATAOSKIN — Steam Trade Bot.
   Responsável por enviar/receber ofertas de troca (trade offers) da conta configurada.
   - Modo SIMULAÇÃO (padrão): nenhuma credencial -> gera ofertas fake e emite eventos,
     permitindo testar todo o fluxo de escrow sem tocar na Steam.
   - Modo REAL ("live"): com credenciais (accountName, password, sharedSecret,
     identitySecret, apiKey) usa steam-user + steam-tradeoffer-manager + steamcommunity.
   A Steam NÃO move dinheiro: este bot só transfere ITENS. A liberação de valores é
   responsabilidade do servidor (após confirmar o recebimento da skin).
*/
const EventEmitter = require("events");

const APPID_CS2 = 730;
const CONTEXTID = 2;

class SteamBot extends EventEmitter {
  constructor(cfg) {
    super();
    this.cfg = cfg || {};
    this.mode = "simulation";
    this.online = false;
    this.steamid = null;
    this.lastError = null;
    this._lib = null; // libs lazy-carregadas em modo live
    this._sim = {};   // offerId -> { type, state }
  }

  configure(cfg) { this.cfg = { ...this.cfg, ...(cfg || {}) }; }

  // Para subir em modo real basta apiKey + (refreshToken OU conta+senha).
  // shared_secret e identity_secret são OPCIONAIS (apenas automatizam 2FA/confirmação).
  isConfigured() {
    const c = this.cfg || {};
    return !!(c.apiKey && (c.refreshToken || (c.accountName && c.password)));
  }

  status() {
    const c = this.cfg || {};
    return {
      mode: this.mode,
      online: this.online,
      steamid: this.steamid,
      configured: this.isConfigured(),
      needsGuardCode: !!this._needsGuard,
      guardWrong: !!this._guardWrong,
      autoLogin: !!(c.refreshToken || c.sharedSecret),
      autoConfirm: !!c.identitySecret,
      error: this.lastError,
    };
  }

  /* ---------- inicialização (não-bloqueante) ---------- */
  async start() {
    if (!this.isConfigured()) {
      this.mode = "simulation";
      this.online = true;
      this.steamid = this.cfg.botSteamId || null;
      this.emit("status", this.status());
      console.log("[bot] modo SIMULAÇÃO (sem credenciais).");
      return this.status();
    }
    this.lastError = null;
    try {
      this._setupLive(); // dispara o login; a transição p/ live ocorre via eventos
      if (this.mode !== "live") this.mode = "connecting";
    } catch (e) {
      this.lastError = e.message;
      this.mode = "simulation";
      this.online = true;
      console.error("[bot] falha ao iniciar modo real, caindo p/ simulação:", e.message);
    }
    this.emit("status", this.status());
    return this.status();
  }

  // Submete o código do Steam Guard pedido durante o login (modo sem shared_secret).
  submitGuardCode(code) {
    if (!this._guardCallback) return { ok: false, error: "sem_pedido_de_codigo" };
    const cb = this._guardCallback;
    this._guardCallback = null;
    this._needsGuard = false;
    try { cb(String(code).trim()); } catch (e) { return { ok: false, error: e.message }; }
    return { ok: true };
  }

  _setupLive() {
    const SteamUser = require("steam-user");
    const SteamCommunity = require("steamcommunity");
    const TradeOfferManager = require("steam-tradeoffer-manager");
    const SteamTotp = require("steam-totp");

    // encerra sessão anterior, se houver (re-config)
    if (this._lib && this._lib.client) { try { this._lib.client.logOff(); } catch (e) {} }

    const client = new SteamUser();
    const community = new SteamCommunity();
    const manager = new TradeOfferManager({ steam: client, community, language: "en", pollInterval: 10000 });
    this._lib = { client, community, manager, SteamTotp, TradeOfferManager };

    // guarda refresh token p/ próximos logins sem senha
    client.on("refreshToken", (token) => {
      this.cfg.refreshToken = token;
      this.emit("refreshToken", token);
      console.log("[bot] refresh token salvo (logins futuros dispensam senha).");
    });

    // pede código do Steam Guard quando não há shared_secret
    client.on("steamGuard", (domain, callback, lastWrong) => {
      if (this.cfg.sharedSecret) {
        try { return callback(SteamTotp.generateAuthCode(this.cfg.sharedSecret)); } catch (e) {}
      }
      this._needsGuard = true;
      this._guardCallback = callback;
      this._guardWrong = !!lastWrong;
      this.emit("status", this.status());
      console.log("[bot] aguardando código do Steam Guard (informe no painel).");
    });

    client.on("error", (err) => {
      this.lastError = err.message;
      this.online = false;
      if (this.mode !== "live") this.mode = "simulation";
      console.error("[bot] erro de conexão:", err.message);
      this.emit("status", this.status());
    });

    client.on("loggedOn", () => {
      this._needsGuard = false;
      this._guardCallback = null;
      this._guardWrong = false;
      client.setPersona(1);
      this.steamid = client.steamID ? client.steamID.getSteamID64() : null;
    });

    client.on("webSession", (sessionID, cookies) => {
      this._cookies = cookies; // usados p/ ler trade holds autenticados
      manager.setCookies(cookies, (err) => {
        if (err) { this.lastError = err.message; this.emit("status", this.status()); return; }
        community.setCookies(cookies);
        this.mode = "live";
        this.online = true;
        this.lastError = null;
        this._holdsCache = null; this._holdsCacheTs = 0; // invalida cache ao relogar
        console.log("[bot] modo REAL ativo. SteamID:", this.steamid);
        this.emit("status", this.status());
      });
    });

    manager.on("sentOfferChanged", (offer) => {
      const state = this._lib.TradeOfferManager.ETradeOfferState[offer.state];
      this.emit("offer", { offerId: String(offer.id), state: this._normalizeState(state), raw: state, partner: offer.partner && offer.partner.getSteamID64() });
    });

    // login
    const opts = this.cfg.refreshToken
      ? { refreshToken: this.cfg.refreshToken }
      : { accountName: this.cfg.accountName, password: this.cfg.password };
    if (!this.cfg.refreshToken && this.cfg.sharedSecret) {
      try { opts.twoFactorCode = SteamTotp.generateAuthCode(this.cfg.sharedSecret); } catch (e) {}
    }
    client.logOn(opts);
  }

  _normalizeState(s) {
    // mapeia estados da lib para o nosso vocabulário
    if (s === "Accepted") return "accepted";
    if (s === "Active" || s === "CreatedNeedsConfirmation") return "sent";
    if (s === "Declined") return "declined";
    if (s === "Canceled" || s === "Expired" || s === "InvalidItems") return "canceled";
    return (s || "unknown").toLowerCase();
  }

  /* ---------- enviar itens ao comprador (entrega de venda da loja) ---------- */
  async sendItems({ tradeUrl, assetIds, message }) {
    if (this.mode === "simulation") return this._simOffer("send");
    return this._liveOffer({ tradeUrl, assetIds, message, kind: "give" });
  }

  /* ---------- solicitar itens do parceiro (compra/usuário vendendo p/ nós) ---------- */
  async requestItems({ tradeUrl, assetIds, message }) {
    if (this.mode === "simulation") return this._simOffer("request");
    return this._liveOffer({ tradeUrl, assetIds, message, kind: "take" });
  }

  _simOffer(type) {
    const offerId = "SIM-" + type.toUpperCase() + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    this._sim[offerId] = { type, state: "sent" };
    setTimeout(() => this.emit("offer", { offerId, state: "sent", simulated: true }), 50);
    return Promise.resolve({ offerId, state: "sent", simulated: true });
  }

  // usado em testes/simulação: força um estado de uma oferta simulada
  simulateOfferState(offerId, state) {
    if (this._sim[offerId]) this._sim[offerId].state = state;
    this.emit("offer", { offerId, state, simulated: true });
    return { offerId, state };
  }

  async _liveOffer({ tradeUrl, assetIds, message, kind }) {
    const { manager, community } = this._lib;
    if (!tradeUrl) throw new Error("trade_url_ausente");
    const ids = Array.isArray(assetIds) ? assetIds : [];
    return new Promise((resolve, reject) => {
      const offer = manager.createOffer(tradeUrl);
      const items = ids.map((id) => ({ assetid: String(id), appid: APPID_CS2, contextid: String(CONTEXTID), amount: 1 }));
      if (kind === "give") offer.addMyItems(items);
      else offer.addTheirItems(items);
      if (message) offer.setMessage(message);
      offer.send((err, status) => {
        if (err) return reject(err);
        // se precisar de confirmação móvel (ofertas em que damos itens), confirmamos
        if (status === "pending" && kind === "give") {
          community.acceptConfirmationForObject(this.cfg.identitySecret, offer.id, (cErr) => {
            if (cErr) return reject(cErr);
            resolve({ offerId: String(offer.id), state: "sent", status });
          });
        } else {
          resolve({ offerId: String(offer.id), state: "sent", status });
        }
      });
    });
  }

  async cancelOffer(offerId) {
    if (this.mode === "simulation") return this.simulateOfferState(offerId, "canceled");
    return new Promise((resolve, reject) => {
      this._lib.manager.getOffer(offerId, (err, offer) => {
        if (err) return reject(err);
        offer.cancel((e) => (e ? reject(e) : resolve({ offerId, state: "canceled" })));
      });
    });
  }

  /* ---------- trade holds (datas de liberação reais) ----------
     Só funciona em modo LIVE: lê o inventário próprio autenticado, cujas
     descrições incluem a data "Tradable After". Retorna { assetid: ms }.
     Best-effort: qualquer falha resolve {} sem quebrar quem chama.
  */
  async getTradeHolds() {
    if (this.mode !== "live" || !this._cookies || !this.steamid) return {};
    const now = Date.now();
    if (this._holdsCache && now - this._holdsCacheTs < 5 * 60 * 1000) return this._holdsCache;
    try {
      // inventario AUTENTICADO (com cookies do bot) traz owner_descriptions com "Tradable After"
      const url = "https://steamcommunity.com/inventory/" + this.steamid + "/" + APPID_CS2 + "/" + CONTEXTID + "?l=english&count=2000";
      const r = await fetch(url, { headers: { Cookie: this._cookies.join("; "), "User-Agent": "Mozilla/5.0 PIRATAOSKIN" } });
      if (!r.ok) return this._holdsCache || {};
      const d = await r.json();
      if (!d || !d.assets || !d.descriptions) return {};
      const desc = {};
      for (const x of d.descriptions) desc[x.classid + "_" + x.instanceid] = x;
      const holds = {};
      for (const a of d.assets) {
        const x = desc[a.classid + "_" + a.instanceid];
        if (!x || !x.owner_descriptions) continue;
        for (const o of x.owner_descriptions) {
          const m = o && o.value && o.value.match(/[Tt]radable[ /]?[Aa]fter\s+(.+)/);
          if (m) {
            const t = Date.parse(m[1].replace(/[()]/g, " ").replace(/GMT/i, "").trim() + " GMT");
            if (!isNaN(t)) holds[String(a.assetid)] = t;
            break;
          }
        }
      }
      this._holdsCache = holds; this._holdsCacheTs = now;
      return holds;
    } catch (e) { return this._holdsCache || {}; }
  }
}

module.exports = { SteamBot };
