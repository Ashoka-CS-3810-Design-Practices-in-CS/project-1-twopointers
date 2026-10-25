// Stack and queue: registry entries. They share quick-add and capacity code,
// so they live in one file.

import {
  CAPACITY_CHOICES,
  DEFAULT_QUEUE_CAPACITY,
  DEFAULT_STACK_CAPACITY,
} from '../../core/limits';
import { err, ok } from '../../core/result';
import { parseValueList } from '../../core/validate';
import { Stack, type StackSnapshot } from '../../models/Stack';
import { CircularQueue, type QueueSnapshot } from '../../models/CircularQueue';
import * as stackOps from '../../algorithms/stackOps';
import * as queueOps from '../../algorithms/queueOps';
import { distinctValues, randomInt } from '../random';
import type { Complexity, OperationDef, StructureDef } from '../types';

const constant = (note: string): Complexity => ({
  time: 'O(1)',
  space: 'O(1)',
  notes: [note],
});

const stackOperations: OperationDef<Stack, StackSnapshot>[] = [
  {
    id: 'stack.push',
    label: 'Push',
    signature: 'push(x)',
    blurb: 'Put a value on top.',
    input: 'value',
    pace: 'quick',
    complexity: constant('Only the top index and one slot change, however many values are below.'),
    pseudocode: stackOps.PUSH_CODE,
    run: (s, args) => stackOps.push(s, args.value as number),
  },
  {
    id: 'stack.pop',
    label: 'Pop',
    signature: 'pop()',
    blurb: 'Take the top value off and return it.',
    input: 'none',
    pace: 'quick',
    complexity: constant('Read the top slot and move top down by one. Nothing else moves.'),
    pseudocode: stackOps.POP_CODE,
    run: (s) => stackOps.pop(s),
  },
  {
    id: 'stack.peek',
    label: 'Peek',
    signature: 'peek()',
    blurb: 'Look at the top value without removing it.',
    input: 'none',
    pace: 'quick',
    complexity: constant('A single read of store[top].'),
    pseudocode: stackOps.PEEK_CODE,
    run: (s) => stackOps.peek(s),
  },
  {
    id: 'stack.isEmpty',
    label: 'Is empty?',
    signature: 'isEmpty()',
    blurb: 'True when top is −1.',
    input: 'none',
    pace: 'quick',
    complexity: constant('One comparison of the top index.'),
    pseudocode: stackOps.STACK_EMPTY_CODE,
    run: (s) => stackOps.isEmpty(s),
  },
];

const queueOperations: OperationDef<CircularQueue, QueueSnapshot>[] = [
  {
    id: 'queue.enqueue',
    label: 'Enqueue',
    signature: 'enqueue(x)',
    blurb: 'Join at the rear. The rear index wraps round to slot 0.',
    input: 'value',
    pace: 'quick',
    complexity: constant('One index update and one write, thanks to the circular buffer.'),
    pseudocode: queueOps.ENQUEUE_CODE,
    run: (q, args) => queueOps.enqueue(q, args.value as number),
  },
  {
    id: 'queue.dequeue',
    label: 'Dequeue',
    signature: 'dequeue()',
    blurb: 'Leave from the front and return the value.',
    input: 'none',
    pace: 'quick',
    complexity: constant(
      'front just moves forward one slot. A plain array that shifted everything left would make this O(n).',
    ),
    pseudocode: queueOps.DEQUEUE_CODE,
    run: (q) => queueOps.dequeue(q),
  },
  {
    id: 'queue.front',
    label: 'Front',
    signature: 'front()',
    blurb: 'Look at the value that will leave next.',
    input: 'none',
    pace: 'quick',
    complexity: constant('A single read of slots[front].'),
    pseudocode: queueOps.FRONT_CODE,
    run: (q) => queueOps.front(q),
  },
  {
    id: 'queue.rear',
    label: 'Rear',
    signature: 'rear()',
    blurb: 'Look at the value that joined last.',
    input: 'none',
    pace: 'quick',
    complexity: constant('A single read of slots[rear].'),
    pseudocode: queueOps.REAR_CODE,
    run: (q) => queueOps.rear(q),
  },
  {
    id: 'queue.isEmpty',
    label: 'Is empty?',
    signature: 'isEmpty()',
    blurb: 'True when count is 0.',
    input: 'none',
    pace: 'quick',
    complexity: constant('One comparison of the count.'),
    pseudocode: queueOps.QUEUE_EMPTY_CODE,
    run: (q) => queueOps.isEmpty(q),
  },
];

