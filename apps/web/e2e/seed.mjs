// The edge cases of the visual tests (test-cases.md TC-00), added through the admin API
// after datagen, so the cases never depend on what the seed happens to produce: a product
// with a 200-character name, one out of stock, one at €12,999.99, and a live category
// without products. Run by scripts/visual.mjs: `node e2e/seed.mjs <gateway url>`.

const gateway = process.argv[2];
if (!gateway) throw new Error('usage: node e2e/seed.mjs <gateway url>');
const ADMIN = `${gateway}/api/v1/admin/catalog`;

async function call(method, path, body, version) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  // A change of an existing entity names the version it is based on (TASK-4 FR-033).
  if (version !== undefined) headers['if-match'] = `"${version}"`;
  const res = await fetch(`${ADMIN}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : undefined;
}

// A graphics card of the seed lends its brand, category and specs to the edge cases.
const category = await call('GET', '/categories/by-slug/graphics-cards');
const page = await call('GET', `/products?categoryId=${category.id}&limit=1`);
const model = page.items[0];
if (!model) throw new Error('the seed has no graphics card');

const LONG =
  'ASUS ROG Astral GeForce RTX 6090 32GB GDDR7 OC Edition White with Quad-Fan Vapor ' +
  'Chamber Cooling, Dual BIOS, Aura Sync ARGB Lighting, 16-pin Power Connector and an ' +
  'Extra Long Name for Tests';

const EDGE = [
  {
    slug: 'visual-long-name',
    sku: 'VIS-LONG-1',
    name: LONG.slice(0, 200),
    price: 189999,
    stock: 4,
  },
  {
    slug: 'visual-out-of-stock',
    sku: 'VIS-OUT-1',
    name: 'Visual Test GeForce RTX 6050 Out of Stock',
    price: 29999,
    stock: 0,
  },
  {
    slug: 'visual-big-price',
    sku: 'VIS-BIG-1',
    name: 'Visual Test Workstation RTX 9000 96GB',
    price: 1299999,
    stock: 2,
  },
];

for (const p of EDGE) {
  const created = await call('POST', '/products', {
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    description: 'A product added by the visual tests.',
    brandId: model.brandId,
    categoryId: model.categoryId,
    priceCents: p.price,
    stock: p.stock,
    specs: model.specs,
  });
  await call('POST', `/products/${created.id}/publish`, undefined, created.version);
}

// A live category with nothing in it (TC-07), under the top category of graphics cards.
await call('POST', '/categories', {
  name: 'Empty shelf',
  slug: 'empty-shelf',
  parentId: category.parentId,
});

console.log(`seed: ${EDGE.length} edge-case products and the empty category added`);
