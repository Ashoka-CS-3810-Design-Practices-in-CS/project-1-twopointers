// Help: the 30 second introduction and every keyboard shortcut (A3, view 4).

import { useEffect, useRef } from 'react';
import * as Icon from './Icons';

const SHORTCUTS: [string[], string][] = [
  [['→', 'Space'], 'Next step'],
  [['←'], 'Previous step'],
  [['1', '2', '3', '4'], 'Answer the open question'],
  [['R'], 'Restart the operation'],
  [['A'], 'Auto on or off'],
  [['F'], 'Finish (skip to the end)'],
  [['Esc'], 'Close the operation'],
  [['G'], 'Guess mode on or off'],
  [['P'], 'Presentation mode'],
  [['V'], 'Reveal the answer (presentation mode)'],
  [['Delete'], 'Remove the selected vertex or edge'],
  [['?'], 'This help'],
];

export function HelpSheet({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet__head">
          <h2 id="help-title">How Stepwise works</h2>
          <button
            ref={closeRef}
            type="button"
            className="btn btn--quiet btn--small icon-only"
            onClick={onClose}
            aria-label="Close help"
          >
            <Icon.Close />
          </button>
        </header>

        <ol className="sheet__steps">
          <li>
            <strong>Build</strong> a structure on the left: type values, load an example, or click
            the canvas to draw a graph.
          </li>
          <li>
            <strong>Pick an operation</strong> and press Run. The pseudocode and its cost show up
            straight away.
          </li>
          <li>
            <strong>Press Next</strong> to run exactly one step. Nothing runs ahead of you, and Back
            shows any step you have already seen.
          </li>
          <li>
            <strong>Guess mode</strong> asks you to predict each decision first. Right or wrong, you
            get the reason.
          </li>
        </ol>

        <h3>Keyboard shortcuts</h3>
        <dl className="shortcuts">
          {SHORTCUTS.map(([keys, what]) => (
            <div key={what} className="shortcuts__row">
              <dt>
                {keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>

        <p className="sheet__foot">
          Shortcuts are ignored while you are typing in a field. Colours always come with an outline
          style and a word, so nothing depends on colour alone.
        </p>
      </div>
    </div>
  );
}
