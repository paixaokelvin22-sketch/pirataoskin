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

  isConfigured() {
    const c = this.cfg || {};
    return !!(c.accountName && c.password && c.sharedSecret && c.identitySecret && c.apiKey);
  }

  status() {
    return {
      mode: this.mode,
      online: this.online,
      steamid: this.steamid,
      configured: this.isConfigured(),
      error: this.lastError,
    };
  }

  /* ---------- inicialização ---------- */
  async start() {
    if (!this.isConfigured()) {
      this.mode = "simulation";
      this.online = true;
      this.steamid = this.cfg.botSteamId || null;
      this.emit("status", this.status());
      console.log("[bot] modo SIMULAÇÃO (sem credenciais).");
      return;
    }
    try {
      await this._startLive();
    } catch (e) {
      this.lastError = e.message;
      this.mode = "simulation";
      this.online = true;
      console.error("[bot] falha ao iniciar modo real, caindo p/ simulação:", e.message);
      this.emit("status", this.status());
    }
  }

  async _startLive() {
    const SteamUser = require("steam-user");
    const SteamCommunity = require("steamcommunity");
    const TradeOfferManager = require("steam-tradeoffer-manager");
    const SteamTotp = require("steam-totp");

    const client = new SteamUser();
    const community = new SteamCommunity();
    const manager = new TradeOfferManager({ steam: client, community, language: "en", pollInterval: 10000 });
    this._lib = { client, community, manager, SteamTotp, TradeOfferManager };

    await new Promise((resolve, reject) => {
      const onError = (err) => reject(err);
      client.once("error", onError);
      client.logOn({
        accountName: this.cfg.accountName,
        password: this.cfg.password,
        twoFactorCode: SteamTotp.generateAuthCode(this.cfg.sharedSecret),
      });
      client.once("loggedOn", () => {
        client.removeListener("error", onError);
        client.setPersona(1); // online
        this.steamid = client.steamID ? client.steamID.getSteamID64() : null;
      });
      client.once("webSession", (sessionID, cookies) => {
        manager.setCookies(cookies, (err) => {
          if (err) return reject(err);
          community.setCookies(cookies);
          this.mode = "live";
          this.online = true;
          console.log("[bot] modo REAL ativo. SteamID:", this.steamid);
          this.emit("status", this.status());
          resolve();
        });
      });
    });

    // mudanças nas ofertas que ENVIAMOS (entrega ao comprador / pedido ao vendedor)
    manager.on("sentOfferChanged", (offer) => {
      const state = this._lib.TradeOfferManager.ETradeOfferState[offer.state];
      this.emit("offer", { offerId: String(offer.id), state: this._normalizeState(state), raw: state, partner: offer.partner && offer.partner.getSteamID64() });
    });
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
}

module.exports = { SteamBot };
