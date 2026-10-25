// The live demo on the home page. It is the real thing, not a recording:
// its own controller and session, running the real BST search generator,
// with Guess mode switched on.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { SettingsStore } from '../app/settings';
import { WorkspaceController } from '../app/WorkspaceController';
import type { BstSnapshot } from '../models/BinarySearchTree';
import { bstDef } from '../registry/structures/bst';
import { BstView } from '../render';
import * as Icon from './Icons';

const KEYS = [60, 35, 80, 45, 20];
const demoSettings = new SettingsStore({ guess: true, speed: 1, theme: 'system' });

function startDemo(key: number) {
  const c = new WorkspaceController(bstDef, demoSettings);
  c.selectOp('bst.search');
  c.run({ value: String(key) });
  return c;
}

export function HeroDemo() {
  const [round, setRound] = useState(0);
  const [c, setC] = useState(() => startDemo(KEYS[0]));
  const view = useSyncExternalStore(c.subscribe, c.getView);
  useEffect(() => () => c.dispose(), [c]);

  const step = view.step;
  const session = view.session;
  const key = KEYS[round % KEYS.length];
  const question = step?.kind === 'ask' ? step.question : undefined;
  const answer = session?.answer;

  const again = () => {
    const next = round + 1;
    setRound(next);
    setC(startDemo(KEYS[next % KEYS.length]));
  };

  return (
    <div className="demo" aria-label="Live example: search a binary search tree">
      <div className="demo__head">
        <span className="demo__title">Try it: search for {key}</span>
        <span className="demo__count tabular">
          {session?.finished && session.atNewest ? 'done' : `step ${(session?.index ?? 0) + 1}`}
        </span>
      </div>
      <div className="demo__stage">
        <BstView snapshot={view.snapshot as BstSnapshot} step={step as any} />
      </div>
      <div className="demo__talk" aria-live="polite">
        {question && session?.phase === 'question' ? (
          <>
            <p className="demo__prompt">{question.prompt}</p>
            <div className="demo__options">
              {question.options.map((o) => (
                <button key={o.id} type="button" className="option" onClick={() => c.answer(o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
          </>
        ) : question && answer ? (
          <p className="demo__msg">
            <strong>{answer.correct ? 'Right.' : 'Not quite.'}</strong> {question.reason}
          </p>
        ) : (
          <p className="demo__msg">{step?.message}</p>
        )}
        <div className="demo__actions">
          {session?.finished && session.atNewest ? (
            <button type="button" className="btn btn--primary" onClick={again}>
              <Icon.Restart /> Search for another key
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => c.next()}
              disabled={!session?.canNext}
            >
              Next <Icon.Next />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
