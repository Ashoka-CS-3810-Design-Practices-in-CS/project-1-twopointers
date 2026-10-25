// The tutor's note under the diagram, and the step controls.
//
// This is where the learner talks to the algorithm: it shows what the current
// step did and why, asks the Guess mode question when there is one, and gives
// feedback on the answer. It never covers the diagram.

import { useEffect, useRef } from 'react';
import { settings, SPEEDS } from '../app/settings';
import { useSettings } from '../app/workspaces';
import type { WorkspaceController, WorkspaceView } from '../app/WorkspaceController';
import type { Tone } from '../core/types';
import * as Icon from './Icons';

interface Props {
  view: WorkspaceView;
  c: WorkspaceController;
  emptyHint: string;
  /** Stack and queue only have quick operations, so most controls never apply. */
  compact?: boolean;
}

const TONE_ICON: Record<Tone, JSX.Element | null> = {
  neutral: <Icon.Info />,
  good: <Icon.Check />,
  warn: <Icon.Alert />,
  bad: <Icon.Cross />,
};

export function StepBar({ view, c, emptyHint, compact = false }: Props) {
  const s = useSettings();
  const session = view.session;
  const step = view.step;
  const stepped = !!session && !session.quick;
  const barRef = useRef<HTMLElement>(null);
  const lastSession = useRef<number | null>(null);

  // Keep keyboard focus where the next action is: on the first answer while
  // a question is open, otherwise on Next. We only move focus when it would
  // otherwise be lost (on the page body) or already lives in the step bar,
  // so we never pull the learner out of a field they are typing in.
  const focusKey = stepped
    ? `${session.id}:${session.index}:${session.phase}:${session.answer ? 1 : 0}`
    : null;
  useEffect(() => {
    const bar = barRef.current;
    if (!focusKey || !bar || !session) return;
    const fresh = lastSession.current !== session.id;
    lastSession.current = session.id;
    const active = document.activeElement as HTMLElement | null;
    const lost = !active || active === document.body || !!active.closest('.rail');
    if (!fresh && !lost && !bar.contains(active)) return;
    if (active?.matches('input, select, textarea') && !fresh) return;
    const target =
      session.phase === 'question'
        ? bar.querySelector<HTMLButtonElement>('.option:not(:disabled)')
        : bar.querySelector<HTMLButtonElement>('.btn--next:not(:disabled)');
    target?.focus({ preventScroll: true });
    if (fresh)
      bar.parentElement
        ?.querySelector('.stage')
        ?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  return (
    <section ref={barRef} className="stepbar" aria-label="Step explanation and controls">
      <div className="stepbar__note" aria-live="polite" aria-atomic="true">
        <Note view={view} c={c} present={s.present} emptyHint={emptyHint} />
        {session && view.notice && (
          <p className={`notice notice--${view.notice.tone}`}>{view.notice.text}</p>
        )}
      </div>

      <div className="stepbar__controls">
        <div className="stepbar__count tabular" aria-live="off">
          {session ? (
            session.finished && session.atNewest ? (
              <>Finished in {session.length} steps</>
            ) : (
              <>Step {session.index + 1}</>
            )
          ) : step ? (
            'Done'
          ) : (
            'Ready'
          )}
        </div>

        <div className="stepbar__buttons">
          {compact ? (
            <button
              type="button"
              className="btn btn--primary btn--next"
              onClick={() => c.next()}
              disabled={!session?.canNext}
              title="Next step (Right arrow or Space)"
            >
              Next
              <Icon.Next />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => c.restart()}
                disabled={!stepped}
                title="Start this operation again from the first step (R)"
              >
                <Icon.Restart />
                <span className="hide-narrow">Restart</span>
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => c.back()}
                disabled={!session?.canBack}
                title="Previous step (Left arrow)"
              >
                <Icon.Back />
                Back
              </button>
              <button
                type="button"
                className="btn btn--primary btn--next"
                onClick={() => c.next()}
                disabled={!session?.canNext}
                title={
                  session?.phase === 'question'
                    ? 'Answer the question first'
                    : 'Next step (Right arrow or Space)'
                }
              >
                Next
                <Icon.Next />
              </button>
              <button
                type="button"
                className="btn"
                aria-pressed={view.auto}
                onClick={() => c.toggleAuto()}
                disabled={!stepped || (!view.auto && !session?.canNext)}
                title="Press Next for me on a timer. Stops at every question (A)"
              >
                {view.auto ? <Icon.Pause /> : <Icon.Play />}
                Auto
              </button>
              <label className="speed">
                <span className="visually-hidden">Auto speed</span>
                <select
                  id="auto-speed"
                  className="select select--small"
                  value={s.speed}
                  onChange={(e) => {
                    settings.set({ speed: Number(e.target.value) });
                    c.refresh();
                  }}
                  disabled={!stepped}
                >
                  {SPEEDS.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}×
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => c.finish()}
                disabled={!stepped || session.finished}
                title="Skip to the end without questions (F)"
              >
                <Icon.SkipEnd />
                <span className="hide-narrow">Finish</span>
              </button>
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => c.close()}
                disabled={!stepped}
                title="Close this operation (Esc)"
              >
                <Icon.Close />
                <span className="hide-narrow">{session?.finished ? 'Done' : 'Close'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Note({ view, c, present, emptyHint }: Props & { present: boolean }) {
  const step = view.step;
  const session = view.session;

  if (!step) {
    const tone = view.notice?.tone ?? 'neutral';
    return (
      <p className={`note note--${tone}`}>
        <span className="note__icon">{TONE_ICON[tone]}</span>
        <span>{view.notice?.text ?? emptyHint}</span>
      </p>
    );
  }

  if (step.kind === 'ask' && step.question) {
    const q = step.question;
    const answer = session?.answer;
    const open = session?.phase === 'question';
    const correctLabel = q.options.find((o) => o.id === q.answer)?.label ?? q.answer;

    return (
      <div className="question">
        <p className="question__prompt">
          <span className="question__tag">
            <Icon.Question />
            Your turn
          </span>
          {q.prompt}
        </p>
        <div className="question__options" role="group" aria-label="Choose an answer">
          {q.options.map((o, i) => {
            const chosen = answer?.choice === o.id;
            const isRight = !!answer && o.id === q.answer;
            return (
              <button
                key={o.id}
                type="button"
                className={`option${chosen ? ' option--chosen' : ''}${isRight ? ' option--right' : ''}`}
                onClick={() => c.answer(o.id)}
                disabled={!open}
              >
                <kbd aria-hidden="true">{i + 1}</kbd>
                {o.label}
                {isRight && <Icon.Check className="option__icon" />}
              </button>
            );
          })}
          {open && present && (
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => c.reveal()}
              title="Show the answer (V)"
            >
              Reveal answer
            </button>
          )}
        </div>
        {answer ? (
          <p className={`feedback feedback--${answer.correct === false ? 'wrong' : 'right'}`}>
            <strong>
              {answer.correct === true
                ? 'Right.'
                : answer.correct === false
                  ? 'Not quite.'
                  : `Answer: ${correctLabel}.`}
            </strong>{' '}
            {q.reason}
            {answer.correct === false && <> The answer is {correctLabel}.</>}{' '}
            <span className="feedback__next">Press Next to continue.</span>
          </p>
        ) : !open ? (
          <p className="feedback feedback--right">
            <strong>Answer: {correctLabel}.</strong> {q.reason}
          </p>
        ) : (
          <p className="question__hint">
            Pick an answer to see what happens. A wrong guess is fine; you will get the reason
            either way.
          </p>
        )}
      </div>
    );
  }

  const tone = step.tone ?? 'neutral';
  return (
    <div>
      <p className={`note note--${tone} note--step`}>
        <span className="note__icon">{TONE_ICON[tone]}</span>
        <span>{step.message}</span>
      </p>
      {step.result && !session && <p className="result-chip">{step.result}</p>}
    </div>
  );
}
