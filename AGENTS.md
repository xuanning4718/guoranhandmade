# AGENTS - 菓然手作 (Guoran Handmade)

## Quick Commands

```
npm install                        # install deps
npm run dev:mp-weixin              # dev build → output to dist/dev/mp-weixin
npm run build:mp-weixin            # production build
```

After `dev:mp-weixin`, open `dist/dev/mp-weixin` in **WeChat DevTools**.

## Architecture

**uni-app (Vue 3 Composition API + Pinia)** targeting WeChat Mini Program only.

### Sources of Truth

| Dir | Role |
|---|---|
| `src/pages.json` | Route config + tabBar + per-page nav style |
| `src/manifest.json` | Platform config (wx AppID, cloud enabled) |
| `src/api/index.js` | **Only place** to add/modify API functions |
| `src/stores/` | Pinia setup stores, persisted via `uni.setStorageSync` |

### API Layer (`src/api/`)

**Dual-backend strategy** — every function tries Feishu (Lark) Bitable first, catches and falls back to `mockData.js`. Never modify mock data without understanding the production table schema in `src/config/lark.js`.

- `getProducts(query)` — main product query; supports `category`, `detId`, `creatorId`, `keyword`, `sort` (`hot`|`newest`|default), `page`/`pageSize`
- `getHotProducts()` / `getNewProducts()` — thin wrappers used by index page
- `getProductById(id)` / `getCreatorById(id)` — detail queries
- Comments CRUD + `likeComment` / `updateProductStats`

### State (Pinia)

- **`stores/cart.js`** → `useWishlistStore` — NOT a shopping cart, it's a wishlist. Persisted to `wishlist` key.
- **`stores/favorite.js`** → `useFavoriteStore` — tracks favorited products AND creators in `favorites` key.

No backend user auth — all via `wx.setStorageSync` / `wx.getStorageSync`.

### Cloud Images

`src/utils/cloudImage.js` converts `cloud://` file IDs to temp URLs via `wx.cloud.getTempFileURL()`. Has an in-memory `Map` cache. Only call on `cloud://` prefixed URLs; CDN URLs pass through unchanged.

### Pages (9 total)

Three pages use **custom navigation** (`navigationStyle: "custom"`): `index`, `creator-list`, `search`. They manually calculate status bar height via `uni.getSystemInfoSync()`.

Cross-page communication: category selection uses `uni.setStorageSync('pendingCategory', id)` + `uni.$on('selectCategory')` event.

### Design System

- Primary: `#4a6741` (green), Accent: `#c4a882` (tan), Background: `#faf7f2` (cream)
- All dimensions in `rpx`
- Global utility classes defined in `App.vue`

### Icons

Located in `src/static/images/`. Naming convention: `tab-*.png` (tab bar), `cat-*.png` (category icons), `good.png` / `good-active.png` (comment like), `comment.png` (reply), `icon-contact.png` (creator contact).

### Gotchas

- **`stores/cart.js` is a wishlist, not a cart.** The "意愿" tab shows wishlist items. No pricing or checkout logic exists.
- `cloudImage.js` uses `wx.cloud` directly — only works in WeChat environment, not H5 preview.
- Feishu credentials are in plaintext in `src/config/lark.js`. These are app-level (not user-level) tokens.
- Build output is `dist/dev/mp-weixin/` (dev) or `dist/build/mp-weixin/` (prod). The `mp-weixin/` dir at repo root is a **compiled artifact**, not source.

## Behavioral Constraints

- **NEVER guess or fabricate data.** When you need accurate information about products, categories, creators, or any other business data, ALWAYS query via Feishu API. Do not make assumptions about IDs, names, or relationships.
