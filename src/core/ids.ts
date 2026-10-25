// Stable ids. The renderer matches an element across steps by its id, so a
// node keeps its identity when the layout moves it (A1, section 4.1).

import type { Id } from './types';

export class IdSource {
  constructor(
    private readonly prefix: string,
    private next = 1,
  ) {}

  take(): Id {
    return `${this.prefix}${this.next++}`;
  }

  /** Copies keep counting from the same place, so ids never collide. */
  clone(): IdSource {
    return new IdSource(this.prefix, this.next);
  }
}

/** One key per undirected edge, the same whichever end you start from. */
export function edgeKey(a: Id, b: Id): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
