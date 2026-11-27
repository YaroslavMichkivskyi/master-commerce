// The colour theme (specs/036-web-design R-3, FR-005): the device's unless the visitor
// picked one, kept in localStorage — not a cookie, so pages stay cacheable (ADR 0025).

export type Theme = 'light' | 'dark';
export type ThemeChoice = Theme | 'device';

export const THEME_KEY = 'theme';

/**
 * Runs in <head> before the first paint: sets `data-theme` on <html> from the stored
 * choice, so no page shows a frame of the other theme. Without JavaScript the attribute is
 * absent and CSS follows the device.
 */
export const themeScript = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

/** The switch goes light → dark → device → light. */
export function nextChoice(choice: ThemeChoice): ThemeChoice {
  return choice === 'light' ? 'dark' : choice === 'dark' ? 'device' : 'light';
}

export function readChoice(stored: string | null): ThemeChoice {
  return stored === 'light' || stored === 'dark' ? stored : 'device';
}
