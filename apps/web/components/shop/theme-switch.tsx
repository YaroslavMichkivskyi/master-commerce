'use client';

import { useEffect, useState } from 'react';
import { nextChoice, readChoice, THEME_KEY, type ThemeChoice } from '../../lib/theme';
import { buttonClass } from '../ui/button';
import { MonitorIcon, MoonIcon, SunIcon } from '../ui/icons';

// The theme switch (FR-005, R-3): one button, light → dark → device. A client island; the
// server renders an empty place of the same size, so nothing moves when it appears and
// nothing is shown without JavaScript (the device theme applies then).

const LABEL: Record<ThemeChoice, string> = { light: 'Light', dark: 'Dark', device: 'Device' };
const ICON = { light: SunIcon, dark: MoonIcon, device: MonitorIcon };

export function ThemeSwitch() {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      // Storage blocked: the device theme, and the switch still works for this page.
    }
    setChoice(readChoice(stored));
  }, []);

  if (choice === null) return <span aria-hidden="true" className="size-10" />;

  const Icon = ICON[choice];
  const change = () => {
    const next = nextChoice(choice);
    const root = document.documentElement;
    try {
      if (next === 'device') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not kept between pages; applied to this one below.
    }
    if (next === 'device') delete root.dataset.theme;
    else root.dataset.theme = next;
    setChoice(next);
  };

  return (
    <button
      type="button"
      onClick={change}
      className={buttonClass('ghost', 'icon')}
      aria-label={`Theme: ${LABEL[choice]}. Switch to ${LABEL[nextChoice(choice)]}`}
      title={`Theme: ${LABEL[choice]}`}
    >
      <Icon />
    </button>
  );
}
