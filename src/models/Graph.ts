// Simple undirected graph stored as an adjacency list: a map from vertex id
// to a set of neighbour ids (A1, section 4.1). JavaScript sets remember
// insertion order, which is the neighbour order BFS and DFS use (A2, 2.3).
//
// Vertex positions live here too, because the learner places them by hand and
// we never want a layout algorithm to move them around.

import { IdSource, edgeKey } from '../core/ids';
import { MAX_EDGES, MAX_VERTICES } from '../core/limits';
import { err, ok, type Result } from '../core/result';
import type { Id } from '../core/types';

export interface Vertex {
  id: Id;
  label: string;
  x: number;
  y: number;
}

export interface GraphSnapshot {
  vertices: Vertex[];
  /** Each undirected edge once, as [a, b]. */
  edges: [Id, Id][];
  /** Neighbours in the order traversals will check them. */
  adjacency: Record<Id, Id[]>;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class Graph {
  private vertices = new Map<Id, Vertex>();
  private adj = new Map<Id, Set<Id>>();
  private ids: IdSource;

  constructor(ids?: IdSource) {
    this.ids = ids ?? new IdSource('v');
  }

  get vertexCount(): number {
    return this.vertices.size;
  }

  get edgeCount(): number {
    let twice = 0;
    for (const set of this.adj.values()) twice += set.size;
    return twice / 2;
  }

  hasVertex(id: Id | null | undefined): id is Id {
    return !!id && this.vertices.has(id);
  }

  vertex(id: Id): Vertex {
    const v = this.vertices.get(id);
    if (!v) throw new Error(`No vertex with id ${id}`);
    return v;
  }

  label(id: Id): string {
    return this.vertex(id).label;
  }

  findByLabel(label: string): Id | null {
    for (const v of this.vertices.values()) if (v.label === label) return v.id;
    return null;
  }

  vertexIds(): Id[] {
    return [...this.vertices.keys()];
  }

  neighbours(id: Id): Id[] {
    return [...(this.adj.get(id) ?? [])];
  }

  hasEdge(a: Id, b: Id): boolean {
    return this.adj.get(a)?.has(b) ?? false;
  }

  /** First letter not already used, so labels stay short and readable. */
  private nextLabel(): string {
    const used = new Set([...this.vertices.values()].map((v) => v.label));
    for (const ch of LETTERS) if (!used.has(ch)) return ch;
    return `V${this.vertices.size + 1}`;
  }

  addVertex(x: number, y: number, label?: string): Result<Vertex> {
    if (this.vertices.size >= MAX_VERTICES) {
      return err(
        `The graph already has ${MAX_VERTICES} vertices, the most we can label clearly. Remove one to add another.`,
      );
    }
    const name = label ?? this.nextLabel();
    if (this.findByLabel(name)) return err(`There is already a vertex called ${name}.`);
    const v: Vertex = { id: this.ids.take(), label: name, x, y };
    this.vertices.set(v.id, v);
    this.adj.set(v.id, new Set());
    return ok(v);
  }

  removeVertex(id: Id): Result<Vertex> {
    const v = this.vertices.get(id);
    if (!v) return err('That vertex no longer exists.');
    // O(deg v): drop the vertex from each neighbour's set, then drop its own set.
    for (const n of this.adj.get(id) ?? []) this.adj.get(n)?.delete(id);
    this.adj.delete(id);
    this.vertices.delete(id);
    return ok(v);
  }

  addEdge(a: Id, b: Id): Result<[Id, Id]> {
    if (!this.vertices.has(a) || !this.vertices.has(b))
      return err('Both ends must be existing vertices.');
    if (a === b) {
      return err(
        `An edge from ${this.label(a)} back to itself is a self-loop. This graph is simple, so loops are not allowed and would not change BFS or DFS anyway.`,
      );
    }
    if (this.hasEdge(a, b)) {
      return err(
        `${this.label(a)} and ${this.label(b)} are already connected. A simple graph has at most one edge between two vertices.`,
      );
    }
    if (this.edgeCount >= MAX_EDGES) {
      return err(
        `The graph already has ${MAX_EDGES} edges, the most we draw legibly. Remove one first.`,
      );
    }
    this.adj.get(a)!.add(b);
    this.adj.get(b)!.add(a);
    return ok([a, b]);
  }

  removeEdge(a: Id, b: Id): Result<[Id, Id]> {
    if (!this.hasEdge(a, b)) return err('Those two vertices are not connected.');
    this.adj.get(a)!.delete(b);
    this.adj.get(b)!.delete(a);
    return ok([a, b]);
  }

  moveVertex(id: Id, x: number, y: number): void {
    const v = this.vertices.get(id);
    if (v) {
      v.x = x;
      v.y = y;
    }
  }

  clone(): Graph {
    const copy = new Graph(this.ids.clone());
    for (const [id, v] of this.vertices) copy.vertices.set(id, { ...v });
    for (const [id, set] of this.adj) copy.adj.set(id, new Set(set));
    return copy;
  }

  snapshot(): GraphSnapshot {
    const edges: [Id, Id][] = [];
    const seen = new Set<string>();
    const adjacency: Record<Id, Id[]> = {};
    for (const [id, set] of this.adj) {
      adjacency[id] = [...set];
      for (const n of set) {
        const key = edgeKey(id, n);
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([id, n]);
        }
      }
    }
    return { vertices: [...this.vertices.values()].map((v) => ({ ...v })), edges, adjacency };
  }

  checkInvariant(): string | null {
    for (const [id, set] of this.adj) {
      if (!this.vertices.has(id)) return `adjacency entry for missing vertex ${id}`;
      for (const n of set) {
        if (n === id) return `self-loop on ${id}`;
        if (!this.vertices.has(n)) return `edge to missing vertex ${n}`;
        if (!this.adj.get(n)?.has(id)) return `edge ${id}-${n} is not symmetric`;
      }
    }
    if (this.adj.size !== this.vertices.size) return 'adjacency and vertex table disagree';
    return null;
  }
}
