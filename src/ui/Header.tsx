// Top bar: brand, the five structures, and the global switches.

import { settings, type ThemeChoice } from '../app/settings';
import { useSettings } from '../app/workspaces';
import { STRUCTURES } from '../registry';
import * as Icon from './Icons';
import { href, type Route } from './route';

const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};
const THEME_LABEL: Record<ThemeChoice, string> = {
  system: 'Theme: follows your system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

export function Header({ route, onHelp }: { route: Route; onHelp: () => void }) {
  const s = useSettings();

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <a className="brand" href={href('home')} aria-label="Stepwise home">
          <Icon.Logo className="brand__mark" />
          <span className="brand__name">Stepwise</span>
        </a>

        <nav className="topnav" aria-label="Structures">
          <ul>
            {STRUCTURES.map((def) => (
              <li key={def.id}>
                <a href={href(def.id)} aria-current={route === def.id ? 'page' : undefined}>
                  {def.shortName}
                </a>
              </li>
            ))}
            <li>
              <a href={href('compare')} aria-current={route === 'compare' ? 'page' : undefined}>
                Compare
              </a>
            </li>
          </ul>
        </nav>

        <div className="topbar__tools">
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked={s.guess}
            onClick={() => settings.set({ guess: !s.guess })}
            title="Ask me to predict each decision before it happens (G)"
          >
            <span className="switch__track" aria-hidden="true" />
            <span>Guess mode</span>
          </button>
          <button
            type="button"
            className="btn btn--quiet btn--small"
            aria-pressed={s.present}
            onClick={() => settings.set({ present: !s.present })}
            title="Presentation mode: larger text, answers hidden until revealed (P)"
          >
            <Icon.Screen />
            <span className="hide-narrow">Present</span>
          </button>
          <button
            type="button"
            className="btn btn--quiet btn--small icon-only"
            onClick={() => settings.set({ theme: NEXT_THEME[s.theme] })}
            aria-label={THEME_LABEL[s.theme]}
            title={THEME_LABEL[s.theme]}
          >
            {s.theme === 'dark' ? (
              <Icon.Moon />
            ) : s.theme === 'light' ? (
              <Icon.Sun />
            ) : (
              <ThemeAutoIcon />
            )}
          </button>
          <button
            type="button"
            className="btn btn--quiet btn--small icon-only"
            onClick={onHelp}
            aria-label="Help and keyboard shortcuts"
            title="Help and keyboard shortcuts (?)"
          >
            <Icon.Help />
          </button>
        </div>
      </div>
    </header>
  );
}

function ThemeAutoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
    </svg>
  );
}
