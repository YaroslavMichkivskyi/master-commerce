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
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(currentTheme(document.documentElement, dark));
  }, []);

  if (theme === null) return <span aria-hidden="true" className="size-10" />;

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
