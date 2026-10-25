// Bounded stack: an array plus an explicit top index, the same "store with a
// marker" we used for the stack in the state machine module. Index i maps
// straight to the i-th slot from the bottom in the drawing.

import { IdSource } from '../core/ids';
import { DEFAULT_STACK_CAPACITY } from '../core/limits';
import { err, ok, type Result } from '../core/result';
import type { Id } from '../core/types';

export interface StackItem {
  id: Id;
  value: number;
}

export interface StackSnapshot {
  capacity: number;
  /** items[0] is the bottom, items[items.length - 1] is the top. */
  items: StackItem[];
}

export class Stack {
  private store: StackItem[] = [];
  private ids: IdSource;

  constructor(
    readonly capacity: number = DEFAULT_STACK_CAPACITY,
    ids?: IdSource,
  ) {
    this.ids = ids ?? new IdSource('s');
  }

  static from(values: number[], capacity = DEFAULT_STACK_CAPACITY): Stack {
    const stack = new Stack(capacity);
    for (const v of values) stack.push(v);
    return stack;
  }

  get size(): number {
    return this.store.length;
  }

  /** Index of the top element, -1 when empty (the textbook convention). */
  get top(): number {
    return this.store.length - 1;
  }

  isEmpty(): boolean {
    return this.store.length === 0;
  }

  isFull(): boolean {
    return this.store.length >= this.capacity;
  }

  peek(): StackItem | undefined {
    return this.store[this.store.length - 1];
  }

  /** Read-only view of a slot, used by the generators to build questions. */
  at(index: number): StackItem | undefined {
    return this.store[index];
  }

  push(value: number): Result<StackItem> {
    if (this.isFull()) return err(`The stack is full (${this.capacity} of ${this.capacity}).`);
    const item = { id: this.ids.take(), value };
    this.store.push(item);
    return ok(item);
  }

  pop(): Result<StackItem> {
    const item = this.store.pop();
    return item ? ok(item) : err('The stack is empty.');
  }

  clone(): Stack {
    const copy = new Stack(this.capacity, this.ids.clone());
    copy.store = this.store.map((item) => ({ ...item }));
    return copy;
  }

  snapshot(): StackSnapshot {
    return { capacity: this.capacity, items: this.store.map((item) => ({ ...item })) };
  }

  /** Returns null when everything is fine, otherwise what is broken. */
  checkInvariant(): string | null {
    if (this.store.length > this.capacity) return 'stack holds more items than its capacity';
    const seen = new Set<Id>();
    for (const item of this.store) {
      if (seen.has(item.id)) return `duplicate id ${item.id}`;
      seen.add(item.id);
    }
    return null;
  }
}
