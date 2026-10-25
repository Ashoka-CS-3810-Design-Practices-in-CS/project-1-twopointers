// Stable min priority queue backed by an array heap (A2, decision D2).
// Lower priority number is served first. Ties go to whichever entry arrived
// first, which is why every entry carries an insertion number (seq).
//
// The same array is drawn twice in the interface, once as a tree and once as
// indexed storage, so parent = (i - 1) / 2 is something you can see.

import { IdSource } from '../core/ids';
import { MAX_HEAP_ENTRIES } from '../core/limits';
import { err, ok, type Result } from '../core/result';
import type { Id } from '../core/types';

export interface HeapEntry {
  id: Id;
  value: number;
  priority: number;
  seq: number;
}

export interface HeapSnapshot {
  items: HeapEntry[];
}

export const parentOf = (i: number) => Math.floor((i - 1) / 2);
export const leftOf = (i: number) => 2 * i + 1;
export const rightOf = (i: number) => 2 * i + 2;

/** True when a should come out before b. */
export function before(a: HeapEntry, b: HeapEntry): boolean {
  return a.priority < b.priority || (a.priority === b.priority && a.seq < b.seq);
}

export class MinHeap {
  private items: HeapEntry[] = [];
  private ids: IdSource;
  private nextSeq = 1;

  constructor(ids?: IdSource, nextSeq = 1) {
    this.ids = ids ?? new IdSource('h');
    this.nextSeq = nextSeq;
  }

  static from(pairs: { value: number; priority: number }[]): MinHeap {
    const heap = new MinHeap();
    for (const p of pairs) heap.push(p.value, p.priority);
    return heap;
  }

  get size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  isFull(): boolean {
    return this.items.length >= MAX_HEAP_ENTRIES;
  }

  at(i: number): HeapEntry {
    return this.items[i];
  }

  peek(): HeapEntry | undefined {
    return this.items[0];
  }

  /** Adds an entry at the next free leaf without fixing the order yet. */
  append(value: number, priority: number): HeapEntry {
    const entry = { id: this.ids.take(), value, priority, seq: this.nextSeq++ };
    this.items.push(entry);
    return entry;
  }

  swap(i: number, j: number): void {
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
  }

  /** Moves the last leaf into slot i and shortens the array. */
  moveLastTo(i: number): void {
    const last = this.items.pop();
    if (last && i < this.items.length) this.items[i] = last;
  }

  /** Plain push with no steps, used by quick build and tests. */
  push(value: number, priority: number): Result<HeapEntry> {
    if (this.isFull()) return err(`The queue already holds ${MAX_HEAP_ENTRIES} entries.`);
    const entry = this.append(value, priority);
    let i = this.items.length - 1;
    while (i > 0 && before(this.items[i], this.items[parentOf(i)])) {
      this.swap(i, parentOf(i));
      i = parentOf(i);
    }
    return ok(entry);
  }

  /** Plain extract-min with no steps, used by tests. */
  pop(): Result<HeapEntry> {
    const top = this.items[0];
    if (!top) return err('The priority queue is empty.');
    this.moveLastTo(0);
    let i = 0;
    for (;;) {
      const l = leftOf(i);
      const r = rightOf(i);
      let smallest = i;
      if (l < this.items.length && before(this.items[l], this.items[smallest])) smallest = l;
      if (r < this.items.length && before(this.items[r], this.items[smallest])) smallest = r;
      if (smallest === i) break;
      this.swap(i, smallest);
      i = smallest;
    }
    return ok(top);
  }

  clone(): MinHeap {
    const copy = new MinHeap(this.ids.clone(), this.nextSeq);
    copy.items = this.items.map((e) => ({ ...e }));
    return copy;
  }

  snapshot(): HeapSnapshot {
    return { items: this.items.map((e) => ({ ...e })) };
  }

  checkInvariant(): string | null {
    for (let i = 1; i < this.items.length; i++) {
      if (before(this.items[i], this.items[parentOf(i)])) {
        return `entry at index ${i} should not sit below index ${parentOf(i)}`;
      }
    }
    return null;
  }
}
