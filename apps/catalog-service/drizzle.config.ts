import { defineConfig } from 'drizzle-kit';

// `pnpm db:generate` writes SQL migrations to ./drizzle; they are committed and applied on start.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
