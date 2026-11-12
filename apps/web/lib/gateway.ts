import type { CategoryDto, CategoryListDto } from '@master-commerce/dto';

export type CategoriesResult = { kind: 'ok'; items: CategoryDto[] } | { kind: 'unavailable' };

const TIMEOUT_MS = 3000;

function gatewayUrl(): string {
  return process.env.GATEWAY_URL ?? 'http://localhost:3001';
}

/** Server-side only: the web app talks to the gateway and nothing else (FR-030). */
export async function fetchCategories(): Promise<CategoriesResult> {
  try {
    const res = await fetch(new URL('/api/v1/categories', gatewayUrl()), {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { kind: 'unavailable' };
    const body = (await res.json()) as Partial<CategoryListDto> | null;
    // A 200 of another shape (a proxy, a foreign process on the port) is "unavailable",
    // never a crash of the page.
    if (!Array.isArray(body?.items)) return { kind: 'unavailable' };
    return { kind: 'ok', items: body.items };
  } catch {
    return { kind: 'unavailable' };
  }
}
