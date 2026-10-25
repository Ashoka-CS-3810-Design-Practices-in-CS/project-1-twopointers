// The application controller from A2 (section 4.1), one per structure.
//
// It is the only place that coordinates across layers:
//   - checks input before any model is touched (ER1),
//   - copies the model and opens a step session for the chosen operation,
//   - forwards learner events (next, back, answer, restart...) to the session,
//   - commits the result to the model once the operation has finished.
//
// It has no idea how anything is drawn. React subscribes to it and reads a
// plain view object, which also makes it easy to test without a browser.

import { err, ok, type Result } from '../core/result';
import type { Id, StepRecord, StructureId, Tone } from '../core/types';
import { parseValue } from '../core/validate';
import { Graph } from '../models/Graph';
import type { Fact, OpArgs, OperationDef, StructureDef } from '../registry/types';
import { AutoPlayer, type Scheduler } from '../session/AutoPlayer';
import { StepSession, type AnswerRecord, type SessionPhase } from '../session/StepSession';
import type { SettingsStore } from './settings';

export interface Notice {
  tone: Tone;
  text: string;
}

export type FieldName = 'value' | 'priority' | 'build';

export type Selection = { kind: 'vertex'; id: Id } | { kind: 'edge'; a: Id; b: Id };

export interface SessionView {
  id: number;
  opId: string;
  phase: SessionPhase;
  /** 0-based position in the history of seen steps. */
  index: number;
  length: number;
  finished: boolean;
  atNewest: boolean;
  canBack: boolean;
  canNext: boolean;
  answer?: AnswerRecord;
  quick: boolean;
}

export interface WorkspaceView<S = any> {
  structure: StructureId;
  revision: number;
  /** What the renderer should draw right now. */
  snapshot: S;
  step: StepRecord<S> | null;
  session: SessionView | null;
  selectedOp: string;
  auto: boolean;
  notice: Notice | null;
  fieldError: { field: FieldName; text: string } | null;
  /** True while an unfinished operation is open, so editing is blocked (ER9). */
  locked: boolean;
  facts: Fact[];
  size: number;
  capacity: number | null;
  graph: { source: Id | null; target: Id | null; selection: Selection | null };
}

export const LOCK_REASON =
  'Finish or close the current operation before changing the structure. The algorithm is working on the structure as it was when you pressed Run.';

/** Pause between the steps of a quick operation such as push or dequeue. */
export const QUICK_INTERVAL = 650;

/** Vertices closer than this would overlap their labels. */
const MIN_VERTEX_GAP = 56;

export class WorkspaceController<M = any, S = any> {
  private model: M;
  private session: StepSession<S, M> | null = null;
  private sessionOp: OperationDef<M, S> | null = null;
  private committed = false;
  /** The last step of a quick operation stays on screen after it closes. */
  private lastStep: StepRecord<S> | null = null;
  private selectedOp: string;
  private notice: Notice | null = null;
  private fieldError: WorkspaceView['fieldError'] = null;
  private auto: AutoPlayer;
  private autoOn = false;
  private source: Id | null = null;
  private target: Id | null = null;
  private selection: Selection | null = null;
  private listeners = new Set<() => void>();
  private cache: WorkspaceView<S> | null = null;
  private revision = 0;

  constructor(
    readonly def: StructureDef<M, S>,
    private readonly settings: SettingsStore,
    scheduler?: Scheduler,
  ) {
    this.auto = new AutoPlayer(scheduler);
    const example = def.presets[0];
    this.model = example ? example.build() : def.empty();
    this.selectedOp = def.operations[0].id;
    this.keepGraphEndsValid();
    if (example) {
      this.notice = {
        tone: 'neutral',
        text: `This is an example to start from (${example.label.toLowerCase()}). Pick an operation and press Run, or clear it and build your own.`,
      };
    }
  }

  // ---- subscription -----------------------------------------------------

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getView = (): WorkspaceView<S> => {
    if (this.cache) return this.cache;
    const s = this.session;
    const step = s?.current ?? this.lastStep;
    const snapshot = step ? step.snapshot : this.def.snapshot(this.model);
    this.cache = {
      structure: this.def.id,
      revision: this.revision,
      snapshot,
      step,
      session:
        s && this.sessionOp
          ? {
              id: s.id,
              opId: this.sessionOp.id,
              phase: s.phase,
              index: s.index,
              length: s.length,
              finished: s.isFinished,
              atNewest: s.atNewest,
              canBack: s.canBack(),
              canNext: s.canNext(),
              answer: s.answerAt(),
              quick: this.sessionOp.pace === 'quick',
            }
          : null,
      selectedOp: this.selectedOp,
      auto: this.autoOn && this.sessionOp?.pace === 'stepped',
      notice: this.notice,
      fieldError: this.fieldError,
      locked: this.isLocked(),
      facts: this.def.facts(snapshot),
      size: this.def.size(this.model),
      capacity: this.def.capacity ? this.def.capacity.current(this.model) : null,
      graph: { source: this.source, target: this.target, selection: this.selection },
    };
    return this.cache;
  };

