import 'reflect-metadata';
import { createApp } from './bootstrap.js';
import { loadConfig } from './config.js';

const app = await createApp();
await app.listen(loadConfig().port);
console.log(`api-gateway listening on ${await app.getUrl()}`);
