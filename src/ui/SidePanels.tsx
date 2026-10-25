// The notebook column: what is happening now, the pseudocode, and the cost.
// All three read from the same step, so they always describe the same moment
// (A3, design principle 4).

import { useState } from 'react';
import type { WorkspaceView } from '../app/WorkspaceController';
import type { GraphSnapshot } from '../models/Graph';
import type { QueueSnapshot } from '../models/CircularQueue';
import type { StackSnapshot } from '../models/Stack';
import type { OperationDef, StructureDef } from '../registry/types';
import { labelFor } from '../render/labels';
import { useMediaQuery } from './useMediaQuery';

interface PanelProps {
  view: WorkspaceView;
  def: StructureDef;
  op: OperationDef;
}

type Tab = 'now' | 'code' | 'cost';

export function SidePanels(props: PanelProps) {
  const narrow = useMediaQuery('(max-width: 1180px)');
  const [tab, setTab] = useState<Tab>('now');

  if (!narrow) {
    return (
      <div className="notebook__stack">
        <NowPanel {...props} />
        <CodePanel {...props} />
        <CostPanel {...props} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'now', label: 'Now' },
    { id: 'code', label: 'Pseudocode' },
    { id: 'cost', label: 'Cost' },
  ];
  return (
    <div className="notebook__tabs">
      <div className="tabs" role="tablist" aria-label="Side panels">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className="tabs__tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'now' && <NowPanel {...props} />}
        {tab === 'code' && <CodePanel {...props} />}
        {tab === 'cost' && <CostPanel {...props} />}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  note,
}: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <section className="panel">
      <header className="panel__head">
        <h2>{title}</h2>
        {note && <span className="panel__note">{note}</span>}
      </header>
      {children}
    </section>
  );
}

function NowPanel({ view, def }: PanelProps) {
  const step = view.step;
  const name = (id: string) => labelFor(def.id, view.snapshot, id);
  const counters = Object.entries(step?.counters ?? {});

  return (
    <Panel title="Now" note={view.session ? `step ${view.session.index + 1}` : undefined}>
      <dl className="facts">
        {step && step.current.length > 0 && (
          <Row label="Looking at">
            <span className="chip chip--current">{step.current.map(name).join(', ')}</span>
          </Row>
        )}

        {step?.frontier && (
          <Row label={step.frontier.title}>
            {step.frontier.ids.length === 0 ? (
              <span className="muted">empty</span>
            ) : (
              <span className="lineup">
                {step.frontier.ends && <span className="lineup__end">{step.frontier.ends[0]}</span>}
                {step.frontier.labels.map((label, i) => (
                  <span key={`${step.frontier!.ids[i]}-${i}`} className="chip chip--waiting">
                    {label}
                  </span>
                ))}
                {step.frontier.ends && <span className="lineup__end">{step.frontier.ends[1]}</span>}
              </span>
            )}
          </Row>
        )}

        {step && step.order.length > 0 && (
          <Row label="Output so far">
            <span className="lineup">
              {step.order.map((label, i) => (
                <span key={i} className="chip chip--visited">
                  {label}
                </span>
              ))}
            </span>
          </Row>
        )}

        {step?.result && (
          <Row label="Returned">
            <span className="chip chip--found">{step.result}</span>
          </Row>
        )}

        {counters.length > 0 && (
          <Row label="Work so far">
            <span className="counters tabular">
              {counters.map(([k, v]) => (
                <span key={k}>
                  <strong>{v}</strong> {v === 1 ? singular(k) : k}
                </span>
              ))}
            </span>
          </Row>
        )}

        {view.facts.map((f) => (
          <Row key={f.label} label={f.label}>
            <span className="tabular">{f.value}</span>
          </Row>
        ))}

        {def.id === 'queue' && <QueueLine snapshot={view.snapshot as QueueSnapshot} />}
        {def.id === 'stack' && <StackLine snapshot={view.snapshot as StackSnapshot} />}
      </dl>

      {def.id === 'graph' && <Adjacency snapshot={view.snapshot as GraphSnapshot} />}
    </Panel>
  );
}

