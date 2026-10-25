// Binary min heap operations for the priority queue (A2, 2.8).
//
// Enqueue bubbles the new entry up, extractMin sinks the moved leaf down.
// Each level is a compare, an optional "swap or stop?" question, and a swap.
// Ties are broken by arrival order, and the messages say so whenever a tie is
// what decided the outcome.

import { MAX_HEAP_ENTRIES } from '../core/limits';
import { EMPTY_FLAG, type StepGenerator } from '../core/types';
import {
  before,
  leftOf,
  parentOf,
  rightOf,
  type HeapEntry,
  type HeapSnapshot,
  type MinHeap,
} from '../models/MinHeap';
import { Tracer } from './tracer';

type Gen = StepGenerator<HeapSnapshot, MinHeap>;

export const HEAP_ENQUEUE_CODE = [
  'enqueue(x, p):',
  '  append (x, p) at the next free leaf',
  '  i ← last index',
  '  while i > 0:',
  '    parent ← ⌊(i − 1) / 2⌋',
  '    if heap[parent] ≤ heap[i]: stop',
  '    swap heap[parent] and heap[i]',
  '    i ← parent',
];

export const EXTRACT_CODE = [
  'extractMin():',
  '  if heap is empty: underflow',
  '  min ← heap[0]',
  '  move the last leaf to index 0',
  '  i ← 0',
  '  while i has a child:',
  '    c ← the smaller child of i',
  '    if heap[i] ≤ heap[c]: stop',
  '    swap heap[i] and heap[c]',
  '    i ← c',
  '  return min',
];

export const PEEK_MIN_CODE = ['peekMin():', '  if heap is empty: underflow', '  return heap[0]'];
export const HEAP_EMPTY_CODE = ['isEmpty():', '  return size = 0'];

/** "7 (p2)": the stored value with its priority. */
export const describe = (e: HeapEntry) => `${e.value} (p${e.priority})`;

/** Why a comes out before b, in words. */
function whyFirst(a: HeapEntry, b: HeapEntry): string {
  return a.priority < b.priority
    ? `priority ${a.priority} is lower than ${b.priority}`
    : `both have priority ${a.priority}, and ${a.value} arrived earlier`;
}

const SWAP_OR_STOP = [
  { id: 'swap', label: 'Swap' },
  { id: 'stop', label: 'Stop' },
];

export function* enqueue(heap: MinHeap, value: number, priority: number): Gen {
  const t = new Tracer(() => heap.snapshot(), ['comparisons', 'swaps']);

  if (heap.isFull()) {
    yield t.step(
      `The queue already holds ${MAX_HEAP_ENTRIES} entries, the most we can draw clearly. Extract something before adding ${value}.`,
      { line: 1, tone: 'bad', final: true },
    );
    return { ok: false, reason: 'heap is at its size limit' };
  }

  const entry = heap.append(value, priority);
  let i = heap.size - 1;
  yield t.step(
    `Add ${describe(entry)} at the next free leaf, index ${i}. The tree keeps its complete shape, but the order may now be broken on the path above it.`,
    { line: 2, current: [entry.id], marks: { [entry.id]: 'new' } },
  );

  while (i > 0) {
    const p = parentOf(i);
    const child = heap.at(i);
    const par = heap.at(p);
    t.count('comparisons');
    yield t.step(
      `Compare ${describe(child)} at index ${i} with its parent ${describe(par)} at index ${p}, since ⌊(${i} − 1) / 2⌋ = ${p}.`,
      { line: 6, current: [child.id], marks: { [par.id]: 'compare' } },
    );

    const stop = !before(child, par);
    yield t.ask(
      {
        prompt: `Swap ${describe(child)} with its parent, or stop?`,
        options: SWAP_OR_STOP,
        answer: stop ? 'stop' : 'swap',
        reason: stop
          ? `The parent should stay above: ${whyFirst(par, child)}.`
          : `${describe(child)} should be above its parent: ${whyFirst(child, par)}.`,
      },
      { line: 6, current: [child.id], marks: { [par.id]: 'compare' } },
    );

    if (stop) {
      yield t.step(
        `Stop: ${whyFirst(par, child)}, so the heap rule already holds. ${describe(entry)} settles at index ${i}. The minimum is ${describe(heap.at(0))}.`,
        { line: 6, current: [entry.id], marks: { [entry.id]: 'found' }, tone: 'good', final: true },
      );
      return { ok: true, model: heap, summary: `Enqueued ${describe(entry)}.` };
    }

    heap.swap(i, p);
    t.count('swaps');
    yield t.step(
      `Swap: ${describe(child)} moves up to index ${p} and ${describe(par)} moves down to index ${i}.`,
      { line: 7, current: [child.id], marks: { [par.id]: 'swap' } },
    );
    i = p;
  }

  yield t.step(
    `${describe(entry)} has reached the root, index 0. It is the new minimum, so it will be served first.`,
    { line: 4, current: [entry.id], marks: { [entry.id]: 'found' }, tone: 'good', final: true },
  );
  return { ok: true, model: heap, summary: `Enqueued ${describe(entry)}.` };
}