export const stackDef: StructureDef<Stack, StackSnapshot> = {
  id: 'stack',
  name: 'Stack',
  shortName: 'Stack',
  tagline: 'Last in, first out.',
  intro:
    'Values are stacked one on top of another. Only the top is reachable, so the last value pushed is the first one popped.',
  empty: () => new Stack(DEFAULT_STACK_CAPACITY),
  clone: (s) => s.clone(),
  snapshot: (s) => s.snapshot(),
  invariant: (s) => s.checkInvariant(),
  size: (s) => s.size,
  facts: (snap) => [
    { label: 'Size', value: String(snap.items.length) },
    { label: 'top index', value: String(snap.items.length - 1) },
    { label: 'Capacity', value: String(snap.capacity) },
  ],
  operations: stackOperations,
  presets: [
    {
      id: 'small',
      label: 'Three values',
      description: '4, 8 and 15 pushed in that order, so 15 is on top.',
      build: () => Stack.from([4, 8, 15]),
    },
    {
      id: 'nearly-full',
      label: 'One slot left',
      description: 'Seven of eight slots used. Push twice to see overflow explained.',
      build: () => Stack.from([3, 1, 4, 1, 5, 9, 2]),
    },
  ],
  random: () => Stack.from(distinctValues(randomInt(3, 6)), DEFAULT_STACK_CAPACITY),
  quickAdd: {
    label: 'Push several',
    placeholder: 'e.g. 4 8 15',
    hint: 'Pushed left to right, so the last one ends up on top.',
    button: 'Push all',
    apply: (s, text) => {
      const parsed = parseValueList(text);
      if (!parsed.ok) return err(parsed.error);
      const added: number[] = [];
      for (const v of parsed.value) {
        if (!s.push(v).ok) {
          return ok({
            model: s,
            message: `Pushed ${added.join(', ') || 'nothing'}. The stack is full at ${s.capacity}, so the rest did not fit.`,
          });
        }
        added.push(v);
      }
      return ok({
        model: s,
        message: `Pushed ${added.join(', ')}. ${added[added.length - 1]} is on top.`,
      });
    },
  },
  capacity: {
    choices: CAPACITY_CHOICES,
    current: (s) => s.capacity,
    set: (s, capacity) =>
      s.isEmpty() ? ok(new Stack(capacity)) : err('Empty the stack before changing its capacity.'),
  },
};

export const queueDef: StructureDef<CircularQueue, QueueSnapshot> = {
  id: 'queue',
  name: 'Queue',
  shortName: 'Queue',
  tagline: 'First in, first out.',
  intro:
    'A circular buffer with a front and a rear index. Values join at the rear and leave from the front, and both indexes wrap round to slot 0 when they reach the end.',
  empty: () => new CircularQueue(DEFAULT_QUEUE_CAPACITY),
  clone: (q) => q.clone(),
  snapshot: (q) => q.snapshot(),
  invariant: (q) => q.checkInvariant(),
  size: (q) => q.size,
  facts: (snap) => [
    { label: 'count', value: String(snap.count) },
    { label: 'front', value: `slot ${snap.front}` },
    { label: 'rear', value: `slot ${snap.rear}` },
    { label: 'Capacity', value: String(snap.capacity) },
  ],
  operations: queueOperations,
  presets: [
    {
      id: 'small',
      label: 'Three values',
      description: '3, 8 and 1 joined in that order, so 3 is at the front.',
      build: () => CircularQueue.from([3, 8, 1]),
    },
    {
      id: 'wrapped',
      label: 'Already wrapped',
      description: 'rear has wrapped to slot 0 while front sits at slot 4.',
      build: () => {
        const q = CircularQueue.from([10, 20, 30, 40, 50, 60]);
        for (let i = 0; i < 4; i++) q.dequeue();
        for (const v of [70, 80, 90]) q.enqueue(v);
        return q;
      },
    },
  ],
  random: () => {
    // Start from a random offset so the wrap-around shows up early.
    const q = new CircularQueue(DEFAULT_QUEUE_CAPACITY);
    const skip = randomInt(0, DEFAULT_QUEUE_CAPACITY - 1);
    for (let i = 0; i < skip; i++) q.enqueue(0);
    for (let i = 0; i < skip; i++) q.dequeue();
    for (const v of distinctValues(randomInt(3, 6))) q.enqueue(v);
    return q;
  },
  quickAdd: {
    label: 'Enqueue several',
    placeholder: 'e.g. 3 8 1',
    hint: 'They join left to right, so the first one is at the front.',
    button: 'Enqueue all',
    apply: (q, text) => {
      const parsed = parseValueList(text);
      if (!parsed.ok) return err(parsed.error);
      const added: number[] = [];
      for (const v of parsed.value) {
        if (!q.enqueue(v).ok) {
          return ok({
            model: q,
            message: `Enqueued ${added.join(', ') || 'nothing'}. The queue is full at ${q.capacity}, so the rest did not fit.`,
          });
        }
        added.push(v);
      }
      return ok({ model: q, message: `Enqueued ${added.join(', ')}.` });
    },
  },
  capacity: {
    choices: CAPACITY_CHOICES,
    current: (q) => q.capacity,
    set: (q, capacity) =>
      q.isEmpty()
        ? ok(new CircularQueue(capacity))
        : err('Empty the queue before changing its capacity.'),
  },
};
