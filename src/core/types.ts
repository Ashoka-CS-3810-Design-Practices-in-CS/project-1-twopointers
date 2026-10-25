// Shared contracts between the layers.
//
// Every other layer depends on this file, and this file depends on nothing.
// We agreed in A3 (risk R5) that changes here need a review from both of us,
// because the model/algorithm track and the interface track both build on it.

export type Id = string;

/** Pseudo id that stack and queue renderers use for the isEmpty() indicator. */
export const EMPTY_FLAG = '@empty';

export type StructureId = 'bst' | 'graph' | 'heap' | 'stack' | 'queue';

/**
 * How one element should look in one step. Renderers turn these into a
 * fill colour AND an outline style AND a small text caption, so nothing is
 * told by colour alone.
 */
export type Mark =
  | 'current'
  | 'compare'
  | 'visited'
  | 'waiting'
  | 'found'
  | 'new'
  | 'leaving'
  | 'path'
  | 'successor'
  | 'unreachable'
  | 'swap'
  | 'error';

/** Edge highlights, used by the graph (and by tree edges on a search path). */
export type EdgeMark = 'check' | 'tree' | 'path';

/** The auxiliary structure shown beside the diagram (BFS queue, DFS stack, call path...). */
export interface Frontier {
  title: string;
  ids: Id[];
  labels: string[];
  /** Names for the two ends, e.g. ['front', 'rear'] or ['top', 'bottom']. */
  ends?: [string, string];
}

export interface QuestionOption {
  id: string;
  label: string;
}

/** A Guess mode question. The answer never changes what the algorithm does next. */
export interface Question {
  prompt: string;
  options: QuestionOption[];
  answer: string;
  /** One sentence saying why the answer is right. Shown after any choice. */
  reason: string;
}

export type Tone = 'neutral' | 'good' | 'warn' | 'bad';

export type Counters = Record<string, number>;

/**
 * One step handed from an algorithm to the screen (A2, table 5).
 * Records are never edited after they are created, which is what lets Back
 * show exactly the same picture the learner saw the first time.
 */
export interface StepRecord<S = unknown> {
  kind: 'step' | 'ask';
  snapshot: S;
  message: string;
  /** 1-based line of the pseudocode listing this step belongs to. */
  line?: number;
  current: Id[];
  visited: Id[];
  frontier?: Frontier;
  edge?: [Id, Id];
  edgeMarks?: Record<string, EdgeMark>;
  /** Output or visit order so far, as display labels. */
  order: string[];
  counters: Counters;
  marks?: Record<Id, Mark>;
  question?: Question;
  tone?: Tone;
  /** Set on the last step an algorithm will ever produce. */
  final?: boolean;
  /** A returned value worth showing, e.g. "pop() returned 7". */
  result?: string;
}

/** What a finished operation hands back to the controller. */
export type OpOutcome<M> = { ok: true; model?: M; summary: string } | { ok: false; reason: string };

/**
 * Every algorithm is one of these: a pausable function that yields a step,
 * waits, and finally returns an outcome.
 */
export type StepGenerator<S, M> = Generator<StepRecord<S>, OpOutcome<M>, void>;