function* underflow(t: Tracer<HeapSnapshot>, op: string): Gen {
  yield t.step(`${op} on an empty priority queue has nothing to return. Enqueue an entry first.`, {
    line: 2,
    tone: 'bad',
    final: true,
    marks: { [EMPTY_FLAG]: 'error' },
  });
  return { ok: false, reason: 'underflow' };
}

export function* extractMin(heap: MinHeap): Gen {
  const t = new Tracer(() => heap.snapshot(), ['comparisons', 'swaps']);
  if (heap.isEmpty()) return yield* underflow(t, 'extractMin()');

  const min = heap.at(0);
  yield t.step(`The root, index 0, always holds the minimum: ${describe(min)}. Take it out.`, {
    line: 3,
    current: [min.id],
    marks: { [min.id]: 'leaving' },
  });

  if (heap.size === 1) {
    heap.moveLastTo(0);
    yield t.step(
      `${describe(min)} was the only entry, so the queue is now empty. extractMin() returned it.`,
      {
        line: 11,
        tone: 'good',
        final: true,
        result: `extractMin() returned ${describe(min)}`,
      },
    );
    return { ok: true, model: heap, summary: `Extracted ${describe(min)}.` };
  }

  const last = heap.at(heap.size - 1);
  heap.moveLastTo(0);
  yield t.step(
    `Move the last leaf, ${describe(last)}, into the root's slot. The shape stays complete, but the root is probably too large now.`,
    { line: 4, current: [last.id], marks: { [last.id]: 'new' } },
  );

  let i = 0;
  while (leftOf(i) < heap.size) {
    const l = leftOf(i);
    const r = rightOf(i);
    let c = l;
    let lead: string;
    if (r < heap.size) {
      t.count('comparisons');
      if (before(heap.at(r), heap.at(l))) c = r;
      lead = `Index ${i} has children ${describe(heap.at(l))} at ${l} and ${describe(heap.at(r))} at ${r}. The smaller is ${describe(heap.at(c))}.`;
    } else {
      lead = `Index ${i} has one child, ${describe(heap.at(l))} at index ${l}.`;
    }

    const cur = heap.at(i);
    const kid = heap.at(c);
    t.count('comparisons');
    yield t.step(`${lead} Compare it with ${describe(cur)}.`, {
      line: 7,
      current: [cur.id],
      marks: { [kid.id]: 'compare' },
    });

    const stop = !before(kid, cur);
    yield t.ask(
      {
        prompt: `Swap ${describe(cur)} with the smaller child, or stop?`,
        options: SWAP_OR_STOP,
        answer: stop ? 'stop' : 'swap',
        reason: stop
          ? `${describe(cur)} can stay: ${whyFirst(cur, kid)}.`
          : `${describe(kid)} must move up: ${whyFirst(kid, cur)}.`,
      },
      { line: 8, current: [cur.id], marks: { [kid.id]: 'compare' } },
    );

    if (stop) break;

    heap.swap(i, c);
    t.count('swaps');
    yield t.step(
      `Swap: ${describe(cur)} moves down to index ${c} and ${describe(kid)} moves up to index ${i}.`,
      { line: 9, current: [cur.id], marks: { [kid.id]: 'swap' } },
    );
    i = c;
  }

  yield t.step(
    `The heap rule holds again. extractMin() returned ${describe(min)}, and the new minimum is ${describe(heap.at(0))}.`,
    {
      line: 11,
      current: [heap.at(0).id],
      marks: { [heap.at(0).id]: 'found' },
      tone: 'good',
      final: true,
      result: `extractMin() returned ${describe(min)}`,
    },
  );
  return { ok: true, model: heap, summary: `Extracted ${describe(min)}.` };
}

export function* peekMin(heap: MinHeap): Gen {
  const t = new Tracer(() => heap.snapshot(), ['reads']);
  if (heap.isEmpty()) return yield* underflow(t, 'peekMin()');
  const min = heap.at(0);
  t.count('reads');
  yield t.step(
    `peekMin() returns the root, ${describe(min)}, and changes nothing. That is why it is O(1).`,
    {
      line: 3,
      current: [min.id],
      marks: { [min.id]: 'found' },
      tone: 'good',
      final: true,
      result: `peekMin() returned ${describe(min)}`,
    },
  );
  return { ok: true, summary: `Minimum is ${describe(min)}.` };
}

export function* isEmpty(heap: MinHeap): Gen {
  const t = new Tracer(() => heap.snapshot(), ['reads']);
  t.count('reads');
  const empty = heap.isEmpty();
  yield t.step(
    empty
      ? 'isEmpty() is true: the array has no entries.'
      : `isEmpty() is false: the array holds ${heap.size} entr${heap.size === 1 ? 'y' : 'ies'}.`,
    {
      line: 2,
      tone: 'good',
      final: true,
      marks: { [EMPTY_FLAG]: 'found' },
      result: `isEmpty() returned ${empty}`,
    },
  );
  return { ok: true, summary: `isEmpty() is ${empty}.` };
}
