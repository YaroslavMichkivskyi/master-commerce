import { expect, test } from './fixtures';

// TC-23…TC-25 (R-7): on a cold load of each storefront route — the JavaScript a browser
// downloads (compressed) within 150 KB, no layout shift after load, no request to another
// origin (the font is ours).

const ROUTES = ['/', '/c/graphics-cards', '/brands/asus', '/search?q=rtx', '/p/visual-big-price'];
const JS_BUDGET = 150 * 1024;

for (const route of ROUTES) {
  test(`budget of ${route}`, async ({ page, baseURL }, info) => {
    test.skip(info.project.name !== 'phone', 'measured once, on the phone profile');
    const origin = new URL(baseURL!).origin;
    const foreign: string[] = [];
    const scripts: Promise<number>[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) {
        foreign.push(request.url());
      }
    });
    page.on('requestfinished', (request) => {
      if (request.resourceType() === 'script') {
        scripts.push(request.sizes().then((s) => s.responseBodySize));
      }
    });
    await page.addInitScript(() => {
      (window as unknown as { cls: number }).cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput) (window as unknown as { cls: number }).cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await page.goto(route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    const js = (await Promise.all(scripts)).reduce((a, b) => a + b, 0);
    const cls = await page.evaluate(() => (window as unknown as { cls: number }).cls);
    info.annotations.push({ type: 'js', description: `${(js / 1024).toFixed(1)} KB` });
    info.annotations.push({ type: 'cls', description: cls.toFixed(4) });
    console.log(
      `budget ${route}: JS ${(js / 1024).toFixed(1)} KB compressed, CLS ${cls.toFixed(4)}`,
    );

    expect(js, `compressed JS of ${route}`).toBeLessThanOrEqual(JS_BUDGET);
    expect(cls, `layout shift of ${route}`).toBeLessThanOrEqual(0.1);
    expect(foreign, 'requests to other origins').toEqual([]);
  });
}
