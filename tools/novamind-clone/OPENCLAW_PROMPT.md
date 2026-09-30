# OpenClaw prompt — NovaMind clone product setup

Copy the block below into OpenClaw. Fill in the secret from your password
manager. Do not paste the secret anywhere else.

---

## PROMPT

```
Task: create the four NovaMind clone products in a Shopify store.

Context:
- Shopify store: r76kgm-2h.myshopify.com
- Public domain: novamind-ai.work (DNS points to Shopify, SSL may still be pending)
- This is a SECOND store, a clone. It must stay isolated from the live store
  novamind-ai.store. Do not touch the live store.

Step 1 - get the script

  git clone https://github.com/tarifberatung24-blip/VZGplattform.git
  cd VZGplattform/tools/novamind-clone

Step 2 - run it

  SHOPIFY_CLIENT_ID=d15c865a0be9f90d12ac6306730fe826 \
  SHOPIFY_CLIENT_SECRET=<paste from password manager> \
  SHOPIFY_SHOP_DOMAIN=r76kgm-2h.myshopify.com \
  node create-products.mjs

Step 3 - report

  Show me the full output.
  Report the four variant IDs exactly as printed.

Rules:
- Do NOT print the Client Secret or any access token in the output.
- Do NOT make any payment. Do not call /pay/* routes. No test charges.
- Do NOT modify the live store novamind-ai.store.
- If the run fails with an access-denied or scope error, stop and tell me -
  the app is missing the write_products scope.
- The script is idempotent: if a product already exists it is skipped, so it is
  safe to run twice.

Products it creates (same names and prices as the live store):
  chatgpt   20.00   ChatGPT Настройки за 10 минути
  calls    149.00   AI Анализ на Обаждания
  clients   97.99   AI Клиентска Машина
  offers   199.00   Система за запитвания и оферти
```

---

## Before you run this

The app needs the `write_products` scope, which it does not have yet.

1. Shopify admin → Settings → Apps and sales channels → Develop apps
2. Open **myPOS Checkout** → Configuration → Admin API scopes
3. Set: `write_orders,read_products,write_products`
4. Save, then Install / Reinstall
5. The Client Secret may change — copy the new one

Without this the script stops with an access-denied error.

---

## What you should get back

```
=== VARIANT IDS (numeric, for server.cjs) ===
chatgpt    20.00  variant=12345678901234
calls     149.00  variant=12345678901235
clients    97.99  variant=12345678901236
offers    199.00  variant=12345678901237
```

Send those four numbers back. They go into the clone backend config.