  private emit(): void {
    this.revision++;
    this.cache = null;
    this.listeners.forEach((fn) => fn());
  }

  // ---- operations -------------------------------------------------------

  get operation(): OperationDef<M, S> {
    return this.def.operations.find((o) => o.id === this.selectedOp) ?? this.def.operations[0];
  }

  /** Read-only access for tests and for the graph editor's hit testing. */
  get current(): M {
    return this.model;
  }

  isLocked(): boolean {
    return !!this.session && !this.session.isFinished;
  }

  selectOp(id: string): void {
    if (id === this.selectedOp) return;
    if (!this.def.operations.some((o) => o.id === id)) return;
    if (this.isLocked()) return this.warnLocked();
    if (this.session) this.closeSession();
    this.selectedOp = id;
    this.fieldError = null;
    this.emit();
  }

  run(input: { value?: string; priority?: string } = {}): boolean {
    const op = this.operation;

    if (this.isLocked()) {
      const s = this.session as StepSession<S, M>;
      if (this.sessionOp?.pace === 'quick' && !s.questionOpen) {
        // A quick operation is still animating. Jump it to the end so the
        // learner never waits for an animation (A3, section 3.4).
        s.finishAll();
        this.afterMove();
      } else {
        this.warnLocked();
        return false;
      }
    }
    this.closeSession();

    const args: OpArgs = {};
    if (op.input === 'value' || op.input === 'entry') {
      const value = parseValue(input.value ?? '', op.inputName ?? 'value');
      if (!value.ok) return this.rejectField('value', value.error);
      args.value = value.value;
    }
    if (op.input === 'entry') {
      const priority = parseValue(input.priority ?? '', 'priority');
      if (!priority.ok) return this.rejectField('priority', priority.error);
      args.priority = priority.value;
    }
    if (op.input === 'endpoints') {
      args.source = this.source;
      args.target = this.target;
    }

    const blocked = op.blocked?.(this.model, args) ?? null;
    if (blocked) {
      this.fieldError = null;
      this.notice = { tone: 'warn', text: blocked };
      this.emit();
      return false;
    }

    this.fieldError = null;
    this.notice = null;
    this.lastStep = null;
    this.selection = null;

    // The algorithm always works on a copy. Restart makes a fresh copy of
    // the same starting point, and the real model only changes on commit.
    const base = this.def.clone(this.model);
    this.sessionOp = op;
    this.committed = false;
    this.session = new StepSession<S, M>(() => op.run(this.def.clone(base), args), {
      guessMode: () => this.settings.get().guess,
    }).start();

    this.afterMove();
    if (this.session && op.pace === 'quick') this.startAuto();
    this.emit();
    return true;
  }

  next(fromAuto = false): boolean {
    const s = this.session;
    if (!s) return false;
    if (!fromAuto) this.stopAuto();
    const moved = s.next();
    if (moved) this.afterMove();
    // A quick operation that paused for a question carries on by itself
    // once the learner has moved past it.
    if (moved && !fromAuto && this.sessionOp?.pace === 'quick' && this.session) this.startAuto();
    this.emit();
    return moved;
  }

  back(): boolean {
    const s = this.session;
    if (!s) return false;
    this.stopAuto();
    const moved = s.back();
    this.emit();
    return moved;
  }

  answer(choice: string): AnswerRecord | null {
    const s = this.session;
    if (!s) return null;
    this.stopAuto();
    const record = s.answer(choice);
    this.emit();
    return record;
  }

  reveal(): void {
    const s = this.session;
    if (!s) return;
    this.stopAuto();
    s.reveal();
    this.emit();
  }

  restart(): void {
    const s = this.session;
    if (!s) return;
    this.stopAuto();
    s.restart();
    this.committed = false;
    this.afterMove();
    this.emit();
  }

  /** Skips to the end without asking anything, then commits. */
  finish(): void {
    const s = this.session;
    if (!s) return;
    this.stopAuto();
    s.finishAll();
    this.afterMove();
    this.emit();
  }

  close(): void {
    const s = this.session;
    if (!s) return;
    const partWay = !s.isFinished;
    this.closeSession();
    this.lastStep = null;
    this.notice = partWay
      ? { tone: 'neutral', text: 'Closed part way through, so the structure is unchanged.' }
      : null;
    this.emit();
  }

