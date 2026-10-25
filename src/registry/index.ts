// The registry: every structure the app knows about, in the order the
// navigation shows them. Adding a structure means adding one entry here and
// one renderer, nothing else (A1, requirement S14).

import type { StructureId } from '../core/types';
import { bstDef } from './structures/bst';
import { graphDef } from './structures/graph';
import { heapDef } from './structures/heap';
import { queueDef, stackDef } from './structures/linear';
import type { OperationDef, StructureDef } from './types';

export const STRUCTURES: StructureDef[] = [bstDef, graphDef, heapDef, stackDef, queueDef];

export function structureById(id: StructureId): StructureDef {
  const def = STRUCTURES.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown structure ${id}`);
  return def;
}

export function operationById(id: string): OperationDef | undefined {
  for (const s of STRUCTURES) {
    const op = s.operations.find((o) => o.id === id);
    if (op) return op;
  }
  return undefined;
}

export type { OperationDef, StructureDef } from './types';