/** "comparisons" -> "comparison", "pushes" -> "push". Our counter names are all regular. */
const singular = (word: string) =>
  word.endsWith('shes') ? word.slice(0, -2) : word.replace(/s$/, '');

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="facts__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function QueueLine({ snapshot }: { snapshot: QueueSnapshot }) {
  const values: number[] = [];
  for (let k = 0; k < snapshot.count; k++) {
    const item = snapshot.slots[(snapshot.front + k) % snapshot.capacity];
    if (item) values.push(item.value);
  }
  return (
    <Row label="In line">
      {values.length === 0 ? (
        <span className="muted">nobody waiting</span>
      ) : (
        <span className="lineup">
          <span className="lineup__end">front</span>
          {values.map((v, i) => (
            <span key={i} className="chip">
              {v}
            </span>
          ))}
          <span className="lineup__end">rear</span>
        </span>
      )}
    </Row>
  );
}

function StackLine({ snapshot }: { snapshot: StackSnapshot }) {
  const values = [...snapshot.items].reverse().map((i) => i.value);
  return (
    <Row label="From the top">
      {values.length === 0 ? (
        <span className="muted">empty</span>
      ) : (
        <span className="lineup">
          {values.map((v, i) => (
            <span key={i} className="chip">
              {v}
            </span>
          ))}
        </span>
      )}
    </Row>
  );
}

function Adjacency({ snapshot }: { snapshot: GraphSnapshot }) {
  const label = new Map(snapshot.vertices.map((v) => [v.id, v.label]));
  if (snapshot.vertices.length === 0) return null;
  return (
    <div className="adjacency">
      <h3>Adjacency list</h3>
      <p className="panel__hint">
        Neighbours are checked in this order, which is the order the edges were drawn.
      </p>
      <ul className="tabular">
        {snapshot.vertices.map((v) => (
          <li key={v.id}>
            <strong>{v.label}</strong>
            <span>
              {(snapshot.adjacency[v.id] ?? []).map((n) => label.get(n)).join(', ') ||
                'no neighbours'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CodePanel({ view, op }: PanelProps) {
  const line = view.step?.line;
  const showing = !!view.session || !!view.step;
  return (
    <Panel title="Pseudocode" note={op.signature}>
      <ol className="code" aria-label={`Pseudocode for ${op.signature}`}>
        {op.pseudocode.map((text, i) => {
          const active = showing && line === i + 1;
          // Indentation becomes padding so a wrapped line hangs under its own start.
          const indent = text.length - text.trimStart().length;
          return (
            <li
              key={i}
              className={active ? 'code__line code__line--active' : 'code__line'}
              aria-current={active ? 'step' : undefined}
            >
              <span className="code__no" aria-hidden="true">
                {i + 1}
              </span>
              <code style={{ paddingLeft: `${indent + 2}ch`, textIndent: '-2ch' }}>
                {text.trimStart()}
              </code>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

function CostPanel({ view, def, op }: PanelProps) {
  const c = op.complexity;
  const counted = c.counter && view.step ? view.step.counters[c.counter] : undefined;
  const sizes = view.facts
    .filter((f) => /\((n|h|V|E)\)/.test(f.label))
    .map((f) => `${f.label.match(/\((\w)\)/)?.[1]} = ${f.value}`);

  return (
    <Panel title="Cost" note={op.signature}>
      <div className="bigo">
        <div className="bigo__item">
          <span className="bigo__value">{c.time}</span>
          <span className="bigo__label">worst-case time</span>
        </div>
        <div className="bigo__item">
          <span className="bigo__value">{c.space}</span>
          <span className="bigo__label">extra space</span>
        </div>
      </div>
      {(c.best || c.average) && (
        <p className="bigo__more">
          {c.best && (
            <>
              Best case <span className="math">{c.best}</span>
            </>
          )}
          {c.best && c.average && ', '}
          {c.average && (
            <>
              {c.best ? 'average ' : 'Average '}
              <span className="math">{c.average}</span>
            </>
          )}
          .
        </p>
      )}
      <ul className="notes">
        {c.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <div className="measured">
        <h3>On this input</h3>
        {counted !== undefined ? (
          <p className="tabular">
            <strong>{counted}</strong> {c.counter}
            {sizes.length > 0 && <> so far, with {sizes.join(' and ')}</>}. The bound above is the
            worst case for any input; this is what your{' '}
            {def.shortName === 'BST' ? 'tree' : 'structure'} actually cost.
          </p>
        ) : (
          <p className="muted">Run the operation to count the work it does on this input.</p>
        )}
      </div>
    </Panel>
  );
}
