// Pre-order, in-order and post-order as one recursive generator (A2, 2.7).
//
// The recursion is real: each call is a generator and we descend with
// yield*, so the language keeps every suspended call for us while the
// learner is looking at the screen. The call stack is shown beside the tree
// so they can see where in the recursion they are.

import type { Frontier, Id, Mark, StepGenerator } from '../core/types';
import type { BinarySearchTree, BstSnapshot } from '../models/BinarySearchTree';
import { Tracer, optionsFrom } from './tracer';

export type TraversalKind = 'pre' | 'in' | 'post';

type Gen = StepGenerator<BstSnapshot, BinarySearchTree>;

const NAMES: Record<TraversalKind, string> = { pre: 'preorder', in: 'inorder', post: 'postorder' };

export const TRAVERSAL_CODE: Record<TraversalKind, string[]> = {
  pre: [
    'preorder(node):',
    '  if node = nil: return',
    '  visit(node)',
    '  preorder(node.left)',
    '  preorder(node.right)',
  ],
  in: [
    'inorder(node):',
    '  if node = nil: return',
    '  inorder(node.left)',
    '  visit(node)',
    '  inorder(node.right)',
  ],
  post: [
    'postorder(node):',
    '  if node = nil: return',
    '  postorder(node.left)',
    '  postorder(node.right)',
    '  visit(node)',
  ],
};

// Which listing line each moment belongs to, per traversal.
const LINES: Record<TraversalKind, { visit: number; left: number; right: number }> = {
  pre: { visit: 3, left: 4, right: 5 },
  in: { visit: 4, left: 3, right: 5 },
  post: { visit: 5, left: 3, right: 4 },
};

const WHY_NOW: Record<TraversalKind, (key: number) => string> = {
  pre: (k) =>
    `Pre-order visits a node as soon as it is entered, before either subtree. We just entered ${k}.`,
  in: (k) =>
    `In-order visits a node once its whole left subtree is done. ${k}'s left side is finished, so ${k} comes next.`,
  post: (k) =>
    `Post-order visits a node only after both subtrees are done. Both sides of ${k} are finished, so ${k} comes next.`,
};

const CLOSING: Record<TraversalKind, string> = {
  pre: 'Pre-order lists every parent before its children, which is the order you would use to copy the tree.',
  in: 'In-order on a BST always comes out sorted, because every left key is smaller and every right key is larger.',
  post: 'Post-order lists children before their parent, which is the order you would use to free the tree safely.',
};

export function* traverse(tree: BinarySearchTree, kind: TraversalKind): Gen {
  const t = new Tracer(() => tree.snapshot(), ['visits', 'calls']);
  const name = NAMES[kind];
  const lines = LINES[kind];

  if (tree.root === null) {
    yield t.step(
      'The tree is empty, so the traversal has nothing to output. Add a few keys first.',
      {
        line: 2,
        tone: 'warn',
        final: true,
      },
    );
    return { ok: true, summary: 'Empty tree.' };
  }

  const calls: Id[] = [];
  const view = () => {
    const frontier: Frontier = {
      title: 'Call stack',
      ids: [...calls].reverse(),
      labels: [...calls].reverse().map((id) => `${name}(${tree.keyOf(id)})`),
      ends: ['top', 'bottom'],
    };
    // Calls that are suspended underneath the current one are "waiting".
    const marks: Record<Id, Mark> = {};
    for (const id of calls.slice(0, -1)) marks[id] = 'waiting';
    return { frontier, marks };
  };

  function* visit(id: Id): Generator<ReturnType<typeof t.step>, void> {
    const key = tree.keyOf(id) as number;
    const n = tree.node(id);
    // Plausible wrong answers: nearby nodes that have not been output yet.
    const pool = [id, n.left, n.right, n.parent].filter(
      (x): x is Id => x !== null && !t.visited.includes(x),
    );
    if (pool.length < 3) {
      const others = Object.values(tree.snapshot().nodes)
        .filter((o) => !t.visited.includes(o.id) && !pool.includes(o.id))
        .sort((a, b) => Math.abs(a.key - key) - Math.abs(b.key - key));
      for (const o of others) {
        if (pool.length >= 3) break;
        pool.push(o.id);
      }
    }
    const options = optionsFrom(
      pool,
      (x) => x,
      (x) => String(tree.keyOf(x)),
      (x) => tree.keyOf(x) as number,
    );
    if (options.length > 1) {
      yield t.ask(
        {
          prompt: 'Which key is added to the output next?',
          options,
          answer: id,
          reason: WHY_NOW[kind](key),
        },
        { line: lines.visit, current: [id], ...view() },
      );
    }
    t.visited.push(id);
    t.order.push(String(key));
    t.count('visits');
    yield t.step(`Visit ${key}: add it to the output.`, {
      line: lines.visit,
      current: [id],
      ...view(),
    });
  }

  function* walk(id: Id, from: string): Generator<ReturnType<typeof t.step>, void> {
    const n = tree.node(id);
    calls.push(id);
    t.count('calls');
    yield t.step(`${from}call ${name}(${n.key}).`, { line: 1, current: [id], ...view() });

    if (kind === 'pre') yield* visit(id);
    if (n.left !== null) yield* walk(n.left, `Go to the left child of ${n.key}: `);
    if (kind === 'in') yield* visit(id);
    if (n.right !== null) yield* walk(n.right, `Go to the right child of ${n.key}: `);
    if (kind === 'post') yield* visit(id);

    calls.pop();
    if (n.parent !== null) {
      const parentKey = tree.keyOf(n.parent);
      const isLeaf = n.left === null && n.right === null;
      yield t.step(
        isLeaf
          ? `${n.key} has no children, so its calls on nil return at once. Back to ${parentKey}.`
          : `The subtree under ${n.key} is finished. Return to ${parentKey}.`,
        {
          line: n.parent !== null && tree.node(n.parent).left === id ? lines.left : lines.right,
          current: [n.parent],
          ...view(),
        },
      );
    }
  }

  yield* walk(tree.root, 'Start at the root: ');

  yield t.step(`Done. ${capitalise(name)}: ${t.order.join(' ')}. ${CLOSING[kind]}`, {
    line: lines.visit,
    tone: 'good',
    final: true,
    result: `${name}: ${t.order.join(' ')}`,
  });
  return { ok: true, summary: `${capitalise(name)}: ${t.order.join(' ')}` };
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
