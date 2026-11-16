import { defineConfig } from 'drizzle-kit';

// `pnpm db:generate` writes SQL migrations to ./drizzle; they are committed and applied
// by `pnpm db:migrate` with the owner role, never by the running service (FR-043).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
