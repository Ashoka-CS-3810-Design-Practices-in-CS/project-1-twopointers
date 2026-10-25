// Stack operations. Each one is O(1) and only takes one or two steps, but we
// still write them as generators so they go through the same session as
// everything else, and so Guess mode can ask "what comes off next?".

import { EMPTY_FLAG, type StepGenerator } from '../core/types';
import type { Stack, StackSnapshot } from '../models/Stack';
import { Tracer, optionsFrom } from './tracer';

type Gen = StepGenerator<StackSnapshot, Stack>;

export const PUSH_CODE = [
  'push(x):',
  '  if top = capacity − 1: overflow',
  '  top ← top + 1',
  '  store[top] ← x',
];

export const POP_CODE = [
  'pop():',
  '  if top = −1: underflow',
  '  x ← store[top]',
  '  top ← top − 1',
  '  return x',
];

export const PEEK_CODE = ['peek():', '  if top = −1: underflow', '  return store[top]'];

export const STACK_EMPTY_CODE = ['isEmpty():', '  return top = −1'];

export function* push(stack: Stack, value: number): Gen {
  const t = new Tracer(() => stack.snapshot(), ['writes']);

  if (stack.isFull()) {
    yield t.step(
      `The stack is full: all ${stack.capacity} slots are taken, so there is no slot above the top for ${value}. This is called overflow. Pop something first, or pick a bigger capacity while the stack is empty.`,
      { line: 2, tone: 'bad', final: true },
    );
    return { ok: false, reason: 'overflow' };
  }

  const oldTop = stack.top;
  const pushed = stack.push(value);
  if (!pushed.ok) return { ok: false, reason: pushed.error };
  t.count('writes');

  yield t.step(
    `push(${value}): top moves from ${oldTop} to ${stack.top}, and ${value} is stored in that slot. Nothing below it moves.`,
    {
      line: 4,
      current: [pushed.value.id],
      marks: { [pushed.value.id]: 'new' },
      tone: 'good',
      final: true,
    },
  );
  return { ok: true, model: stack, summary: `Pushed ${value}.` };
}

function* underflow(t: Tracer<StackSnapshot>, op: string): Gen {
  yield t.step(
    `${op} on an empty stack has nothing to return. top is -1, which is exactly what isEmpty() checks for. This is called underflow. Push a value first.`,
    { line: 2, tone: 'bad', final: true, marks: { [EMPTY_FLAG]: 'error' } },
  );
  return { ok: false, reason: 'underflow' };
}

/** "Which value comes off?" Only asked when there is a real choice to make. */
function whichValueQuestion(stack: Stack, op: string) {
  const top = stack.peek()!;
  const candidates = [top, stack.at(0)!, stack.at(Math.max(0, stack.top - 1))!];
  return {
    prompt: `Which value will ${op} return?`,
    options: optionsFrom(
      candidates,
      (c) => c.id,
      (c) => String(c.value),
      (c) => c.value,
    ),
    answer: top.id,
    reason: `${top.value} was pushed most recently, so it sits on top. Last in, first out.`,
  };
}

export function* pop(stack: Stack): Gen {
  const t = new Tracer(() => stack.snapshot(), ['reads']);
  if (stack.isEmpty()) return yield* underflow(t, 'pop()');

  const top = stack.peek()!;
  const question = whichValueQuestion(stack, 'pop()');
  if (question.options.length > 1) yield t.ask(question, { line: 3 });

  t.count('reads');
  yield t.step(`pop() reads the top slot (index ${stack.top}), which holds ${top.value}.`, {
    line: 3,
    current: [top.id],
    marks: { [top.id]: 'leaving' },
  });

  stack.pop();
  yield t.step(
    `top moves down to ${stack.top}. pop() returned ${top.value}. ${
      stack.isEmpty() ? 'The stack is now empty.' : `${stack.peek()!.value} is the new top.`
    }`,
    { line: 5, tone: 'good', final: true, result: `pop() returned ${top.value}` },
  );
  return { ok: true, model: stack, summary: `Popped ${top.value}.` };
}

export function* peek(stack: Stack): Gen {
  const t = new Tracer(() => stack.snapshot(), ['reads']);
  if (stack.isEmpty()) return yield* underflow(t, 'peek()');

  const top = stack.peek()!;
  const question = whichValueQuestion(stack, 'peek()');
  if (question.options.length > 1) yield t.ask(question, { line: 3 });

  t.count('reads');
  yield t.step(
    `peek() returns ${top.value}, the value on top. Unlike pop(), it leaves the stack exactly as it was.`,
    {
      line: 3,
      current: [top.id],
      marks: { [top.id]: 'found' },
      tone: 'good',
      final: true,
      result: `peek() returned ${top.value}`,
    },
  );
  return { ok: true, summary: `Peeked ${top.value}.` };
}

export function* isEmpty(stack: Stack): Gen {
  const t = new Tracer(() => stack.snapshot(), ['reads']);
  t.count('reads');
  const empty = stack.isEmpty();
  yield t.step(
    empty
      ? 'isEmpty() is true: top is -1, so nothing is stored.'
      : `isEmpty() is false: top is at index ${stack.top}, so the stack holds ${stack.size} value${stack.size === 1 ? '' : 's'}.`,
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
