// App-wide settings: Guess mode, playback speed, presentation mode and theme.
// A tiny observable store, so both the controllers and React can read it.
//
// Guess mode, speed and theme are remembered in localStorage when the browser
// allows it. Presentation mode deliberately is not: it should never be on by
// surprise the next time someone opens the page.

export type ThemeChoice = 'system' | 'light' | 'dark';

export interface Settings {
  guess: boolean;
  speed: number;
  present: boolean;
  theme: ThemeChoice;
}

export const SPEEDS = [0.5, 1, 1.5, 2, 3];

/** Milliseconds between Auto steps at 1x. */
export const BASE_INTERVAL = 1100;

const STORAGE_KEY = 'stepwise.settings';

function load(): Partial<Settings> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Settings>) : {};
  } catch {
    return {};
  }
}

function save(settings: Settings): void {
  try {
    const { guess, speed, theme } = settings;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ guess, speed, theme }));
  } catch {
    // Storage can be blocked (private windows, embedded previews). That is fine.
  }
}

export class SettingsStore {
  private state: Settings;
  private listeners = new Set<() => void>();

  constructor(initial?: Partial<Settings>) {
    const stored = initial ?? (typeof window === 'undefined' ? {} : load());
    this.state = {
      guess: stored.guess ?? true,
      speed: SPEEDS.includes(stored.speed ?? 1) ? (stored.speed ?? 1) : 1,
      present: false,
      theme: stored.theme ?? 'system',
    };
  }

  get = (): Settings => this.state;

  set(patch: Partial<Settings>): void {
    this.state = { ...this.state, ...patch };
    if (typeof window !== 'undefined') save(this.state);
    this.listeners.forEach((fn) => fn());
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  interval(): number {
    return Math.round(BASE_INTERVAL / this.state.speed);
  }
}

export const settings = new SettingsStore();
