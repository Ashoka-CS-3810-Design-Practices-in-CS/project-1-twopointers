// One structure's page: rail on the left, stage and step bar in the middle,
// notebook on the right. Every structure uses the same layout, so learning
// one tab teaches you the others (A3, section 4.8).

import { useEffect, useState } from 'react';
import { useSettings, useWorkspace } from '../app/workspaces';
import type { WorkspaceController, WorkspaceView } from '../app/WorkspaceController';
import type { StructureId } from '../core/types';
import { BstView, GraphView, HeapView, Legend, QueueView, StackView } from '../render';
import * as Icon from './Icons';
import { Rail } from './Rail';
import { SidePanels } from './SidePanels';
import { StepBar } from './StepBar';

const EMPTY_HINT: Record<StructureId, string> = {
  bst: 'Pick an operation on the left and press Run. Then use Next to move through it one step at a time.',
  graph: 'Choose a start vertex, pick breadth first or depth first, and press Run.',
  heap: 'Enqueue an entry or extract the minimum, then step through the swaps.',
  stack: 'Type a value and push it, or pop one off. Each operation runs straight away.',
  queue: 'Enqueue a value or dequeue one. Watch the front and rear markers, not the values, move.',
};

export function Workspace({ id }: { id: StructureId }) {
  const [view, c] = useWorkspace(id);
  const s = useSettings();
  const [dragMode, setDragMode] = useState<'connect' | 'move'>('connect');
  const [railOpen, setRailOpen] = useState(false);
  const def = c.def;
  const shownOpId = view.session?.opId ?? view.selectedOp;
  const op = def.operations.find((o) => o.id === shownOpId) ?? def.operations[0];

  useStepKeys(view, c);

  // Leaving the page stops any Auto timer so nothing ticks in the background.
  useEffect(() => () => c.pause(), [c]);

  const railHidden = s.present && !railOpen;

  return (
    <main className={`workspace${s.present ? ' workspace--present' : ''}`} id="main">
      {s.present && (
        <button
          type="button"
          className="rail-toggle btn btn--small"
          onClick={() => setRailOpen((o) => !o)}
        >
          {railOpen ? 'Hide build and operate' : 'Show build and operate'}
        </button>
      )}

      <aside className="rail" hidden={railHidden} aria-label="Build and operate">
        <Rail view={view} c={c} def={def} dragMode={dragMode} setDragMode={setDragMode} />
      </aside>

      <section className="center" aria-labelledby="structure-title">
        <header className="center__head">
          <h1 id="structure-title">{def.name}</h1>
          <p>{def.intro}</p>
        </header>

        <div className={`stage stage--${def.id}`}>
          <Stage view={view} c={c} dragMode={dragMode} />
        </div>

        <StepBar
          view={view}
          c={c}
          emptyHint={EMPTY_HINT[def.id]}
          compact={def.operations.every((o) => o.pace === 'quick')}
        />

        <FirstVisitTip />

        <details className="legend-wrap">
          <summary>What the colours and outlines mean</summary>
          <Legend structure={def.id} />
        </details>
      </section>

      <aside className="notebook" aria-label="What is happening, pseudocode and cost">
        <SidePanels view={view} def={def} op={op} />
      </aside>
    </main>
  );
}

function Stage({
  view,
  c,
  dragMode,
}: {
  view: WorkspaceView;
  c: WorkspaceController;
  dragMode: 'connect' | 'move';
}) {
  const step = view.step as any;
  switch (view.structure) {
    case 'bst':
      return <BstView snapshot={view.snapshot} step={step} />;
    case 'heap':
      return <HeapView snapshot={view.snapshot} step={step} />;
    case 'stack':
      return <StackView snapshot={view.snapshot} step={step} />;
    case 'queue':
      return <QueueView snapshot={view.snapshot} step={step} />;
    case 'graph':
      return (
        <GraphView
          snapshot={view.snapshot}
          step={step}
          source={view.graph.source}
          target={view.graph.target}
          selection={view.graph.selection}
          editable={!view.locked}
          dragMode={dragMode}
          onAddVertex={(x, y) => c.addVertex(x, y)}
          onConnect={(a, b) => c.connect(a, b)}
          onMove={(vid, x, y) => c.moveVertex(vid, x, y)}
          onSelect={(sel) => c.select(sel)}
          onSetSource={(vid) => c.setSource(vid)}
        />
      );
  }
}

/** Keyboard shortcuts for the step controls (A3, table 5). */
function useStepKeys(view: WorkspaceView, c: WorkspaceController) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const onButton = !!target?.closest('button, a, summary');
      const question = view.step?.question;

      switch (e.key) {
        case 'ArrowRight':
          if (view.session) {
            c.next();
            e.preventDefault();
          }
          break;
        case ' ':
          if (view.session && !onButton) {
            c.next();
            e.preventDefault();
          }
          break;
        case 'ArrowLeft':
          if (view.session) {
            c.back();
            e.preventDefault();
          }
          break;
        case 'r':
        case 'R':
          c.restart();
          break;
        case 'a':
        case 'A':
          c.toggleAuto();
          break;
        case 'f':
        case 'F':
          c.finish();
          break;
        case 'v':
        case 'V':
          c.reveal();
          break;
        case 'Escape':
          c.close();
          break;
        case 'Delete':
        case 'Backspace':
          if (view.structure === 'graph' && view.graph.selection) {
            c.removeSelection();
            e.preventDefault();
          }
          break;
        default:
          if (/^[1-4]$/.test(e.key) && question && view.session?.phase === 'question') {
            const option = question.options[Number(e.key) - 1];
            if (option) c.answer(option.id);
          }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, c]);
}

const TIP_KEY = 'stepwise.tipDismissed';

function FirstVisitTip() {
  const [show, setShow] = useState(() => {
    try {
      return window.localStorage.getItem(TIP_KEY) !== '1';
    } catch {
      return true;
    }
  });
  if (!show) return null;
  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(TIP_KEY, '1');
    } catch {
      // Not being able to remember this is harmless.
    }
  };
  return (
    <div className="tip" role="note">
      <Icon.Info />
      <p>
        <strong>New here?</strong> Build something on the left, pick an operation and press Run.
        Each press of <kbd>Next</kbd> runs exactly one step of the algorithm. With Guess mode on,
        you predict each decision before it happens.
      </p>
      <button type="button" className="btn btn--quiet btn--small" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}
