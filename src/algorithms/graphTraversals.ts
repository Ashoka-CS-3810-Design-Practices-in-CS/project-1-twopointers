// Breadth first and depth first search as step generators (A2, 2.3 and 2.4).
//
// Both are the same skeleton with a different waiting structure: a queue
// makes the search spread out in layers, a stack makes it dive down one
// branch first. Putting them next to each other is the whole point, so the
// two functions are kept deliberately parallel.
//
// Neighbours are checked in insertion order (the order the edges were drawn),
// and the adjacency list is shown in the side panel so that order is visible.

import { edgeKey } from '../core/ids';
import type { EdgeMark, Frontier, Id, Mark, StepGenerator, StepRecord } from '../core/types';
import type { Graph, GraphSnapshot } from '../models/Graph';
import { Tracer, optionsFrom } from './tracer';

type Gen = StepGenerator<GraphSnapshot, Graph>;

export const BFS_CODE = [
  'BFS(G, s):',
  '  mark s seen; queue ← [s]',
  '  while queue is not empty:',
  '    v ← dequeue(queue); visit v',
  '    if v = target: stop',
  '    for each neighbour u of v:',
  '      if u is not seen:',
  '        mark u seen; enqueue(queue, u)',
];

export const DFS_CODE = [
  'DFS(G, s):',
  '  stack ← [s]',
  '  while stack is not empty:',
  '    v ← pop(stack)',
  '    if v is visited: skip it',
  '    mark v visited; visit v',
  '    if v = target: stop',
  '    for each neighbour u of v, last first:',
  '      if u is not visited: push(stack, u)',
];

interface Shared {
  graph: Graph;
  t: Tracer<GraphSnapshot>;
  treeEdges: Record<string, EdgeMark>;
  parent: Map<Id, Id>;
}

const L = (graph: Graph, id: Id) => graph.label(id);

function pathTo(parent: Map<Id, Id>, source: Id, target: Id): Id[] {
  const path = [target];
  let cur = target;
  while (cur !== source) {
    const p = parent.get(cur);
    if (p === undefined) break;
    path.unshift(p);
    cur = p;
  }
  return path;
}

/** Final step when the target has just been visited. */
function reachedTarget(
  s: Shared,
  source: Id,
  target: Id,
  algorithm: 'BFS' | 'DFS',
  line: number,
): StepRecord<GraphSnapshot> {
  const path = pathTo(s.parent, source, target);
  const names = path.map((id) => L(s.graph, id)).join(' → ');
  const edges = path.length - 1;
  const edgeMarks: Record<string, EdgeMark> = { ...s.treeEdges };
  const marks: Record<Id, Mark> = {};
  path.forEach((id, i) => {
    marks[id] = 'path';
    if (i > 0) edgeMarks[edgeKey(path[i - 1], id)] = 'path';
  });
  marks[target] = 'found';
  const note =
    algorithm === 'BFS'
      ? `Shortest path from ${L(s.graph, source)}: ${names} (${edges} edge${edges === 1 ? '' : 's'}). BFS explores in layers, so the first time it reaches a vertex is along a shortest route.`
      : `Path found: ${names} (${edges} edge${edges === 1 ? '' : 's'}). DFS found a path, but not necessarily the shortest one.`;
  return s.t.step(`Reached ${L(s.graph, target)}, so ${algorithm} stops here. ${note}`, {
    line,
    current: [target],
    edgeMarks,
    marks,
    tone: 'good',
    final: true,
    result: `${algorithm} order: ${s.t.order.join(' ')}`,
  });
}

