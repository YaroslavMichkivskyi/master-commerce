import 'reflect-metadata';
import { type Server } from 'node:http';
import { fileURLToPath } from 'node:url';
import { type INestApplication } from '@nestjs/common';
import { type BrandDto, type CategoryDetailDto, type ProductDto } from '@master-commerce/dto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { type CatalogDatabase, startCatalogDatabase } from './support/catalog-database.js';

const P = '/api/v1/admin/catalog';

/**
 * The gateway, built as its own main.ts builds it: the test follows a request from the
 * public door to the database. Imported by path at run time: the gateway is another app,
 * outside this package's TypeScript program.
 */
async function createGateway(): Promise<INestApplication> {
  const path = fileURLToPath(new URL('../../api-gateway/src/bootstrap.ts', import.meta.url));
  const gateway = (await import(path)) as { createApp: () => Promise<INestApplication> };
  return gateway.createApp();
}

// US-1 then US-2 through api-gateway, against catalog-service on a real PostgreSQL
// (TASK-4 AC #1, FR-050).
describe('the admin API end to end: gateway → catalog → PostgreSQL', () => {
  let database: CatalogDatabase;
  let catalog: INestApplication;
  let gateway: INestApplication;

  const http = () => request(gateway.getHttpServer() as Server);

  beforeAll(async () => {
    database = await startCatalogDatabase();
    process.env.CATALOG_DATABASE_URL = database.appUrl;
    catalog = await createApp();
    await catalog.listen(0, '127.0.0.1');
    process.env.CATALOG_SERVICE_URL = await catalog.getUrl();
    gateway = await createGateway();
    await gateway.init();
  });

  afterAll(async () => {
    await gateway?.close();
    await catalog?.close();
    await database?.container.stop();
  });

  it('defines "Graphics cards" with attributes, then adds a valid product (US-1, US-2)', async () => {
    // US-1: the seeded "Graphics cards" gets its attributes.
    const created = await http().get(`${P}/categories/by-slug/graphics-cards`).expect(200);
    const category = created.body as CategoryDetailDto;
    expect(category).toMatchObject({ name: 'Graphics cards', attributes: [] });
    expect(created.headers.etag).toBe('"1"');

    const defined = await http()
      .put(`${P}/categories/${category.id}/attributes`)
      .set('If-Match', created.headers.etag as string)
      .send({
        attributes: [
          {
            code: 'chipset',
            name: 'Chipset',
            type: 'text',
            required: true,
            maxLength: 50,
            sortOrder: 10,
          },
          {
            code: 'memory_size',
            name: 'Memory size',
            type: 'number',
            required: true,
            unit: 'GB',
            minValue: 1,
            maxValue: 64,
            wholeNumbers: true,
            sortOrder: 20,
          },
          {
            code: 'memory_type',
            name: 'Memory type',
            type: 'select',
            required: true,
            allowedValues: ['GDDR6', 'GDDR6X', 'GDDR7'],
            sortOrder: 30,
          },
          {
            code: 'ray_tracing',
            name: 'Ray tracing',
            type: 'boolean',
            required: false,
            sortOrder: 40,
          },
        ],
      })
      .expect(200);
    expect((defined.body as CategoryDetailDto).attributes.map((a) => a.code)).toEqual([
      'chipset',
      'memory_size',
      'memory_type',
      'ray_tracing',
    ]);
    expect(defined.headers.etag).toBe('"2"');

    // US-2: the brand and the product, unpublished.
    const asus = (await http().post(`${P}/brands`).send({ name: 'ASUS', slug: 'asus' }).expect(201))
      .body as BrandDto;
    const product = {
      name: 'ASUS Dual GeForce RTX 4060 8GB',
      slug: 'asus-dual-geforce-rtx-4060-8gb',
      sku: 'ASUS-DUAL-RTX4060-O8G',
      brandId: asus.id,
      categoryId: category.id,
      priceCents: 32999,
      stock: 12,
      specs: {
        chipset: 'GeForce RTX 4060',
        memory_size: 8,
        memory_type: 'GDDR6',
        ray_tracing: true,
      },
    };
    const stored = await http().post(`${P}/products`).send(product).expect(201);
    expect(stored.body).toMatchObject({ ...product, published: false, version: 1 });

    // US-3 through the gateway: the catalog's 400 with every field, at the gateway's path.
    const invalid = await http()
      .post(`${P}/products`)
      .send({ ...product, slug: 'bad', sku: 'BAD', specs: { memory_size: 8.5 } })
      .expect(400);
    expect(invalid.body).toMatchObject({
      instance: `${P}/products`,
      errors: [
        { field: 'specs.chipset', messages: ['chipset is required'] },
        {
          field: 'specs.memory_size',
          messages: ['memory_size must be a whole number from 1 to 64'],
        },
        { field: 'specs.memory_type', messages: ['memory_type is required'] },
      ],
    });

    // A change with the version read, then the same version again: 412 (FR-033).
    const id = (stored.body as ProductDto).id;
    await http()
      .patch(`${P}/products/${id}`)
      .set('If-Match', '"1"')
      .send({ priceCents: 29999 })
      .expect(200)
      .expect('etag', '"2"');
    await http()
      .patch(`${P}/products/${id}`)
      .set('If-Match', '"1"')
      .send({ priceCents: 1 })
      .expect(412);
    await http().patch(`${P}/products/${id}`).send({ stock: 1 }).expect(428);

    const read = await http().get(`${P}/products/by-slug/${product.slug}`).expect(200);
    expect(read.body).toMatchObject({ priceCents: 29999, version: 2 });
  });
});
