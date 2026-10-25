// Undirected graph: registry entry. Graph editing (vertices and edges) goes
// through the controller's graph actions rather than a quick-add text box.

import { BFS_CODE, DFS_CODE, bfs, dfs } from '../../algorithms/graphTraversals';
import { Graph, type GraphSnapshot } from '../../models/Graph';
import { randomInt } from '../random';
import type { OpArgs, OperationDef, StructureDef } from '../types';

type Op = OperationDef<Graph, GraphSnapshot>;

/** Canvas size used by presets and by the renderer's coordinate system. */
export const GRAPH_WIDTH = 900;
export const GRAPH_HEIGHT = 520;

function needsStart(graph: Graph, args: OpArgs): string | null {
  if (graph.vertexCount === 0) return 'The graph is empty. Click the canvas to add a vertex first.';
  if (!args.source || !graph.hasVertex(args.source)) {
    return 'Choose a start vertex first: pick one in the Start list, or select a vertex and press Set as start.';
  }
  return null;
}

const traversalNotes = (extra: string): string[] => [
  'V is the number of vertices and E the number of edges.',
  'Each vertex is visited once and each edge is checked once from each end, because the adjacency list only lists real neighbours.',
  extra,
];

const operations: Op[] = [
  {
    id: 'graph.bfs',
    label: 'Breadth first',
    signature: 'BFS(start, target?)',
    blurb: 'A queue spreads the search out in layers, nearest vertices first.',
    input: 'endpoints',
    pace: 'stepped',
    complexity: {
      time: 'O(V + E)',
      space: 'O(V)',
      notes: traversalNotes(
        'With a target, BFS finds a shortest path in edges. That only holds because every edge counts the same here.',
      ),
      counter: 'edge checks',
    },
    pseudocode: BFS_CODE,
    blocked: needsStart,
    run: (graph, args) => bfs(graph, args.source as string, args.target ?? null),
  },
  {
    id: 'graph.dfs',
    label: 'Depth first',
    signature: 'DFS(start, target?)',
    blurb: 'A stack follows one branch as deep as it goes, then backs up.',
    input: 'endpoints',
    pace: 'stepped',
    complexity: {
      time: 'O(V + E)',
      space: 'O(V + E)',
      notes: traversalNotes(
        'Our explicit stack can hold the same vertex more than once (at most one copy per edge end), which is why its space bound mentions E. Recursive DFS needs only O(V).',
      ),
      counter: 'edge checks',
    },
    pseudocode: DFS_CODE,
    blocked: needsStart,
    run: (graph, args) => dfs(graph, args.source as string, args.target ?? null),
  },
];

type Layout = { label: string; x: number; y: number }[];

function build(layout: Layout, edges: string[]): Graph {
  const g = new Graph();
  for (const v of layout) g.addVertex(v.x, v.y, v.label);
  for (const pair of edges) {
    const [a, b] = pair.split('');
    g.addEdge(g.findByLabel(a)!, g.findByLabel(b)!);
  }
  return g;
}

// G1 from our A3 test plan (T8 and T9): edges A-B, A-C, B-D, C-D, D-E.
const G1: Layout = [
  { label: 'A', x: 150, y: 260 },
  { label: 'B', x: 330, y: 140 },
  { label: 'C', x: 330, y: 380 },
  { label: 'D', x: 520, y: 260 },
  { label: 'E', x: 720, y: 260 },
];
const G1_EDGES = ['AB', 'AC', 'BD', 'CD', 'DE'];

export const graphDef: StructureDef<Graph, GraphSnapshot> = {
  id: 'graph',
  name: 'Graph',
  shortName: 'Graph',
  tagline: 'Vertices joined by edges, explored by BFS and DFS.',
  intro:
    'Click the canvas to place vertices and drag from one vertex to another to join them. Then run breadth first or depth first search and compare how a queue and a stack change the order.',
  empty: () => new Graph(),
  clone: (g) => g.clone(),
  snapshot: (g) => g.snapshot(),
  invariant: (g) => g.checkInvariant(),
  size: (g) => g.vertexCount,
  facts: (snap) => [
    { label: 'Vertices (V)', value: String(snap.vertices.length) },
    { label: 'Edges (E)', value: String(snap.edges.length) },
  ],
  operations,
  presets: [
    {
      id: 'g1',
      label: 'Five vertices',
      description: 'A small graph with one cycle. BFS and DFS give different orders.',
      build: () => build(G1, G1_EDGES),
    },
    {
      id: 'islands',
      label: 'Two islands',
      description: 'Two separate pieces. A search from A can never reach F or G.',
      build: () =>
        build(
          [...G1, { label: 'F', x: 600, y: 440 }, { label: 'G', x: 790, y: 440 }],
          [...G1_EDGES, 'FG'],
        ),
    },
    {
      id: 'grid',
      label: 'Grid, 3 by 3',
      description: 'BFS spreads in diagonal waves while DFS snakes along one route.',
      build: () => {
        const layout: Layout = [];
        const letters = 'ABCDEFGHI';
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            layout.push({ label: letters[r * 3 + c], x: 270 + c * 180, y: 100 + r * 160 });
          }
        }
        return build(layout, [
          'AB',
          'BC',
          'AD',
          'BE',
          'CF',
          'DE',
          'EF',
          'DG',
          'EH',
          'FI',
          'GH',
          'HI',
        ]);
      },
    },
    {
      id: 'tree',
      label: 'Tree shaped',
      description: 'No cycles, so every vertex is reached exactly once along one route.',
      build: () =>
        build(
          [
            { label: 'A', x: 450, y: 80 },
            { label: 'B', x: 260, y: 220 },
            { label: 'C', x: 640, y: 220 },
            { label: 'D', x: 160, y: 380 },
            { label: 'E', x: 360, y: 380 },
            { label: 'F', x: 540, y: 380 },
            { label: 'G', x: 740, y: 380 },
          ],
          ['AB', 'AC', 'BD', 'BE', 'CF', 'CG'],
        ),
    },
  ],
  random: () => {
    // Vertices on a loose ring so nothing overlaps, then a spanning chain
    // plus a few extra edges so the graph is connected but has cycles.
    const count = randomInt(6, 8);
    const layout: Layout = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      layout.push({
        label: 'ABCDEFGH'[i],
        x: Math.round(450 + Math.cos(angle) * 300 + randomInt(-20, 20)),
        y: Math.round(260 + Math.sin(angle) * 190 + randomInt(-15, 15)),
      });
    }
    const g = build(layout, []);
    // Join ring neighbours (leaving one gap at a random spot) so edges rarely
    // cross, then add a few chords to create cycles.
    const ids = g.vertexIds();
    const gap = randomInt(0, ids.length - 1);
    for (let i = 0; i < ids.length; i++) {
      if (i !== gap) g.addEdge(ids[i], ids[(i + 1) % ids.length]);
    }
    for (let extra = 0; extra < 2; extra++) {
      const a = ids[randomInt(0, ids.length - 1)];
      const b = ids[randomInt(0, ids.length - 1)];
      if (a !== b && !g.hasEdge(a, b)) g.addEdge(a, b);
    }
    return g;
  },
};
