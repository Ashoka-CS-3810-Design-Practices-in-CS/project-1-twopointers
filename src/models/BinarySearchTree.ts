// Unbalanced binary search tree (A1, assumption A4). Nodes keep a parent
// reference as well as left and right. It costs one field per node and makes
// both deletion and the layout pass much simpler.
//
// The tree is deliberately not self-balancing. Watching it lean into a chain
// when keys arrive in sorted order is one of the things the tool is for.

import { IdSource } from '../core/ids';
import { err, ok, type Result } from '../core/result';
import type { Id } from '../core/types';

export interface BstNode {
  id: Id;
  key: number;
  left: Id | null;
  right: Id | null;
  parent: Id | null;
}

export interface BstSnapshot {
  root: Id | null;
  nodes: Record<Id, BstNode>;
}

export type Side = 'left' | 'right';

export class BinarySearchTree {
  private nodes = new Map<Id, BstNode>();
  private rootId: Id | null = null;
  private ids: IdSource;

  constructor(ids?: IdSource) {
    this.ids = ids ?? new IdSource('t');
  }

  static from(keys: number[]): BinarySearchTree {
    const tree = new BinarySearchTree();
    for (const k of keys) tree.insert(k);
    return tree;
  }

  get root(): Id | null {
    return this.rootId;
  }

  get size(): number {
    return this.nodes.size;
  }

  node(id: Id): BstNode {
    const n = this.nodes.get(id);
    if (!n) throw new Error(`No node with id ${id}`);
    return n;
  }

  has(id: Id | null): boolean {
    return id !== null && this.nodes.has(id);
  }

  keyOf(id: Id | null): number | null {
    return id === null ? null : this.node(id).key;
  }

  /** Plain search with no steps, used by quick build and by tests. */
  find(key: number): Id | null {
    let cur = this.rootId;
    while (cur !== null) {
      const n = this.node(cur);
      if (key === n.key) return cur;
      cur = key < n.key ? n.left : n.right;
    }
    return null;
  }

  /** Plain insert with no steps. Duplicates are refused (A1, assumption A6). */
  insert(key: number): Result<Id> {
    if (this.rootId === null) return ok(this.attach(null, 'left', key));
    let cur: Id = this.rootId;
    for (;;) {
      const n = this.node(cur);
      if (key === n.key) return err(`${key} is already in the tree.`);
      const side: Side = key < n.key ? 'left' : 'right';
      const next = n[side];
      if (next === null) return ok(this.attach(cur, side, key));
      cur = next;
    }
  }

  /** Creates a node and hangs it under parent (or makes it the root). */
  attach(parent: Id | null, side: Side, key: number): Id {
    const id = this.ids.take();
    this.nodes.set(id, { id, key, left: null, right: null, parent });
    if (parent === null) this.rootId = id;
    else this.node(parent)[side] = id;
    return id;
  }

  /**
   * Replaces the subtree rooted at u with the subtree rooted at v, the
   * "transplant" helper from CLRS. It only rewires u's parent; the caller
   * decides what happens to u afterwards.
   */
  transplant(u: Id, v: Id | null): void {
    const parent = this.node(u).parent;
    if (parent === null) this.rootId = v;
    else {
      const p = this.node(parent);
      if (p.left === u) p.left = v;
      else p.right = v;
    }
    if (v !== null) this.node(v).parent = parent;
  }

  /** Drops a node that has already been unlinked with transplant. */
  forget(id: Id): void {
    this.nodes.delete(id);
  }

  setKey(id: Id, key: number): void {
    this.node(id).key = key;
  }

  /** Plain delete with no steps, used by tests as a reference. */
  remove(key: number): boolean {
    const target = this.find(key);
    if (target === null) return false;
    const z = this.node(target);
    if (z.left === null) this.transplant(target, z.right);
    else if (z.right === null) this.transplant(target, z.left);
    else {
      let s = z.right;
      while (this.node(s).left !== null) s = this.node(s).left as Id;
      z.key = this.node(s).key;
      this.transplant(s, this.node(s).right);
      this.forget(s);
      return true;
    }
    this.forget(target);
    return true;
  }

  depth(id: Id): number {
    let d = 0;
    let cur = this.node(id).parent;
    while (cur !== null) {
      d++;
      cur = this.node(cur).parent;
    }
    return d;
  }

  /** Height in edges: -1 for an empty tree, 0 for a single node. */
  height(): number {
    const walk = (id: Id | null): number => {
      if (id === null) return -1;
      const n = this.node(id);
      return 1 + Math.max(walk(n.left), walk(n.right));
    };
    return walk(this.rootId);
  }

  inorderKeys(): number[] {
    const out: number[] = [];
    const walk = (id: Id | null) => {
      if (id === null) return;
      const n = this.node(id);
      walk(n.left);
      out.push(n.key);
      walk(n.right);
    };
    walk(this.rootId);
    return out;
  }

  clone(): BinarySearchTree {
    const copy = new BinarySearchTree(this.ids.clone());
    for (const [id, n] of this.nodes) copy.nodes.set(id, { ...n });
    copy.rootId = this.rootId;
    return copy;
  }

  snapshot(): BstSnapshot {
    const nodes: Record<Id, BstNode> = {};
    for (const [id, n] of this.nodes) nodes[id] = { ...n };
    return { root: this.rootId, nodes };
  }

  checkInvariant(): string | null {
    if (this.rootId === null) return this.nodes.size === 0 ? null : 'nodes exist but root is empty';
    if (this.node(this.rootId).parent !== null) return 'root has a parent';

    let reached = 0;
    const walk = (id: Id, low: number, high: number): string | null => {
      reached++;
      const n = this.node(id);
      if (!(n.key > low && n.key < high)) return `key ${n.key} breaks the BST order`;
      for (const side of ['left', 'right'] as const) {
        const child = n[side];
        if (child === null) continue;
        if (!this.nodes.has(child)) return `${id} points at a missing node`;
        if (this.node(child).parent !== id) return `parent link of ${child} is wrong`;
        const problem = side === 'left' ? walk(child, low, n.key) : walk(child, n.key, high);
        if (problem) return problem;
      }
      return null;
    };
    const problem = walk(this.rootId, -Infinity, Infinity);
    if (problem) return problem;
    if (reached !== this.nodes.size) return 'some nodes are not reachable from the root';
    return null;
  }
}
