// Top-level shell: header, the current page, the help sheet, and the global
// shortcuts that work on every page (G, P, ?).

import { useCallback, useEffect, useState } from 'react';
import { settings } from './app/settings';
import { useSettings } from './app/workspaces';
import { STRUCTURES } from './registry';
import { ComparePage } from './ui/ComparePage';
import { Header } from './ui/Header';
import { HelpSheet } from './ui/HelpSheet';
import { HomePage } from './ui/HomePage';
import { isStructure, useRoute } from './ui/route';
import { Workspace } from './ui/Workspace';

// If whatever hosts the page already chose a theme, "system" goes back to that
// choice instead of wiping it.
const hostTheme =
  typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;

export default function App() {
  const route = useRoute();
  const s = useSettings();
  const [help, setHelp] = useState(false);
  const closeHelp = useCallback(() => setHelp(false), []);

  // Theme and presentation mode live on <html> so the CSS tokens can follow.
  useEffect(() => {
    const root = document.documentElement;
    if (s.theme !== 'system') root.setAttribute('data-theme', s.theme);
    else if (hostTheme) root.setAttribute('data-theme', hostTheme);
    else root.removeAttribute('data-theme');
    root.classList.toggle('present', s.present);
  }, [s.theme, s.present]);

  useEffect(() => {
    const def = isStructure(route) ? STRUCTURES.find((d) => d.id === route) : null;
    document.title = def
      ? `${def.name} | Stepwise`
      : route === 'compare'
        ? 'Compare | Stepwise'
        : 'Stepwise';
  }, [route]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'g' || e.key === 'G') settings.set({ guess: !settings.get().guess });
      else if (e.key === 'p' || e.key === 'P') settings.set({ present: !settings.get().present });
      else if (e.key === '?') setHelp((h) => !h);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header route={route} onHelp={() => setHelp(true)} />
      {route === 'home' && <HomePage />}
      {route === 'compare' && <ComparePage />}
      {isStructure(route) && <Workspace key={route} id={route} />}
      {help && <HelpSheet onClose={closeHelp} />}
    </>
  );
}