/** Final step when the waiting structure has run dry. */
function exhausted(
  s: Shared,
  source: Id,
  target: Id | null,
  algorithm: 'BFS' | 'DFS',
  reached: Set<Id>,
): StepRecord<GraphSnapshot> {
  const { graph, t } = s;
  const left = graph.vertexIds().filter((id) => !reached.has(id));
  const marks: Record<Id, Mark> = {};
  for (const id of left) marks[id] = 'unreachable';
  const what = algorithm === 'BFS' ? 'queue' : 'stack';

  let message = `The ${what} is empty, so ${algorithm} is done. Visit order: ${t.order.join(' ')}.`;
  if (target !== null) {
    message += ` ${L(graph, target)} was never reached, so there is no path from ${L(graph, source)} to ${L(graph, target)}.`;
  }
  if (left.length > 0) {
    const names = left.map((id) => L(graph, id)).join(', ');
    message += ` ${names} cannot be reached from ${L(graph, source)}: no chain of edges leads there. Start from ${left.length === 1 ? 'it' : 'one of them'} to explore that part.`;
  }
  return t.step(message, {
    line: 3,
    edgeMarks: { ...s.treeEdges },
    marks,
    tone: left.length > 0 || target !== null ? 'warn' : 'good',
    final: true,
    result: `${algorithm} order: ${t.order.join(' ')}`,
  });
}

export function* bfs(graph: Graph, source: Id, target: Id | null = null): Gen {
  const t = new Tracer(() => graph.snapshot(), ['visits', 'edge checks']);
  const s: Shared = { graph, t, treeEdges: {}, parent: new Map() };
  const seen = new Set<Id>([source]);
  const queue: Id[] = [source];
  let explainedSeen = false;

  const view = () => {
    const frontier: Frontier = {
      title: 'Queue',
      ids: [...queue],
      labels: queue.map((id) => L(graph, id)),
      ends: ['front', 'rear'],
    };
    const marks: Record<Id, Mark> = {};
    for (const id of queue) marks[id] = 'waiting';
    return { frontier, marks, edgeMarks: { ...s.treeEdges } };
  };

  yield t.step(
    `Start at ${L(graph, source)}: mark it as seen and put it in the queue.${
      target !== null ? ` We stop as soon as ${L(graph, target)} is visited.` : ''
    }`,
    { line: 2, current: [source], ...view() },
  );

  while (queue.length > 0) {
    if (queue.length > 1) {
      const head = queue[0];
      yield t.ask(
        {
          prompt: 'Which vertex leaves the queue next?',
          options: optionsFrom(
            queue.slice(0, 4),
            (id) => id,
            (id) => L(graph, id),
          ),
          answer: head,
          reason: `${L(graph, head)} joined the queue first, so it leaves first. A queue is first in, first out.`,
        },
        { line: 4, ...view() },
      );
    }

    const v = queue.shift() as Id;
    t.visited.push(v);
    t.order.push(L(graph, v));
    t.count('visits');
    yield t.step(`Take ${L(graph, v)} from the front of the queue and visit it.`, {
      line: 4,
      current: [v],
      ...view(),
    });

    if (v === target) {
      yield reachedTarget(s, source, target, 'BFS', 5);
      return { ok: true, summary: `BFS reached ${L(graph, target)}.` };
    }

    const neighbours = graph.neighbours(v);
    if (neighbours.length === 0) {
      yield t.step(`${L(graph, v)} has no neighbours, so there is nothing to add.`, {
        line: 6,
        current: [v],
        ...view(),
      });
    }

    for (const u of neighbours) {
      t.count('edge checks');
      const fresh = !seen.has(u);
      yield t.step(
        fresh
          ? `Check edge ${L(graph, v)}–${L(graph, u)}. ${L(graph, u)} has not been seen yet.`
          : `Check edge ${L(graph, v)}–${L(graph, u)}. ${L(graph, u)} was already seen, so skip it.`,
        { line: 7, current: [v], edge: [v, u], ...view() },
      );
      if (!fresh) continue;

      seen.add(u);
      queue.push(u);
      s.parent.set(u, v);
      s.treeEdges[edgeKey(v, u)] = 'tree';
      yield t.step(
        `Mark ${L(graph, u)} as seen and add it to the back of the queue.${
          explainedSeen
            ? ''
            : ' Marking it now, not when it leaves, means no vertex can join the queue twice.'
        }`,
        { line: 8, current: [v], edge: [v, u], ...view() },
      );
      explainedSeen = true;
    }
  }

  yield exhausted(s, source, target, 'BFS', seen);
  return { ok: true, summary: `BFS order: ${t.order.join(' ')}` };
}

