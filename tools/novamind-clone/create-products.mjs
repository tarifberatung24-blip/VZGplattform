#!/usr/bin/env node
/**
 * Creates the four NovaMind clone products in a Shopify store via the
 * GraphQL Admin API and prints the resulting variant IDs.
 *
 * Requires scopes: write_products, read_products
 * Auth: client_credentials (custom app Client ID + Client Secret)
 *
 * Usage:
 *   SHOPIFY_CLIENT_ID=... SHOPIFY_CLIENT_SECRET=... SHOPIFY_SHOP_DOMAIN=... \
 *   MYPOS_BACKEND_URL=https://... node create-products.mjs
 *
 * Idempotent: a product whose handle already exists is skipped, not duplicated.
 * Never prints the Client Secret or the access token.
 */

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const SHOP_DOMAIN = (process.env.SHOPIFY_SHOP_DOMAIN || '')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-07';
const BACKEND_URL = (process.env.MYPOS_BACKEND_URL || '').replace(/\/$/, '');

if (!CLIENT_ID || !CLIENT_SECRET || !SHOP_DOMAIN) {
  console.error('Missing config. Need SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_SHOP_DOMAIN.');
  process.exit(1);
}

const PRODUCTS = [
  { key: 'chatgpt', title: 'ChatGPT Настройки за 10 минути', price: '20.00' },
  { key: 'calls', title: 'AI Анализ на Обаждания', price: '149.00' },
  { key: 'clients', title: 'AI Клиентска Машина', price: '97.99' },
  { key: 'offers', title: 'Система за запитвания и оферти', price: '199.00' },
];

function payButton(key) {
  if (!BACKEND_URL) return '';
  return `<p><a href="${BACKEND_URL}/pay/${key}" style="display:inline-block;padding:14px 28px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Плати с карта</a></p>`;
}

let accessToken = '';

async function getToken() {
  const res = await fetch(`https://${SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(`Token request failed (${res.status}). Check Client ID/Secret and the app scopes.`);
  }
  return body.access_token;
}

async function gql(query, variables = {}) {
  const res = await fetch(`https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => ({}));
  if (body.errors) {
    throw new Error(body.errors.map((e) => e.message).join('; '));
  }
  return body.data;
}

async function onlineStorePublicationId() {
  const data = await gql(`{ publications(first: 20) { nodes { id name } } }`);
  const nodes = data.publications?.nodes || [];
  const store = nodes.find((n) => /online store/i.test(n.name)) || nodes[0];
  return store ? store.id : null;
}

async function findProductByHandle(handle) {
  const data = await gql(
    `query($q: String!) { products(first: 5, query: $q) { nodes { id handle title variants(first: 5) { nodes { id price } } } } }`,
    { q: `handle:${handle}` }
  );
  return (data.products?.nodes || []).find((p) => p.handle === handle) || null;
}

async function createProduct(product) {
  const input = {
    title: product.title,
    handle: product.handle,
    descriptionHtml: `<p>${product.title}</p>${payButton(product.key)}`,
    status: 'ACTIVE',
    productType: 'Digital',
    tags: ['novamind', 'digital'],
    productOptions: [{ name: 'Title', values: [{ name: 'Default Title' }] }],
  };

  const created = await gql(
    `mutation($input: ProductInput!) {
       productCreate(input: $input) {
         product { id handle title }
         userErrors { field message }
       }
     }`,
    { input }
  );

  const errs = created.productCreate?.userErrors || [];
  if (errs.length) throw new Error(errs.map((e) => `${e.field}: ${e.message}`).join('; '));
  const id = created.productCreate?.product?.id;
  if (!id) throw new Error('productCreate returned no product id');

  const variants = await gql(
    `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
       productVariantsBulkCreate(productId: $productId, variants: $variants) {
         productVariants { id price }
         userErrors { field message }
       }
     }`,
    {
      productId: id,
      variants: [
        {
          price: product.price,
          inventoryItem: { requiresShipping: false, tracked: false },
          inventoryPolicy: 'CONTINUE',
        },
      ],
    }
  );

  const vErrs = variants.productVariantsBulkCreate?.userErrors || [];
  if (vErrs.length) throw new Error(vErrs.map((e) => `${e.field}: ${e.message}`).join('; '));

  return {
    id,
    variantId: variants.productVariantsBulkCreate?.productVariants?.[0]?.id || null,
  };
}

async function main() {
  console.log(`Store: ${SHOP_DOMAIN}  |  API ${API_VERSION}`);
  accessToken = await getToken();
  console.log('Auth OK\n');

  const publicationId = await onlineStorePublicationId();
  const results = [];

  for (const p of PRODUCTS) {
    const handle = p.key;
    let existing = null;
    try {
      existing = await findProductByHandle(handle);
    } catch {
      existing = null;
    }

    if (existing) {
      console.log(`skip  ${p.title}  (exists)`);
      results.push({
        key: p.key,
        title: p.title,
        price: p.price,
        productId: existing.id,
        variantId: existing.variants?.nodes?.[0]?.id || null,
        created: false,
      });
      continue;
    }

    try {
      const made = await createProduct({ ...p, handle });
      console.log(`made  ${p.title}`);
      results.push({
        key: p.key,
        title: p.title,
        price: p.price,
        productId: made.id,
        variantId: made.variantId,
        created: true,
      });
    } catch (err) {
      console.log(`FAIL  ${p.title}  -> ${err.message}`);
      results.push({ key: p.key, title: p.title, price: p.price, error: err.message });
    }
  }

  if (publicationId) {
    for (const r of results) {
      if (!r.productId || r.error) continue;
      try {
        const res = await gql(
          `mutation($id: ID!, $input: [PublicationInput!]!) {
             publishablePublish(id: $id, input: $input) { userErrors { field message } }
           }`,
          { id: r.productId, input: [{ publicationId }] }
        );
        const e = res.publishablePublish?.userErrors || [];
        if (e.length) console.log(`  publish warn (${r.key}): ${e.map((x) => x.message).join('; ')}`);
      } catch (err) {
        console.log(`  publish warn (${r.key}): ${err.message}`);
      }
    }
    console.log('\nPublished to Online Store channel.');
  } else {
    console.log('\nNo publication found - publish the products manually in the admin.');
  }

  console.log('\n=== VARIANT IDS (numeric, for server.cjs) ===');
  for (const r of results) {
    if (r.error) {
      console.log(`${r.key.padEnd(10)} ERROR: ${r.error}`);
      continue;
    }
    const numeric = r.variantId ? r.variantId.split('/').pop() : 'none';
    console.log(`${r.key.padEnd(10)} ${r.price.padStart(7)}  variant=${numeric}`);
  }

  const failed = results.filter((r) => r.error || !r.variantId);
  console.log(`\nDone. ${results.length - failed.length}/${results.length} products ready.`);
  if (failed.length) {
    console.log('Failures: ' + failed.map((f) => f.key).join(', '));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFATAL: ' + err.message);
  process.exit(1);
});
