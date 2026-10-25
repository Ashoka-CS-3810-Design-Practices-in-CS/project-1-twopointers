// Helper the generators use to build step records.
//
// Each step() call takes a fresh snapshot and copies the counters and the
// order list, so a record never changes after it has been handed out. That is
// the property Back relies on (A2, section 3.2).

import type { Counters, Id, Question, StepRecord } from '../core/types';

export type StepExtras<S> = Partial<
  Omit<StepRecord<S>, 'kind' | 'snapshot' | 'message' | 'counters' | 'order' | 'question'>
>;

export class Tracer<S> {
  readonly counters: Counters;
  order: string[] = [];
  visited: Id[] = [];

  constructor(
    private readonly snap: () => S,
    counterNames: string[],
  ) {
    this.counters = Object.fromEntries(counterNames.map((name) => [name, 0]));
  }

  count(name: string, by = 1): void {
    this.counters[name] = (this.counters[name] ?? 0) + by;
  }

  step(message: string, extra: StepExtras<S> = {}): StepRecord<S> {
    return {
      kind: 'step',
      snapshot: this.snap(),
      message,
      current: [],
      visited: [...this.visited],
      order: [...this.order],
      counters: { ...this.counters },
      ...extra,
    };
  }

  /** A Guess mode question. The session skips these when Guess mode is off. */
  ask(question: Question, extra: StepExtras<S> = {}): StepRecord<S> {
    return { ...this.step(question.prompt, extra), kind: 'ask', question };
  }
}

/** Sorted, de-duplicated options so the right answer is not always first. */
export function optionsFrom<T>(
  items: T[],
  id: (item: T) => string,
  label: (item: T) => string,
  sortKey: (item: T) => number | string = label,
): { id: string; label: string }[] {
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    const key = id(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique
    .sort((a, b) => {
      const ka = sortKey(a);
      const kb = sortKey(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    })
    .map((item) => ({ id: id(item), label: label(item) }));
}