  toggleAuto(): void {
    if (this.autoOn) {
      this.stopAuto();
      this.emit();
      return;
    }
    const s = this.session;
    if (!s) return;
    if (s.questionOpen) {
      this.notice = {
        tone: 'warn',
        text: 'Answer the question first. Auto always stops at questions.',
      };
      this.emit();
      return;
    }
    this.startAuto();
    this.emit();
  }

  /** Called when the speed setting changes, so a running Auto picks it up. */
  refresh(): void {
    this.emit();
  }

  /** Stops Auto without touching anything else, e.g. when leaving the page. */
  pause(): void {
    if (!this.autoOn) return;
    this.stopAuto();
    this.emit();
  }

  /** Stops any timer. Subscriptions are left to whoever made them. */
  dispose(): void {
    this.stopAuto();
  }

  private startAuto(): void {
    const s = this.session;
    if (!s || s.questionOpen || !s.canNext()) return;
    const id = s.id;
    const quick = this.sessionOp?.pace === 'quick';
    this.autoOn = true;
    this.auto.start(
      () => (quick ? QUICK_INTERVAL : this.settings.interval()),
      () => {
        // A tick that belongs to a session that has since been closed or
        // replaced is simply dropped (A3, test T13).
        if (!this.session || this.session.id !== id) {
          this.autoOn = false;
          return false;
        }
        const moved = this.next(true);
        const s2 = this.session as StepSession<S, M> | null;
        const keepGoing = moved && !!s2 && s2.id === id && s2.canNext() && !s2.questionOpen;
        if (!keepGoing) {
          this.autoOn = false;
          this.emit();
        }
        return keepGoing;
      },
    );
  }

  private stopAuto(): void {
    this.auto.stop();
    this.autoOn = false;
  }

  /** Commits the result once the operation has finished, exactly once per run. */
  private afterMove(): void {
    const s = this.session;
    if (!s || !s.isFinished || !s.atNewest || this.committed) return;
    this.committed = true;

    const outcome = s.outcome;
    if (outcome?.ok && outcome.model !== undefined) {
      // A failed invariant check stops the result from being committed, so a
      // bug shows up as a visible message instead of a silently wrong picture.
      const problem = this.def.invariant(outcome.model);
      if (problem) {
        this.notice = {
          tone: 'bad',
          text: `Internal check failed (${problem}), so the result was not saved.`,
        };
      } else {
        this.model = outcome.model;
        this.keepGraphEndsValid();
      }
    }

    if (this.sessionOp?.pace === 'quick') {
      this.lastStep = s.current;
      this.stopAuto();
      this.session = null;
      this.sessionOp = null;
    }
  }

  private closeSession(): void {
    this.stopAuto();
    this.session = null;
    this.sessionOp = null;
  }

  private warnLocked(): void {
    this.notice = { tone: 'warn', text: LOCK_REASON };
    this.emit();
  }

  private rejectField(field: FieldName, text: string): false {
    this.fieldError = { field, text };
    this.emit();
    return false;
  }

  // ---- building and editing ---------------------------------------------

  private edit(
    change: (draft: M) => Result<{ model: M; message: string | null }>,
    options: { field?: FieldName; resetEnds?: boolean; quiet?: boolean } = {},
  ): boolean {
    if (this.isLocked()) {
      this.warnLocked();
      return false;
    }
    if (this.session) this.closeSession();

    const result = change(this.def.clone(this.model));
    if (!result.ok) {
      if (options.field) this.fieldError = { field: options.field, text: result.error };
      else this.notice = { tone: 'bad', text: result.error };
      this.emit();
      return false;
    }
    const problem = this.def.invariant(result.value.model);
    if (problem) {
      this.notice = {
        tone: 'bad',
        text: `Internal check failed (${problem}). Nothing was changed.`,
      };
      this.emit();
      return false;
    }

    this.model = result.value.model;
    this.fieldError = null;
    this.lastStep = null;
    if (!options.quiet) {
      this.notice = result.value.message ? { tone: 'good', text: result.value.message } : null;
    }
    if (options.resetEnds) {
      this.source = null;
      this.target = null;
      this.selection = null;
    }
    this.keepGraphEndsValid();
    this.emit();
    return true;
  }

  quickAdd(text: string): boolean {
    const quick = this.def.quickAdd;
    if (!quick) return false;
    return this.edit((m) => quick.apply(m, text), { field: 'build' });
  }

  loadPreset(id: string): boolean {
    const preset = this.def.presets.find((p) => p.id === id);
    if (!preset) return false;
    return this.edit(
      () =>
        ok({ model: preset.build(), message: `Loaded "${preset.label}". ${preset.description}` }),
      { resetEnds: true },
    );
  }

