# NovaMind clone — Shopify product setup

Creates the four clone products in the new Shopify store and prints their
variant IDs. Run it from the machine that has the credentials — OpenClaw on
Oracle Cloud, or your own laptop.

## ⚠️ Before running: add the missing scope

The app currently has `write_orders,read_products`.
Creating products needs **`write_products`**, which is missing.

1. Shopify admin → Settings → Apps and sales channels → Develop apps
2. Open **myPOS Checkout** → Configuration → Admin API scopes
3. Set: `write_orders,read_products,write_products`
4. **Save**, then **Install** / **Reinstall** the app
5. The Client ID stays the same; the **Client Secret may change** — copy it again

Without this the script fails with an access-denied error.

## Run it

```bash
SHOPIFY_CLIENT_ID=... \
SHOPIFY_CLIENT_SECRET=... \
SHOPIFY_SHOP_DOMAIN=r76kgm-2h.myshopify.com \
MYPOS_BACKEND_URL=https://<clone-backend-host> \
node create-products.mjs
```

`MYPOS_BACKEND_URL` is optional. When set, each product gets a "Плати с карта"
button pointing at `<backend>/pay/<key>`. Leave it out to create the products
without buttons.

## What it does

- Auth via `client_credentials` (same mechanism as `server.cjs`)
- Uses the **GraphQL** Admin API — the REST product endpoints are deprecated and
  new apps cannot use them
- Creates each product, then its variant, then publishes it to the Online Store
- **Idempotent**: a product whose handle already exists is skipped, never duplicated
- Prints the numeric variant IDs at the end

## Products created

| handle | title | price |
|---|---|---|
| `chatgpt` | ChatGPT Настройки за 10 минути | 20.00 |
| `calls` | AI Анализ на Обаждания | 149.00 |
| `clients` | AI Клиентска Машина | 97.99 |
| `offers` | Система за запитвания и оферти | 199.00 |

Same names and prices as the live store, new variant IDs — which is what makes
the two stores distinguishable.

## Safety

- Never prints the Client Secret or the access token
- No payment is initiated or charged
- Read-only for everything except product creation