export function* dfs(graph: Graph, source: Id, target: Id | null = null): Gen {
  const t = new Tracer(() => graph.snapshot(), ['visits', 'edge checks', 'pushes']);
  const s: Shared = { graph, t, treeEdges: {}, parent: new Map() };
  const visited = new Set<Id>();
  // Each stack entry remembers who pushed it, so we can draw the DFS tree.
  const stack: { v: Id; from: Id | null }[] = [{ v: source, from: null }];
  let explainedOrder = false;

  const view = () => {
    const top = [...stack].reverse();
    const frontier: Frontier = {
      title: 'Stack',
      ids: top.map((e) => e.v),
      labels: top.map((e) => L(graph, e.v)),
      ends: ['top', 'bottom'],
    };
    const marks: Record<Id, Mark> = {};
    for (const e of stack) if (!visited.has(e.v)) marks[e.v] = 'waiting';
    return { frontier, marks, edgeMarks: { ...s.treeEdges } };
  };

  t.count('pushes');
  yield t.step(
    `Push the start vertex ${L(graph, source)} onto the stack.${
      target !== null ? ` We stop as soon as ${L(graph, target)} is visited.` : ''
    }`,
    { line: 2, current: [source], ...view() },
  );

  while (stack.length > 0) {
    const { v, from } = stack.pop() as { v: Id; from: Id | null };
    yield t.step(`Pop ${L(graph, v)} from the top of the stack.`, {
      line: 4,
      current: [v],
      ...view(),
    });

    const already = visited.has(v);
    yield t.ask(
      {
        prompt: `Visit ${L(graph, v)} or skip it?`,
        options: [
          { id: 'visit', label: `Visit ${L(graph, v)}` },
          { id: 'skip', label: 'Skip it' },
        ],
        answer: already ? 'skip' : 'visit',
        reason: already
          ? `${L(graph, v)} was visited earlier. This copy was pushed before that visit happened, so it is skipped.`
          : `${L(graph, v)} has not been visited yet, so this is its first and only visit.`,
      },
      { line: 5, current: [v], ...view() },
    );

    if (already) {
      yield t.step(
        `${L(graph, v)} is already visited, so this copy is skipped. In iterative DFS a vertex can sit on the stack more than once.`,
        { line: 5, current: [v], ...view() },
      );
      continue;
    }

    visited.add(v);
    if (from !== null) {
      s.parent.set(v, from);
      s.treeEdges[edgeKey(from, v)] = 'tree';
    }
    t.visited.push(v);
    t.order.push(L(graph, v));
    t.count('visits');
    yield t.step(`Visit ${L(graph, v)}: mark it visited and add it to the order.`, {
      line: 6,
      current: [v],
      ...view(),
    });

    if (v === target) {
      yield reachedTarget(s, source, target, 'DFS', 7);
      return { ok: true, summary: `DFS reached ${L(graph, target)}.` };
    }

    // Pushing the neighbours last-first means the first neighbour ends up on
    // top, so the visit order matches the recursive DFS you would write on paper.
    const neighbours = graph.neighbours(v).reverse();
    for (const u of neighbours) {
      t.count('edge checks');
      if (visited.has(u)) {
        yield t.step(
          `${L(graph, u)} is a neighbour of ${L(graph, v)} but is already visited, so it is not pushed.`,
          {
            line: 9,
            current: [v],
            edge: [v, u],
            ...view(),
          },
        );
        continue;
      }
      stack.push({ v: u, from: v });
      t.count('pushes');
      yield t.step(
        `Push ${L(graph, u)}, a neighbour of ${L(graph, v)} that is not visited yet.${
          explainedOrder
            ? ''
            : ' Neighbours are pushed last first, so the first one ends up on top. That keeps the order the same as recursive DFS.'
        }`,
        { line: 9, current: [v], edge: [v, u], ...view() },
      );
      explainedOrder = true;
    }
  }

  yield exhausted(s, source, target, 'DFS', visited);
  return { ok: true, summary: `DFS order: ${t.order.join(' ')}` };
}
