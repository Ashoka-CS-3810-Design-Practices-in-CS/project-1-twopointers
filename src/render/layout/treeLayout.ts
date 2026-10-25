// Layouts for the two tree drawings.
//
// BST: x comes from the in-order rank and y from the depth (A1, section 4.1).
// A skewed tree therefore visibly leans, which is exactly what we want the
// learner to notice.
//
// Heap: positions come straight from the array index, so the drawing is the
// complete binary tree the index arithmetic describes.

import type { Id } from '../../core/types';
import type { BstSnapshot } from '../../models/BinarySearchTree';
import type { HeapSnapshot } from '../../models/MinHeap';
import type { Point, Positions } from '../useTween';

export interface TreeLayout {
  pos: Positions;
  edges: { from: Id; to: Id }[];
  width: number;
  height: number;
}

const MIN_W = 440;
const MIN_H = 250;

export function layoutBst(snap: BstSnapshot): TreeLayout {
  const raw: Record<Id, Point> = {};
  const edges: TreeLayout['edges'] = [];
  let rank = 0;
  let maxDepth = 0;

  const walk = (id: Id | null, depth: number) => {
    if (id === null) return;
    const n = snap.nodes[id];
    if (!n) return;
    walk(n.left, depth + 1);
    raw[id] = { x: rank++, y: depth };
    maxDepth = Math.max(maxDepth, depth);
    walk(n.right, depth + 1);
    if (n.left) edges.push({ from: id, to: n.left });
    if (n.right) edges.push({ from: id, to: n.right });
  };
  walk(snap.root, 0);

  const col = rank > 18 ? 46 : 58;
  const row = maxDepth > 6 ? 62 : 76;
  const contentW = Math.max(0, rank - 1) * col;
  const contentH = maxDepth * row;
  const width = Math.max(MIN_W, contentW + 110);
  const height = Math.max(MIN_H, contentH + 120);
  const offX = (width - contentW) / 2;
  const offY = 52;

  const pos: Positions = {};
  for (const [id, p] of Object.entries(raw)) pos[id] = { x: offX + p.x * col, y: offY + p.y * row };
  return { pos, edges, width, height };
}

export interface HeapLayout extends TreeLayout {
  /** Where each entry sits in the array strip, keyed by entry id. */
  cells: Positions;
  cellWidth: number;
  arrayY: number;
}

export function layoutHeap(snap: HeapSnapshot): HeapLayout {
  const n = snap.items.length;
  const levels = n === 0 ? 1 : Math.floor(Math.log2(n)) + 1;
  const leafSlots = 2 ** (levels - 1);
  const cellWidth = 54;
  const width = Math.max(MIN_W, leafSlots * 62 + 80, n * cellWidth + 80);
  const row = 78;
  const top = 50;
  const pad = 40;

  const pos: Positions = {};
  const edges: TreeLayout['edges'] = [];
  snap.items.forEach((entry, i) => {
    const level = Math.floor(Math.log2(i + 1));
    const first = 2 ** level - 1;
    const span = (width - pad * 2) / 2 ** level;
    pos[entry.id] = { x: pad + (i - first + 0.5) * span, y: top + level * row };
    if (i > 0) edges.push({ from: snap.items[Math.floor((i - 1) / 2)].id, to: entry.id });
  });

  const arrayY = top + (levels - 1) * row + 92;
  const startX = (width - n * cellWidth) / 2 + cellWidth / 2;
  const cells: Positions = {};
  snap.items.forEach((entry, i) => {
    cells[entry.id] = { x: startX + i * cellWidth, y: arrayY };
  });

  return { pos, edges, width, height: arrayY + 64, cells, cellWidth, arrayY };
}
