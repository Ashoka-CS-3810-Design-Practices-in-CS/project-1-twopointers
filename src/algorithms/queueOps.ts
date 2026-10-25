// Circular queue operations. All O(1). The interesting part for a learner is
// the wrap-around, so enqueue asks "which slot?" and the messages spell out
// the (index + 1) mod capacity arithmetic whenever it wraps.

import { EMPTY_FLAG, type StepGenerator } from '../core/types';
import type { CircularQueue, QueueSnapshot } from '../models/CircularQueue';
import { Tracer, optionsFrom } from './tracer';

type Gen = StepGenerator<QueueSnapshot, CircularQueue>;

export const ENQUEUE_CODE = [
  'enqueue(x):',
  '  if count = capacity: overflow',
  '  rear ← (rear + 1) mod capacity',
  '  slots[rear] ← x',
  '  count ← count + 1',
];

export const DEQUEUE_CODE = [
  'dequeue():',
  '  if count = 0: underflow',
  '  x ← slots[front]',
  '  front ← (front + 1) mod capacity',
  '  count ← count − 1',
  '  return x',
];

export const FRONT_CODE = ['front():', '  if count = 0: underflow', '  return slots[front]'];
export const REAR_CODE = ['rear():', '  if count = 0: underflow', '  return slots[rear]'];
export const QUEUE_EMPTY_CODE = ['isEmpty():', '  return count = 0'];

function wrapNote(from: number, to: number, capacity: number): string {
  return to < from
    ? ` (${from} + 1) mod ${capacity} = ${to}, so it wrapped round to the start.`
    : '';
}

export function* enqueue(queue: CircularQueue, value: number): Gen {
  const t = new Tracer(() => queue.snapshot(), ['writes']);
  const cap = queue.capacity;

  if (queue.isFull()) {
    yield t.step(
      `The queue is full: all ${cap} slots hold a value (count = ${cap}), so ${value} has nowhere to go. This is overflow. Dequeue something first.`,
      { line: 2, tone: 'bad', final: true },
    );
    return { ok: false, reason: 'overflow' };
  }

  const rear = queue.rear;
  const slot = queue.nextRear();
  const wraps = rear === cap - 1;

  // Distractors are the usual mistakes: forgetting to wrap, writing at front,
  // or overwriting the current rear.
  const candidates = [slot, queue.front, rear];
  if (wraps) candidates.push(cap);
  const options = optionsFrom(
    candidates,
    (i) => String(i),
    (i) => `slot ${i}`,
    (i) => i,
  );
  if (options.length > 1) {
    yield t.ask(
      {
        prompt: `Which slot will ${value} go into?`,
        options,
        answer: String(slot),
        reason: queue.isEmpty()
          ? `The queue is empty, so rear sits one slot behind front. (${rear} + 1) mod ${cap} = ${slot}.`
          : wraps
            ? `rear was in slot ${rear}, the last one. (${rear} + 1) mod ${cap} = 0, so it wraps round to slot 0. There is no slot ${cap}.`
            : `rear was in slot ${rear}, so the new value goes one slot further on, into slot ${slot}.`,
      },
      { line: 3 },
    );
  }

  const done = queue.enqueue(value);
  if (!done.ok) return { ok: false, reason: done.error };
  t.count('writes');

  yield t.step(
    `enqueue(${value}): rear moves from slot ${rear} to slot ${slot} and ${value} is stored there. count is now ${queue.size}.${wrapNote(rear, slot, cap)}`,
    {
      line: 4,
      current: [done.value.item.id],
      marks: { [done.value.item.id]: 'new' },
      tone: 'good',
      final: true,
    },
  );
  return { ok: true, model: queue, summary: `Enqueued ${value}.` };
}

function* underflow(t: Tracer<QueueSnapshot>, op: string): Gen {
  yield t.step(
    `${op} on an empty queue has nothing to return, because count is 0. This is underflow. Enqueue a value first.`,
    { line: 2, tone: 'bad', final: true, marks: { [EMPTY_FLAG]: 'error' } },
  );
  return { ok: false, reason: 'underflow' };
}

export function* dequeue(queue: CircularQueue): Gen {
  const t = new Tracer(() => queue.snapshot(), ['reads']);
  if (queue.isEmpty()) return yield* underflow(t, 'dequeue()');

  const first = queue.frontItem()!;
  const inLine = queue.items();
  if (inLine.length > 1) {
    yield t.ask(
      {
        prompt: 'Which value leaves the queue?',
        options: optionsFrom(
          [first, inLine[inLine.length - 1], inLine[1]],
          (c) => c.id,
          (c) => String(c.value),
          (c) => c.value,
        ),
        answer: first.id,
        reason: `${first.value} has been waiting longest, so it is at the front and leaves first. First in, first out.`,
      },
      { line: 3 },
    );
  }

  const from = queue.front;
  t.count('reads');
  yield t.step(`dequeue() reads the front slot (slot ${from}), which holds ${first.value}.`, {
    line: 3,
    current: [first.id],
    marks: { [first.id]: 'leaving' },
  });

  queue.dequeue();
  const to = queue.front;
  yield t.step(
    `front moves from slot ${from} to slot ${to}. dequeue() returned ${first.value}.${wrapNote(from, to, queue.capacity)}${
      queue.isEmpty() ? ' The queue is now empty.' : ''
    } No other value moved.`,
    { line: 6, tone: 'good', final: true, result: `dequeue() returned ${first.value}` },
  );
  return { ok: true, model: queue, summary: `Dequeued ${first.value}.` };
}

export function* front(queue: CircularQueue): Gen {
  const t = new Tracer(() => queue.snapshot(), ['reads']);
  if (queue.isEmpty()) return yield* underflow(t, 'front()');
  const item = queue.frontItem()!;
  t.count('reads');
  yield t.step(`front() returns ${item.value} from slot ${queue.front} and removes nothing.`, {
    line: 3,
    current: [item.id],
    marks: { [item.id]: 'found' },
    tone: 'good',
    final: true,
    result: `front() returned ${item.value}`,
  });
  return { ok: true, summary: `Front is ${item.value}.` };
}

export function* rear(queue: CircularQueue): Gen {
  const t = new Tracer(() => queue.snapshot(), ['reads']);
  if (queue.isEmpty()) return yield* underflow(t, 'rear()');
  const item = queue.rearItem()!;
  t.count('reads');
  yield t.step(
    `rear() returns ${item.value} from slot ${queue.rear}, the value that joined most recently.`,
    {
      line: 3,
      current: [item.id],
      marks: { [item.id]: 'found' },
      tone: 'good',
      final: true,
      result: `rear() returned ${item.value}`,
    },
  );
  return { ok: true, summary: `Rear is ${item.value}.` };
}

export function* isEmpty(queue: CircularQueue): Gen {
  const t = new Tracer(() => queue.snapshot(), ['reads']);
  t.count('reads');
  const empty = queue.isEmpty();
  yield t.step(
    empty
      ? 'isEmpty() is true: count is 0.'
      : `isEmpty() is false: count is ${queue.size}. front and rear alone cannot tell you this when the buffer is full, which is why we keep count.`,
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
