import { createServer, type Server, type Socket } from 'node:net';
import { type AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CONNECTION_TIMEOUT_MS, createPool } from '../src/db/database.js';

// A database host that accepts TCP but never answers (paused container, black-holed port).
describe('database pool against a silent server', () => {
  let silent: Server;
  const sockets: Socket[] = [];
  let url: string;

  beforeAll(async () => {
    silent = createServer((socket) => void sockets.push(socket));
    await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve));
    url = `postgres://u:p@127.0.0.1:${(silent.address() as AddressInfo).port}/db`;
  });

  afterAll(async () => {
    sockets.forEach((s) => s.destroy());
    await new Promise((resolve) => silent.close(resolve));
  });

  it('fails the query after the connection timeout instead of hanging', async () => {
    const pool = createPool(url);
    const started = Date.now();
    try {
      await expect(pool.query('select 1')).rejects.toThrow(/timeout/i);
      expect(Date.now() - started).toBeLessThan(CONNECTION_TIMEOUT_MS + 1500);
    } finally {
      await pool.end();
    }
  });
});
