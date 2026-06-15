# PIRATAOSKIN ⚓

Marketplace de skins de CS2 (protótipo) com identidade visual de pirata. Comprar, Vender e
Upgrade — em português, dark mode, totalmente em **HTML + CSS + JavaScript** (sem build).

## Como rodar

O site agora tem **backend real** (login via Steam + inventário + preços), então precisa do
Node.js e roda como um servidor:

```bash
# dentro da pasta pirataoskin/
npm install        # instala express e express-session (uma vez)
node server.js     # sobe em http://localhost:5500
```

Abra **http://localhost:5500** no navegador.

> As páginas de catálogo/carrinho continuam funcionando mesmo sem login. Login e inventário
> exigem o servidor no ar (o `file://` puro não cobre essas partes).

## Login Steam e inventário (reais)

- **Login**: botão "Entrar com Steam" usa o **OpenID 2.0 oficial** ("Sign in through Steam").
  Não precisa de API key. Você faz login com sua conta Steam normalmente.
- **Inventário**: após logar (ou informando um SteamID64), as páginas **Vender** e **Upgrade**
  carregam seu inventário **real** de CS2 via endpoint público da Steam.
  ⚠️ Seu inventário precisa estar **público** nas configurações de privacidade da Steam.
- **Preços**: puxados em tempo real do **Steam Community Market** em BRL (currency=7) ao
  selecionar um item.
- **Float**: não é exposto pela API pública da Steam (precisa de serviço de inspeção de
  terceiros), então itens reais aparecem sem float — em vez de um valor inventado.

### Rotas do backend ([server.js](server.js))

| Rota | Função |
|------|--------|
| `GET /auth/steam` | Inicia o login (redireciona para a Steam) |
| `GET /auth/steam/return` | Callback do OpenID, cria a sessão |
| `GET /auth/logout` | Encerra a sessão |
| `GET /api/me` | Usuário logado (`{steamid,name,avatar}`) ou `null` |
| `GET /api/inventory?steamid=` | Inventário real de CS2 (logado ou por SteamID) |
| `GET /api/price?name=` | Preço real em BRL de um `market_hash_name` |

## Páginas

| Arquivo | Página |
|---------|--------|
| `index.html` | Home (hero, categorias, destaques, como funciona) |
| `catalogo.html` | Catálogo com filtros (arma, raridade, wear, float, preço, StatTrak) e ordenação |
| `carrinho.html` | Carrinho + checkout (Pix com QR e cartão parcelado) |
| `vender.html` | Vender skins do inventário e receber via Pix |
| `upgrade.html` | Trocar skins + diferença por uma melhor |

## Estrutura

```
pirataoskin/
├── index.html, catalogo.html, carrinho.html, vender.html, upgrade.html
├── css/styles.css      # design system (tema pirata: dourado/mar noturno)
└── js/
    ├── data.js         # dados mock das skins (catálogo)
    └── site.js         # header/footer, carrinho (localStorage), cards, toast
```

## Funcionalidades

- Catálogo dinâmico com busca, filtros e ordenação.
- Carrinho persistente em `localStorage` (contador no header em todas as páginas).
- Checkout simulado: Pix (QR + copia-e-cola, 3% off) e cartão (até 12x, 4x sem juros).
- Fluxos de Vender (oferta a 85% do mercado) e Upgrade (crédito + diferença).
- Responsivo (mobile-first), preços em BRL.

## Personalização

- Adicionar/editar skins: `js/data.js`.
- Cores e tema: variáveis CSS no topo de `css/styles.css`.
- Imagens: hoje os cards usam um placeholder com gradiente por raridade. Para imagens reais,
  adicione um campo `image` em `data.js` e ajuste `cardHTML()` em `site.js`.

## Avisos

- Projeto de **demonstração**. Pagamentos, login Steam e trades são **simulados**.
- PIRATAOSKIN não é afiliado à Valve Corporation. CS2 é marca da Valve.
- Todo o conteúdo (copy, arte, código) é original.
