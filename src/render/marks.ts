// Turns a step record into one visual state per element. Renderers only read
// steps and snapshots; they never decide anything about the algorithm.

import type { Id, Mark, StepRecord } from '../core/types';

export type VisualMark = Mark | 'none';

// Marks that describe something specific about this element in this step.
// These win over the generic "current" highlight.
const SPECIFIC: Mark[] = [
  'found',
  'new',
  'leaving',
  'successor',
  'error',
  'swap',
  'unreachable',
  'compare',
];

export function markOf(id: Id, step: StepRecord | null | undefined): VisualMark {
  if (!step) return 'none';
  const m = step.marks?.[id];
  if (m && SPECIFIC.includes(m)) return m;
  if (step.current.includes(id)) return 'current';
  if (m) return m;
  if (step.visited.includes(id)) return 'visited';
  return 'none';
}

/** The word printed under an element, so state is never shown by colour alone. */
export const CAPTION: Partial<Record<VisualMark, string>> = {
  current: 'current',
  compare: 'comparing',
  found: 'found',
  new: 'new',
  leaving: 'leaving',
  successor: 'successor',
  swap: 'swapped',
  error: 'conflict',
  unreachable: 'unreachable',
};

/** Longer descriptions used in the legend and in screen reader titles. */
export const DESCRIPTION: Record<VisualMark, string> = {
  none: 'not involved yet',
  current: 'looking at it now',
  compare: 'being compared',
  visited: 'already visited',
  waiting: 'waiting in the queue or stack',
  path: 'on the path taken',
  found: 'found, or the answer',
  new: 'just added or changed',
  leaving: 'about to be removed',
  successor: 'in-order successor',
  swap: 'just swapped',
  error: 'where a rule is broken',
  unreachable: 'cannot be reached',
};
