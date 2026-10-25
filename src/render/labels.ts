// How to name an element of each structure in text (side panels, captions).

import type { Id, StructureId } from '../core/types';
import type { BstSnapshot } from '../models/BinarySearchTree';
import type { GraphSnapshot } from '../models/Graph';
import type { HeapSnapshot } from '../models/MinHeap';
import type { QueueSnapshot } from '../models/CircularQueue';
import type { StackSnapshot } from '../models/Stack';

export function labelFor(structure: StructureId, snapshot: unknown, id: Id): string {
  switch (structure) {
    case 'bst': {
      const n = (snapshot as BstSnapshot).nodes[id];
      return n ? String(n.key) : '?';
    }
    case 'graph':
      return (snapshot as GraphSnapshot).vertices.find((v) => v.id === id)?.label ?? '?';
    case 'heap': {
      const e = (snapshot as HeapSnapshot).items.find((x) => x.id === id);
      return e ? `${e.value} (p${e.priority})` : '?';
    }
    case 'stack':
      return String((snapshot as StackSnapshot).items.find((x) => x.id === id)?.value ?? '?');
    case 'queue':
      return String((snapshot as QueueSnapshot).slots.find((x) => x?.id === id)?.value ?? '?');
  }
}