  randomise(): boolean {
    return this.edit(() => ok({ model: this.def.random(), message: 'Loaded a random example.' }), {
      resetEnds: true,
    });
  }

  clear(): boolean {
    return this.edit(
      (m) => {
        const cap = this.def.capacity;
        const empty = cap ? cap.set(this.def.empty(), cap.current(m)) : ok(this.def.empty());
        return empty.ok
          ? ok({
              model: empty.value,
              message: 'Cleared. Add values on the left to build a new one.',
            })
          : empty;
      },
      { resetEnds: true },
    );
  }

  setCapacity(capacity: number): boolean {
    const cap = this.def.capacity;
    if (!cap) return false;
    return this.edit(
      (m) => {
        const changed = cap.set(m, capacity);
        return changed.ok
          ? ok({ model: changed.value, message: `Capacity set to ${capacity}.` })
          : changed;
      },
      { field: 'build' },
    );
  }

  // ---- graph editing ----------------------------------------------------

  private graph(): Graph | null {
    return this.model instanceof Graph ? this.model : null;
  }

  private keepGraphEndsValid(): void {
    const g = this.graph();
    if (!g) return;
    if (!g.hasVertex(this.source)) this.source = g.vertexIds()[0] ?? null;
    if (!g.hasVertex(this.target)) this.target = null;
    const sel = this.selection;
    if (sel?.kind === 'vertex' && !g.hasVertex(sel.id)) this.selection = null;
    if (sel?.kind === 'edge' && !g.hasEdge(sel.a, sel.b)) this.selection = null;
  }

  addVertex(x: number, y: number): boolean {
    return this.edit((m) => {
      const g = m as unknown as Graph;
      for (const id of g.vertexIds()) {
        const v = g.vertex(id);
        if (Math.hypot(v.x - x, v.y - y) < MIN_VERTEX_GAP) {
          return err(
            `That spot is too close to ${v.label}. Leave a little room so the labels stay readable.`,
          );
        }
      }
      const added = g.addVertex(Math.round(x), Math.round(y));
      return added.ok ? ok({ model: m, message: `Added vertex ${added.value.label}.` }) : added;
    });
  }

  /** Keyboard-friendly version: finds a free spot by itself. */
  addVertexAnywhere(width: number, height: number): boolean {
    const g = this.graph();
    if (!g) return false;
    for (let y = 80; y <= height - 60; y += 110) {
      for (let x = 90; x <= width - 60; x += 120) {
        const free = g.vertexIds().every((id) => {
          const v = g.vertex(id);
          return Math.hypot(v.x - x, v.y - y) >= 100;
        });
        if (free) return this.addVertex(x, y);
      }
    }
    this.notice = {
      tone: 'bad',
      text: 'There is no free space left on the canvas. Move or remove a vertex first.',
    };
    this.emit();
    return false;
  }

  connect(a: Id, b: Id): boolean {
    return this.edit((m) => {
      const g = m as unknown as Graph;
      const added = g.addEdge(a, b);
      return added.ok
        ? ok({ model: m, message: `Joined ${g.label(a)} and ${g.label(b)}.` })
        : added;
    });
  }

  removeSelection(): boolean {
    const sel = this.selection;
    if (!sel) return false;
    return this.edit((m) => {
      const g = m as unknown as Graph;
      if (sel.kind === 'vertex') {
        const removed = g.removeVertex(sel.id);
        return removed.ok
          ? ok({
              model: m,
              message: `Removed ${removed.value.label} and the edges that touched it.`,
            })
          : removed;
      }
      const labels = `${g.label(sel.a)}–${g.label(sel.b)}`;
      const removed = g.removeEdge(sel.a, sel.b);
      return removed.ok ? ok({ model: m, message: `Removed edge ${labels}.` }) : removed;
    });
  }

  select(selection: Selection | null): void {
    if (this.isLocked()) return;
    this.selection = selection;
    this.emit();
  }

  /** Dragging a vertex only changes where it is drawn, so it skips the copy. */
  moveVertex(id: Id, x: number, y: number): void {
    const g = this.graph();
    if (!g || this.isLocked()) return;
    if (this.session) this.closeSession();
    g.moveVertex(id, Math.round(x), Math.round(y));
    this.lastStep = null;
    this.emit();
  }

  setSource(id: Id | null): void {
    if (this.isLocked()) return this.warnLocked();
    if (this.session) this.closeSession();
    this.source = id;
    if (id !== null && id === this.target) this.target = null;
    this.notice = null;
    this.emit();
  }

  setTarget(id: Id | null): void {
    if (this.isLocked()) return this.warnLocked();
    if (this.session) this.closeSession();
    this.target = id;
    if (id !== null && id === this.source) this.source = null;
    this.emit();
  }
}
