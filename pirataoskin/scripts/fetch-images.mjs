// Busca URLs de imagens reais das skins de CS2 a partir da base pública CSGO-API
// (https://github.com/ByMykel/CSGO-API) e imprime um mapa { id: imageUrl }.
// Uso: node scripts/fetch-images.mjs

const SKINS_URL = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const AGENTS_URL = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/agents.json";

// id do nosso catálogo -> nome de busca na API
const wanted = {
  "ak-redline-ft": "AK-47 | Redline",
  "ak-redline-st-mw": "AK-47 | Redline",
  "awp-asiimov-ft": "AWP | Asiimov",
  "awp-dragonlore-fn": "AWP | Dragon Lore",
  "m4a1s-printstream-mw": "M4A1-S | Printstream",
  "deagle-blaze-fn": "Desert Eagle | Blaze",
  "usp-kill-confirmed-mw": "USP-S | Kill Confirmed",
  "glock-fade-fn": "Glock-18 | Fade",
  "karambit-doppler-fn": "★ Karambit | Doppler",
  "butterfly-fade-fn": "★ Butterfly Knife | Fade",
  "m9-marble-fade-fn": "★ M9 Bayonet | Marble Fade",
  "sport-gloves-vice-ft": "★ Sport Gloves | Vice",
  "mp9-starlight-fn": "MP9 | Starlight Protector",
  "p90-asiimov-ft": "P90 | Asiimov",
  "nova-hyper-beast-mw": "Nova | Hyper Beast",
  "famas-roll-cage-fn": "FAMAS | Roll Cage",
};
const wantedAgents = {
  "agent-blackwolf": "Blackwolf",
  "agent-sir-bloody": "Sir Bloody Darryl Royale",
};

const norm = (s) =>
  s.toLowerCase().replace(/★/g, "").replace(/™/g, "").replace(/\|/g, " ")
   .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

async function main() {
  const [skins, agents] = await Promise.all([
    fetch(SKINS_URL).then((r) => r.json()),
    fetch(AGENTS_URL).then((r) => r.json()),
  ]);

  const out = {};
  const misses = [];

  for (const [id, query] of Object.entries(wanted)) {
    const q = norm(query);
    // match exato normalizado, senão "começa com"
    let hit = skins.find((s) => norm(s.name) === q);
    if (!hit) hit = skins.find((s) => norm(s.name).startsWith(q));
    if (!hit) hit = skins.find((s) => norm(s.name).includes(q));
    if (hit && hit.image) out[id] = hit.image;
    else misses.push(id + "  («" + query + "»)");
  }

  for (const [id, query] of Object.entries(wantedAgents)) {
    const q = norm(query);
    let hit = agents.find((a) => norm(a.name).includes(q));
    if (hit && hit.image) out[id] = hit.image;
    else misses.push(id + "  («" + query + "»)");
  }

  console.log("=== MAPA DE IMAGENS ===");
  console.log(JSON.stringify(out, null, 2));
  console.log("=== MISSES (" + misses.length + ") ===");
  console.log(misses.join("\n"));
}

main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
