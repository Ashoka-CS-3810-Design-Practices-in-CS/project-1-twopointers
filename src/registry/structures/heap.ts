// Min priority queue (binary heap): registry entry.

import { MAX_HEAP_ENTRIES } from '../../core/limits';
import { err, ok } from '../../core/result';
import { parsePairList } from '../../core/validate';
import { MinHeap, type HeapSnapshot } from '../../models/MinHeap';
import {
  EXTRACT_CODE,
  HEAP_EMPTY_CODE,
  HEAP_ENQUEUE_CODE,
  PEEK_MIN_CODE,
  describe,
  enqueue,
  extractMin,
  isEmpty,
  peekMin,
} from '../../algorithms/heapOps';
import { randomInt } from '../random';
import type { OperationDef, StructureDef } from '../types';

type Op = OperationDef<MinHeap, HeapSnapshot>;

const LOG_NOTE =
  'The heap is always a complete tree, so its height is ⌊log₂ n⌋ and an entry can move at most that many levels.';

const operations: Op[] = [
  {
    id: 'heap.enqueue',
    label: 'Enqueue',
    signature: 'enqueue(value, priority)',
    blurb: 'Add at the next free leaf, then swap upward while the parent should come later.',
    input: 'entry',
    inputName: 'value',
    pace: 'stepped',
    complexity: {
      time: 'O(log n)',
      space: 'O(1)',
      best: 'O(1)',
      notes: [LOG_NOTE, 'Best case is O(1): the new entry already belongs where it lands.'],
      counter: 'swaps',
    },
    pseudocode: HEAP_ENQUEUE_CODE,
    run: (heap, args) => enqueue(heap, args.value as number, args.priority as number),
  },
  {
    id: 'heap.extract',
    label: 'Extract min',
    signature: 'extractMin()',
    blurb: 'Remove the root, move the last leaf up, then sink it to its place.',
    input: 'none',
    pace: 'stepped',
    complexity: {
      time: 'O(log n)',
      space: 'O(1)',
      notes: [
        LOG_NOTE,
        'Each level costs two comparisons: one to pick the smaller child, one against it.',
      ],
      counter: 'comparisons',
    },
    pseudocode: EXTRACT_CODE,
    run: (heap) => extractMin(heap),
  },
  {
    id: 'heap.peek',
    label: 'Peek min',
    signature: 'peekMin()',
    blurb: 'Read the root without changing anything.',
    input: 'none',
    pace: 'quick',
    complexity: {
      time: 'O(1)',
      space: 'O(1)',
      notes: ['The minimum always sits at index 0, so no searching is needed.'],
    },
    pseudocode: PEEK_MIN_CODE,
    run: (heap) => peekMin(heap),
  },
  {
    id: 'heap.isEmpty',
    label: 'Is empty?',
    signature: 'isEmpty()',
    blurb: 'Check whether the array holds any entries.',
    input: 'none',
    pace: 'quick',
    complexity: { time: 'O(1)', space: 'O(1)', notes: ['One look at the array length.'] },
    pseudocode: HEAP_EMPTY_CODE,
    run: (heap) => isEmpty(heap),
  },
];

export const heapDef: StructureDef<MinHeap, HeapSnapshot> = {
  id: 'heap',
  name: 'Priority queue',
  shortName: 'Priority queue',
  tagline: 'The smallest priority always comes out first.',
  intro:
    'A binary min heap stored in an array. The circle shows each entry’s priority and the tag shows its value. Lower priority is served first; ties go to whoever arrived earlier.',
  empty: () => new MinHeap(),
  clone: (heap) => heap.clone(),
  snapshot: (heap) => heap.snapshot(),
  invariant: (heap) => heap.checkInvariant(),
  size: (heap) => heap.size,
  facts: (snap) => {
    const n = snap.items.length;
    return [
      { label: 'Entries (n)', value: String(n) },
      { label: 'Height', value: n === 0 ? 'empty' : String(Math.floor(Math.log2(n))) },
      { label: 'Minimum', value: n === 0 ? 'none' : describe(snap.items[0]) },
    ];
  },
  operations,
  presets: [
    {
      id: 'ties',
      label: 'Equal priorities',
      description: 'Several entries share priority 2, so arrival order decides who goes first.',
      build: () =>
        MinHeap.from([
          { value: 7, priority: 2 },
          { value: 9, priority: 2 },
          { value: 1, priority: 1 },
          { value: 4, priority: 3 },
          { value: 5, priority: 2 },
        ]),
    },
    {
      id: 'tasks',
      label: 'Seven tasks',
      description: 'A fuller heap of height 2, good for watching extractMin sink an entry.',
      build: () =>
        MinHeap.from([
          { value: 12, priority: 5 },
          { value: 4, priority: 1 },
          { value: 30, priority: 8 },
          { value: 8, priority: 3 },
          { value: 15, priority: 4 },
          { value: 2, priority: 2 },
          { value: 21, priority: 7 },
        ]),
    },
  ],
  random: () => {
    const heap = new MinHeap();
    const count = randomInt(6, 9);
    for (let i = 0; i < count; i++) heap.push(randomInt(1, 99), randomInt(1, 9));
    return heap;
  },
  quickAdd: {
    label: 'Add entries',
    placeholder: 'e.g. 7:2 9:2 1:1',
    hint: 'Write each entry as value:priority. Added without stepping.',
    button: 'Add entries',
    apply: (heap, text) => {
      const parsed = parsePairList(text);
      if (!parsed.ok) return err(parsed.error);
      const added: string[] = [];
      for (const pair of parsed.value) {
        const pushed = heap.push(pair.value, pair.priority);
        if (!pushed.ok) {
          return ok({
            model: heap,
            message: `Added ${added.join(', ') || 'nothing'}. Stopped at ${MAX_HEAP_ENTRIES} entries, the most we can draw clearly.`,
          });
        }
        added.push(describe(pushed.value));
      }
      return ok({ model: heap, message: `Added ${added.join(', ')}.` });
    },
  },
};
