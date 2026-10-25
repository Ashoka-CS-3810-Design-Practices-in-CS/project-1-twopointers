// Queue as a circular buffer with front, rear and count (A1, section 4.1).
// We picked this over a shifting array on purpose: dequeue is O(1), and an
// animation that shuffled every element left would contradict the cost panel.
//
// Convention: front is the slot of the first element, rear is the slot of the
// last one. An empty queue starts with front = 0 and rear = capacity - 1, so
// the first enqueue lands in slot 0. count is what tells empty from full when
// front and rear end up next to each other.

import { IdSource } from '../core/ids';
import { DEFAULT_QUEUE_CAPACITY } from '../core/limits';
import { err, ok, type Result } from '../core/result';
import type { Id } from '../core/types';

export interface QueueItem {
  id: Id;
  value: number;
}

export interface QueueSnapshot {
  capacity: number;
  slots: (QueueItem | null)[];
  front: number;
  rear: number;
  count: number;
}

export interface SlotChange {
  item: QueueItem;
  index: number;
}

export class CircularQueue {
  private slots: (QueueItem | null)[];
  private frontIndex = 0;
  private rearIndex: number;
  private count = 0;
  private ids: IdSource;

  constructor(
    readonly capacity: number = DEFAULT_QUEUE_CAPACITY,
    ids?: IdSource,
  ) {
    this.slots = new Array(capacity).fill(null);
    this.rearIndex = capacity - 1;
    this.ids = ids ?? new IdSource('q');
  }

  static from(values: number[], capacity = DEFAULT_QUEUE_CAPACITY): CircularQueue {
    const queue = new CircularQueue(capacity);
    for (const v of values) queue.enqueue(v);
    return queue;
  }

  get size(): number {
    return this.count;
  }

  get front(): number {
    return this.frontIndex;
  }

  get rear(): number {
    return this.rearIndex;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  isFull(): boolean {
    return this.count === this.capacity;
  }

  /** Where the next enqueue will write. This is the wrap-around in one line. */
  nextRear(): number {
    return (this.rearIndex + 1) % this.capacity;
  }

  frontItem(): QueueItem | undefined {
    return this.count === 0 ? undefined : (this.slots[this.frontIndex] ?? undefined);
  }

  rearItem(): QueueItem | undefined {
    return this.count === 0 ? undefined : (this.slots[this.rearIndex] ?? undefined);
  }

  /** Items in queue order, front first. */
  items(): QueueItem[] {
    const out: QueueItem[] = [];
    for (let k = 0; k < this.count; k++) {
      const slot = this.slots[(this.frontIndex + k) % this.capacity];
      if (slot) out.push(slot);
    }
    return out;
  }

  enqueue(value: number): Result<SlotChange> {
    if (this.isFull()) return err(`The queue is full (${this.capacity} of ${this.capacity}).`);
    this.rearIndex = this.nextRear();
    const item = { id: this.ids.take(), value };
    this.slots[this.rearIndex] = item;
    this.count++;
    return ok({ item, index: this.rearIndex });
  }

  dequeue(): Result<SlotChange> {
    if (this.count === 0) return err('The queue is empty.');
    const index = this.frontIndex;
    const item = this.slots[index] as QueueItem;
    this.slots[index] = null;
    this.frontIndex = (this.frontIndex + 1) % this.capacity;
    this.count--;
    return ok({ item, index });
  }

  clone(): CircularQueue {
    const copy = new CircularQueue(this.capacity, this.ids.clone());
    copy.slots = this.slots.map((s) => (s ? { ...s } : null));
    copy.frontIndex = this.frontIndex;
    copy.rearIndex = this.rearIndex;
    copy.count = this.count;
    return copy;
  }

  snapshot(): QueueSnapshot {
    return {
      capacity: this.capacity,
      slots: this.slots.map((s) => (s ? { ...s } : null)),
      front: this.frontIndex,
      rear: this.rearIndex,
      count: this.count,
    };
  }

  checkInvariant(): string | null {
    const cap = this.capacity;
    if (this.count < 0 || this.count > cap) return `count ${this.count} is outside 0..${cap}`;
    if ((this.frontIndex + this.count - 1 + cap) % cap !== this.rearIndex) {
      return 'rear does not sit count - 1 slots after front';
    }
    // Exactly the count slots starting at front are filled, the rest are empty.
    for (let k = 0; k < cap; k++) {
      const index = (this.frontIndex + k) % cap;
      const filled = this.slots[index] !== null;
      if (k < this.count && !filled) return `slot ${index} should hold a value`;
      if (k >= this.count && filled) return `slot ${index} should be empty`;
    }
    return null;
  }
}
