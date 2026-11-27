// The colour theme (specs/036-web-design R-3, FR-005). On the first visit the device's theme
// is taken and kept; after that the visitor's choice (light / dark) is. It lives in
// localStorage — not a cookie, so the server renders one page for everyone and pages stay
// cacheable (ADR 0025).

export type Theme = 'light' | 'dark';

export const THEME_KEY = 'theme';

/**
 * Runs in <head> before the first paint: sets `data-theme` on <html> from the stored theme
 * or, on the first visit, from the device's setting, and stores that, so later visits keep
 * it and no page shows a frame of the other theme. If storage is blocked the device's
 * theme applies for this page. Without JavaScript the attribute is absent and CSS follows
 * the device.
 */
export const themeScript =
  `try{var t=localStorage.getItem('${THEME_KEY}');` +
  `if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';` +
  `localStorage.setItem('${THEME_KEY}',t)}` +
  `document.documentElement.dataset.theme=t}catch(e){}`;

/** The theme a page shows: what the head script set, or the device's. */
export function currentTheme(root: { dataset: DOMStringMap }, deviceDark: boolean): Theme {
  const set = root.dataset.theme;
  return set === 'light' || set === 'dark' ? set : deviceDark ? 'dark' : 'light';
}

export const otherTheme = (theme: Theme): Theme => (theme === 'light' ? 'dark' : 'light');
