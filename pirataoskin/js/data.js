/* PIRATAOSKIN — dados mock do catálogo.
   Conteúdo original. Preços em BRL.
   As imagens das skins usam o CDN público de itens da Steam (economy/image),
   mapeadas via base open-source CSGO-API (github.com/ByMykel/CSGO-API). */
window.PIRATA_DATA = {
  categorias: [
    { slug: "facas",        nome: "Facas",    icone: "🔪" },
    { slug: "luvas",        nome: "Luvas",    icone: "🧤" },
    { slug: "rifles",       nome: "Rifles",   icone: "🔫" },
    { slug: "pistolas",     nome: "Pistolas", icone: "🔫" },
    { slug: "smgs",         nome: "SMGs",     icone: "💥" },
    { slug: "snipers",      nome: "Snipers",  icone: "🎯" },
    { slug: "heavy",        nome: "Heavy",    icone: "💣" },
    { slug: "outros/agent", nome: "Agentes",  icone: "🕵️" }
  ],

  wearLabels: {
    FN: "Factory New",
    MW: "Minimal Wear",
    FT: "Field-Tested",
    WW: "Well-Worn",
    BS: "Battle-Scarred"
  },

  // cores por raridade (borda/realce do card)
  raridadeCor: {
    consumer:   "#B0C3D9",
    industrial: "#5E98D9",
    milspec:    "#4B69FF",
    restricted: "#8847FF",
    classified: "#D32CE6",
    covert:     "#EB4B4B",
    knife:      "#FFC233"
  },
  raridadeNome: {
    consumer: "Consumer", industrial: "Industrial", milspec: "Mil-Spec",
    restricted: "Restricted", classified: "Classified", covert: "Covert", knife: "Raro Especial"
  },

  skins: [
    { id: "ak-redline-ft",        arma: "AK-47",            skin: "Redline",            categoria: "rifles",       wear: "FT", float: 0.2341, raridade: "classified", stattrak: false, preco: 84.90,    image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSI_-RHGavzedxuPUnFniykEtzsWWBzoyuIiifaAchDZUjTOZe4RC_w4buM-6z7wzbgokUyzK-0H08hRGDMA" },
    { id: "ak-redline-st-mw",     arma: "AK-47",            skin: "Redline",            categoria: "rifles",       wear: "MW", float: 0.1102, raridade: "classified", stattrak: true,  preco: 219.90,   image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSI_-RHGavzedxuPUnFniykEtzsWWBzoyuIiifaAchDZUjTOZe4RC_w4buM-6z7wzbgokUyzK-0H08hRGDMA" },
    { id: "awp-asiimov-ft",       arma: "AWP",              skin: "Asiimov",            categoria: "snipers",      wear: "FT", float: 0.2890, raridade: "covert",     stattrak: false, preco: 312.50,   image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V6V-Kf2cGFidxOp_pewnF3nhxEt0sGnSzN76dH3GOg9xC8FyEORftRe-x9PuYurq71bW3d8UnjK-0H0YSTpMGQ" },
    { id: "awp-dragonlore-fn",    arma: "AWP",              skin: "Dragon Lore",        categoria: "snipers",      wear: "FN", float: 0.0123, raridade: "covert",     stattrak: false, preco: 18999.00, image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk4veqYaF7IfysCnWRxuF4j-B-Xxa_nBovp3Pdwtj9cC_GaAd0DZdwQu9fuhS4kNy0NePntVTbjYpCyyT_3CgY5i9j_a9cBkcCWUKV" },
    { id: "m4a1s-printstream-mw", arma: "M4A1-S",           skin: "Printstream",        categoria: "rifles",       wear: "MW", float: 0.0934, raridade: "covert",     stattrak: false, preco: 689.00,   image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwjFS4_ega6F_H_OGMWrEwL9lj_F7Rienhgk1tjyIpYPwJiPTcAAoCpsiEO5ZsUbpm9C2Zuni4VHW3o5EzSX62HxP7Sg96-hWVqYi_6TJz1aW0nxrkGs" },
    { id: "deagle-blaze-fn",      arma: "Desert Eagle",     skin: "Blaze",              categoria: "pistolas",     wear: "FN", float: 0.0211, raridade: "restricted", stattrak: false, preco: 1450.00,  image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL1m5fn8Sdk7vORbqhsLfWAMWuZxuZi_uI_TX6wxxkjsGXXnImsJ37COlUoWcByEOMOtxa5kdXmNu3htVPZjN1bjXKpkHLRfQU" },
    { id: "usp-kill-confirmed-mw",arma: "USP-S",            skin: "Kill Confirmed",     categoria: "pistolas",     wear: "MW", float: 0.0876, raridade: "covert",     stattrak: false, preco: 540.00,   image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLkjYbf7itX6vytbbZSI-WsG3SA_uV_vO1WTCa9kxQ1vjiBpYPwJiPTcFB2Xpp5TO5cskG9lYCxZu_jsVCL3o4Xnij23ClO5ik9tegFA_It8qHJz1aWe-uc160" },
    { id: "glock-fade-fn",        arma: "Glock-18",         skin: "Fade",               categoria: "pistolas",     wear: "FN", float: 0.0156, raridade: "restricted", stattrak: false, preco: 980.00,   image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL2kpnj9h1a7s2oaaBoH_yaCW-Ej-8u5bZvHnq1w0Vz62TUzNj4eCiVblMmXMAkROJeskLpkdXjMrzksVTAy9US8PY25So" },
    { id: "karambit-doppler-fn",  arma: "★ Karambit",       skin: "Doppler",            categoria: "facas",        wear: "FN", float: 0.0089, raridade: "knife",      stattrak: false, preco: 5890.00,  image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1Q7uCvZaZkNM-SA1iSze91u_FsTju_qhAmoT-Jn4bjJC_4Ml93UtZuRLQPsBawkNfiMbnl5AKMiopCnin7iCJBv31j4rkBBKEg-6zUjV3GY6p9v8dpLWT3Fg" },
    { id: "butterfly-fade-fn",    arma: "★ Butterfly Knife",skin: "Fade",               categoria: "facas",        wear: "FN", float: 0.0201, raridade: "knife",      stattrak: false, preco: 8499.00,  image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1Z-ua6bbZrLOmsD2avx-9ytd5lRi67gVNwsDvSwtqqc3iXZg4kCZYjReYLtRbum9XgYuvm5wbWjtgUzCn3iSsf8G81tFEeH9rw" },
    { id: "m9-marble-fade-fn",    arma: "★ M9 Bayonet",     skin: "Marble Fade",        categoria: "facas",        wear: "FN", float: 0.0099, raridade: "knife",      stattrak: false, preco: 4299.00,  image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL6kJ_m-B1Wts2sab1iLvWHMWad_uN3ouNlSha1lBkijDGMnYftb3OTbVRyD8Z1RrNctkS6kobkZLzi7gTW2NpFxH33hi9Nuno65uxXAqs7uvqA7lyFHH4" },
    { id: "sport-gloves-vice-ft", arma: "★ Sport Gloves",   skin: "Vice",               categoria: "luvas",        wear: "FT", float: 0.2456, raridade: "knife",      stattrak: false, preco: 6750.00,  image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Tk5UvzWCL2kpn2-DFk_OKherB0H_KfG2Kv0ed4u95lRi67gVNx4T-Bw434IHyVb1QlAsd1FOUDthG4xNznMu3m4QXXg90Wzn_33C1I8G81tLaDi_rK" },
    { id: "mp9-starlight-fn",     arma: "MP9",              skin: "Starlight Protector",categoria: "smgs",         wear: "FN", float: 0.0345, raridade: "covert",     stattrak: false, preco: 129.90,   image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8js_f-jFk4uL3V7d5IeKfB2CY1dF6ueZhW2flkUtztz_SzYypJSqRalUhDJNwQO4PsBXtx9HkN-K37w3bgohGmHn3kGoXuZ3lRdvF" },
    { id: "p90-asiimov-ft",       arma: "P90",              skin: "Asiimov",            categoria: "smgs",         wear: "FT", float: 0.2678, raridade: "covert",     stattrak: false, preco: 64.50,    image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLhx8bf_jdk_6v-JaV-KfmeAXGvzedxuPUnTSjikRgksjuBzoz4dXLFb1QoC8QlTLQD4EPqk4LvN-Pns1aMioNBzTK-0H3gQVv65g" },
    { id: "nova-hyper-beast-mw",  arma: "Nova",             skin: "Hyper Beast",        categoria: "heavy",        wear: "MW", float: 0.1234, raridade: "classified", stattrak: false, preco: 22.90,    image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL_kYDhwiFO0PyhfqVSKOmDC3WSxO9lpN5lRi67gVMhsGrTmd2seH6XbA4pDZR1EbMCtES8m4fiNenl4FDcid1Az32ri3tM8G81tMCTwFwB" },
    { id: "famas-roll-cage-fn",   arma: "FAMAS",            skin: "Roll Cage",          categoria: "rifles",       wear: "FN", float: 0.0456, raridade: "milspec",    stattrak: false, preco: 9.90,     image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL3n5vh7h1c_M2oaalsM8-BD2uc2NF6ueZhW2exzUhz4WjWmNqpdy-UbwJxDJtxReEMtRGwloflP7m04wfXi94QyXj9kGoXuV3JhaXD" },
    { id: "agent-blackwolf",      arma: "Agente",           skin: "Blackwolf",          categoria: "outros/agent", wear: null, float: null,   raridade: "covert",     stattrak: false, preco: 89.90,    image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIa-2lmxU-LR0dnuNm6E8Vl45Iv181z1fgn8oZTh8Sla4c24abZkIf6HBCnIxLxw5uI9HXHklh4m4TjXw4qsIHPFOFByCMAmTbQJ4Ua4kdfhN7u3-UWA3G22ywJ7" },
    { id: "agent-sir-bloody",     arma: "Agente",           skin: "Sir Bloody Darryl",  categoria: "outros/agent", wear: null, float: null,   raridade: "covert",     stattrak: false, preco: 159.90,   image: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIa-2lmxU-LR0dnuNm6E8Vl45Iv181z1fgn8oYby8iRe_OGnZ6psLM-FD3WWkqAg6ec5THznk05-4jvXntz7JHjBOwYkDZAhQrZfskXuw9HiN-m3tAfclcsbmmRuIYiQ" }
  ],

  destaques: ["awp-asiimov-ft","ak-redline-st-mw","karambit-doppler-fn","m4a1s-printstream-mw","usp-kill-confirmed-mw","butterfly-fade-fn"]
};
