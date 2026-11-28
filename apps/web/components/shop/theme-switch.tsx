'use client';

import { useEffect, useState } from 'react';
import { currentTheme, otherTheme, THEME_KEY, type Theme } from '../../lib/theme';
import { buttonClass } from '../ui/button';
import { MoonIcon, SunIcon } from '../ui/icons';

// The theme switch (FR-005, R-3): one button, light ⇄ dark; the choice is kept. A client
// island; the server renders an empty place of the same size, so nothing moves when it
// appears and nothing is shown without JavaScript (the device theme applies then). The
// icon shows the theme the button switches to.

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const read = () =>
      setTheme(currentTheme(root, window.matchMedia('(prefers-color-scheme: dark)').matches));
    read();
    // Another switch on the page (the header has one per layout) may change the theme.
    const watch = new MutationObserver(read);
    watch.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => watch.disconnect();
  }, []);

  // A block of the button's size wherever it is put, so nothing moves when it mounts.
  if (theme === null) return <span aria-hidden="true" className="block size-10" />;

  const next = otherTheme(theme);
  const Icon = next === 'dark' ? MoonIcon : SunIcon;
  const change = () => {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not kept between pages; applied to this one below.
    }
    document.documentElement.dataset.theme = next;
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={change}
      className={buttonClass('ghost', 'icon')}
      aria-label={`Switch to the ${next} theme`}
      title={`Switch to the ${next} theme`}
    >
      <Icon />
    </button>
  );
}
