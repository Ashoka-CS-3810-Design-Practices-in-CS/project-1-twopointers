// The left rail: Operate and Build. Operating is where the learning happens,
// one step at a time, so it sits on top. Building is instant and has no steps.

import { useEffect, useRef, useState } from 'react';
import type { WorkspaceController, WorkspaceView } from '../app/WorkspaceController';
import type { Graph } from '../models/Graph';
import type { GraphSnapshot } from '../models/Graph';
import type { StructureDef } from '../registry/types';
import { GRAPH_H, GRAPH_W } from '../render';
import * as Icon from './Icons';

interface RailProps {
  view: WorkspaceView;
  c: WorkspaceController;
  def: StructureDef;
  dragMode: 'connect' | 'move';
  setDragMode: (m: 'connect' | 'move') => void;
}

export function Rail(props: RailProps) {
  return (
    <>
      <OperatePanel {...props} />
      <BuildPanel {...props} />
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="rail__title">{children}</h2>;
}

// ---- Build -----------------------------------------------------------------

function BuildPanel(props: RailProps) {
  const { view, c, def } = props;
  const [text, setText] = useState('');
  const quick = def.quickAdd;
  const error = view.fieldError?.field === 'build' ? view.fieldError.text : null;

  return (
    <section className="rail__section" aria-labelledby="build-title">
      <SectionTitle>
        <span id="build-title">Build</span>
      </SectionTitle>

      {view.locked && (
        <p className="rail__locked">
          <Icon.Info /> Editing is paused while an operation is open. Finish or close it first.
        </p>
      )}

      <fieldset className="rail__fieldset" disabled={view.locked}>
        {def.id === 'graph' && <GraphTools {...props} />}

        {quick && (
          <form
            className="field"
            onSubmit={(e) => {
              e.preventDefault();
              if (c.quickAdd(text)) setText('');
            }}
          >
            <label className="field__label" htmlFor={`quick-${def.id}`}>
              {quick.label}
            </label>
            <div className="input-row">
              <input
                id={`quick-${def.id}`}
                className="input"
                value={text}
                placeholder={quick.placeholder}
                onChange={(e) => setText(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={`quick-${def.id}-help`}
                autoComplete="off"
              />
              <button type="submit" className="btn">
                {quick.button}
              </button>
            </div>
            <p id={`quick-${def.id}-help`} className={error ? 'field__error' : 'field__hint'}>
              {error ?? quick.hint}
            </p>
          </form>
        )}

        {def.capacity && (
          <div className="field field--inline">
            <label className="field__label" htmlFor={`cap-${def.id}`}>
              Capacity
            </label>
            <select
              id={`cap-${def.id}`}
              className="select select--small"
              value={view.capacity ?? undefined}
              onChange={(e) => c.setCapacity(Number(e.target.value))}
              disabled={view.size > 0}
              title={view.size > 0 ? 'Empty the structure to change its capacity' : undefined}
            >
              {def.capacity.choices.map((n) => (
                <option key={n} value={n}>
                  {n} slots
                </option>
              ))}
            </select>
            {view.size > 0 && <span className="field__hint">Clear it to change.</span>}
          </div>
        )}

        <div className="examples">
          <p className="field__label">Examples</p>
          <ul>
            {def.presets.map((p) => (
              <li key={p.id}>
                <button type="button" className="example" onClick={() => c.loadPreset(p.id)}>
                  <span className="example__name">{p.label}</span>
                  <span className="example__desc">{p.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rail__row">
          <button type="button" className="btn btn--small" onClick={() => c.randomise()}>
            <Icon.Dice /> Random
          </button>
          <button type="button" className="btn btn--small btn--quiet" onClick={() => c.clear()}>
            <Icon.Trash /> Clear
          </button>
        </div>
      </fieldset>
    </section>
  );
}

function GraphTools({ view, c, dragMode, setDragMode }: RailProps) {
  const snap = view.snapshot as GraphSnapshot;
  const graph = c.current as Graph;
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const sel = view.graph.selection;
  const label = (id: string) => snap.vertices.find((v) => v.id === id)?.label ?? '?';

  return (
    <div className="graph-tools">
      <div className="field">
        <span className="field__label" id="drag-mode-label">
          Dragging on the canvas
        </span>
        <div className="segmented" role="radiogroup" aria-labelledby="drag-mode-label">
          <button
            type="button"
            role="radio"
            aria-checked={dragMode === 'connect'}
            onClick={() => setDragMode('connect')}
          >
            joins vertices
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={dragMode === 'move'}
            onClick={() => setDragMode('move')}
          >
            moves them
          </button>
        </div>
        <p className="field__hint">
          Click empty space to add a vertex. Right-click a vertex to make it the start.
        </p>
      </div>

      <div className="rail__row">
        <button
          type="button"
          className="btn btn--small"
          onClick={() => c.addVertexAnywhere(GRAPH_W, GRAPH_H)}
        >
          <Icon.Plus /> Add vertex
        </button>
      </div>

      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          if (a && b) c.connect(a, b);
        }}
      >
        <span className="field__label">Join two vertices</span>
        <div className="input-row input-row--edge">
          <label className="visually-hidden" htmlFor="edge-a">
            First vertex
          </label>
          <select id="edge-a" className="select" value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">From</option>
            {snap.vertices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <label className="visually-hidden" htmlFor="edge-b">
            Second vertex
          </label>
          <select id="edge-b" className="select" value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">To</option>
            {snap.vertices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn" disabled={!a || !b}>
            Join
          </button>
        </div>
      </form>

      <div className="selection" aria-live="polite">
        {!sel && (
          <p className="field__hint">Click a vertex or an edge on the canvas to select it.</p>
        )}
        {sel?.kind === 'vertex' && graph.hasVertex(sel.id) && (
          <>
            <p className="selection__title">
              Vertex <strong>{label(sel.id)}</strong> selected
            </p>
            <div className="rail__row">
              <button type="button" className="btn btn--small" onClick={() => c.setSource(sel.id)}>
                Set as start
              </button>
              <button type="button" className="btn btn--small" onClick={() => c.setTarget(sel.id)}>
                Set as target
              </button>
              <button
                type="button"
                className="btn btn--small btn--quiet"
                onClick={() => c.removeSelection()}
              >
                <Icon.Trash /> Remove
              </button>
            </div>
          </>
        )}
        {sel?.kind === 'edge' && (
          <>
            <p className="selection__title">
              Edge{' '}
              <strong>
                {label(sel.a)}–{label(sel.b)}
              </strong>{' '}
              selected
            </p>
            <button
              type="button"
              className="btn btn--small btn--quiet"
              onClick={() => c.removeSelection()}
            >
              <Icon.Trash /> Remove edge
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Operate ---------------------------------------------------------------

function OperatePanel({ view, c, def }: RailProps) {
  const op = def.operations.find((o) => o.id === view.selectedOp) ?? def.operations[0];
  const [value, setValue] = useState('');
  const [priority, setPriority] = useState('');
  const valueRef = useRef<HTMLInputElement>(null);
  const valueError = view.fieldError?.field === 'value' ? view.fieldError.text : null;
  const priorityError = view.fieldError?.field === 'priority' ? view.fieldError.text : null;
  const busy = view.locked;

  // When the learner picks a different operation, put the cursor where they
  // will type next. Skipped on first render so opening a page never pops up
  // a phone keyboard on its own.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (op.input === 'value' || op.input === 'entry')
      valueRef.current?.focus({ preventScroll: true });
  }, [op.id, op.input]);

  const run = () => {
    // Quick operations keep the cursor in the field so you can push value
    // after value. Stepped ones hand focus to the step bar instead.
    if (c.run({ value, priority }) && op.pace === 'quick') valueRef.current?.select();
  };

  return (
    <section className="rail__section" aria-labelledby="operate-title">
      <SectionTitle>
        <span id="operate-title">Operate</span>
      </SectionTitle>

      <div className="ops" role="radiogroup" aria-label="Operation">
        {def.operations.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === op.id}
            className="ops__chip"
            onClick={() => c.selectOp(o.id)}
            onDoubleClick={() => o.input === 'none' && !busy && c.run()}
            disabled={busy && o.id !== op.id}
          >
            {o.label}
          </button>
        ))}
      </div>

      <form
        className="op-form"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <p className="op-form__sig">
          <code>{op.signature}</code>
          <span>{op.blurb}</span>
        </p>

        {(op.input === 'value' || op.input === 'entry') && (
          <div className="field">
            <label className="field__label" htmlFor={`value-${def.id}`}>
              {capitalise(op.inputName ?? 'value')}
            </label>
            <input
              ref={valueRef}
              id={`value-${def.id}`}
              className="input"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={!!valueError}
              aria-describedby={`value-${def.id}-help`}
              placeholder="-999 to 999"
              autoComplete="off"
            />
            {valueError && (
              <p id={`value-${def.id}-help`} className="field__error">
                {valueError}
              </p>
            )}
          </div>
        )}

        {op.input === 'entry' && (
          <div className="field">
            <label className="field__label" htmlFor={`priority-${def.id}`}>
              Priority <span className="field__hint">(lower is served first)</span>
            </label>
            <input
              id={`priority-${def.id}`}
              className="input"
              inputMode="numeric"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              aria-invalid={!!priorityError}
              placeholder="e.g. 2"
              autoComplete="off"
            />
            {priorityError && <p className="field__error">{priorityError}</p>}
          </div>
        )}

        {op.input === 'endpoints' && <Endpoints view={view} c={c} />}

        <button type="submit" className="btn btn--primary btn--run" disabled={busy}>
          Run {op.label.toLowerCase()}
        </button>
        {busy && (
          <p className="field__hint">An operation is open. Use the controls under the diagram.</p>
        )}
        {!busy && op.pace === 'stepped' && (
          <p className="field__hint">
            Runs one step at a time. Press Next under the diagram to move on.
          </p>
        )}
      </form>
    </section>
  );
}

function Endpoints({ view, c }: { view: WorkspaceView; c: WorkspaceController }) {
  const snap = view.snapshot as GraphSnapshot;
  return (
    <div className="endpoints">
      <div className="field">
        <label className="field__label" htmlFor="graph-source">
          Start
        </label>
        <select
          id="graph-source"
          className="select"
          value={view.graph.source ?? ''}
          onChange={(e) => c.setSource(e.target.value || null)}
          disabled={view.locked}
        >
          <option value="">Choose…</option>
          {snap.vertices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="graph-target">
          Target <span className="field__hint">(optional)</span>
        </label>
        <select
          id="graph-target"
          className="select"
          value={view.graph.target ?? ''}
          onChange={(e) => c.setTarget(e.target.value || null)}
          disabled={view.locked}
        >
          <option value="">Visit all</option>
          {snap.vertices
            .filter((v) => v.id !== view.graph.source)
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
