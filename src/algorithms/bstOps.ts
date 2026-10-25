// BST search, insert and delete as step generators (A2, sections 2.5 and 2.6).
//
// All three start with the same walk down from the root, so that walk lives
// in descend() and the others reuse it with yield*. The message on each
// compare step explains the move that got us there, which means the reasoning
// is still on screen when Guess mode is off and the questions are skipped.

import { edgeKey } from '../core/ids';
import { MAX_TREE_NODES } from '../core/limits';
import type { EdgeMark, Frontier, Id, Mark, StepGenerator, StepRecord } from '../core/types';
import type { BinarySearchTree, BstSnapshot, Side } from '../models/BinarySearchTree';
import { Tracer } from './tracer';

type Gen = StepGenerator<BstSnapshot, BinarySearchTree>;

export const SEARCH_CODE = [
  'search(key):',
  '  node ← root',
  '  while node ≠ nil:',
  '    if key = node.key: return node',
  '    if key < node.key: node ← node.left',
  '    else: node ← node.right',
  '  return not found',
];

export const INSERT_CODE = [
  'insert(key):',
  '  parent ← nil; node ← root',
  '  while node ≠ nil:',
  '    if key = node.key: reject duplicate',
  '    parent ← node',
  '    if key < node.key: node ← node.left',
  '    else: node ← node.right',
  '  attach key as a child of parent',
];

export const DELETE_CODE = [
  'delete(key):',
  '  target ← search(key)',
  '  if target = nil: nothing to delete',
  '  if target.left = nil:',
  '    replace target by target.right',
  '  else if target.right = nil:',
  '    replace target by target.left',
  '  else:',
  '    succ ← leftmost node of target.right',
  '    copy succ.key into target',
  '    replace succ by succ.right',
];

interface Descent {
  found: Id | null;
  parent: Id | null;
  side: Side | null;
  path: Id[];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function pathView(tree: BinarySearchTree, path: Id[]) {
  const frontier: Frontier = {
    title: 'Search path',
    ids: [...path],
    labels: path.map((id) => String(tree.keyOf(id))),
  };
  const edgeMarks: Record<string, EdgeMark> = {};
  const marks: Record<Id, Mark> = {};
  path.forEach((id, i) => {
    marks[id] = 'path';
    if (i > 0) edgeMarks[edgeKey(path[i - 1], id)] = 'path';
  });
  return { frontier, edgeMarks, marks };
}

/** Walks from the root towards key, one compare (and one question) per level. */
function* descend(
  tree: BinarySearchTree,
  key: number,
  t: Tracer<BstSnapshot>,
  lines: { compare: number; ask: number },
): Generator<StepRecord<BstSnapshot>, Descent> {
  const path: Id[] = [];
  let parent: Id | null = null;
  let side: Side | null = null;
  let cur = tree.root;
  let lead = 'Start at the root. ';

  while (cur !== null) {
    const node = tree.node(cur);
    path.push(cur);
    t.count('comparisons');
    yield t.step(`${lead}Compare ${key} with ${node.key}.`, {
      line: lines.compare,
      current: [cur],
      ...pathView(tree, path),
    });
    if (key === node.key) return { found: cur, parent, side, path };

    const dir: Side = key < node.key ? 'left' : 'right';
    yield t.ask(
      {
        prompt: `${key} vs ${node.key}. Go left or right?`,
        options: [
          { id: 'left', label: 'Left' },
          { id: 'right', label: 'Right' },
        ],
        answer: dir,
        reason:
          dir === 'left'
            ? `${key} is smaller than ${node.key}, and every smaller key lives in the left subtree.`
            : `${key} is larger than ${node.key}, and every larger key lives in the right subtree.`,
      },
      { line: lines.ask, current: [cur], ...pathView(tree, path) },
    );

    parent = cur;
    side = dir;
    const next = node[dir];
    lead =
      next === null
        ? ''
        : `${key} ${dir === 'left' ? '<' : '>'} ${node.key}, so go ${dir} to ${tree.keyOf(next)}. `;
    cur = next;
  }
  return { found: null, parent, side, path };
}

function ranOffMessage(tree: BinarySearchTree, key: number, d: Descent): string {
  const p = tree.node(d.parent as Id);
  const sign = d.side === 'left' ? '<' : '>';
  return `${key} ${sign} ${p.key}, but ${p.key} has no ${d.side} child.`;
}

export function* search(tree: BinarySearchTree, key: number): Gen {
  const t = new Tracer(() => tree.snapshot(), ['comparisons']);
  if (tree.root === null) {
    yield t.step(`The tree is empty, so ${key} cannot be in it. Insert a few keys first.`, {
      line: 7,
      tone: 'warn',
      final: true,
      result: `search(${key}): not found`,
    });
    return { ok: true, summary: 'Empty tree.' };
  }

  const d = yield* descend(tree, key, t, { compare: 4, ask: 5 });
  const used = plural(t.counters.comparisons, 'comparison');
  const h = tree.height();

  if (d.found) {
    const view = pathView(tree, d.path);
    yield t.step(
      `Found ${key} after ${used}. The tree has height ${h}, so no search here can take more than ${h + 1}.`,
      {
        line: 4,
        current: [d.found],
        ...view,
        marks: { ...view.marks, [d.found]: 'found' },
        tone: 'good',
        final: true,
        result: `search(${key}) found it`,
      },
    );
    return { ok: true, summary: `Found ${key}.` };
  }

  yield t.step(
    `${ranOffMessage(tree, key, d)} The search has run off the tree, so ${key} is not here. That took ${used}.`,
    {
      line: 7,
      current: [d.parent as Id],
      ...pathView(tree, d.path),
      tone: 'warn',
      final: true,
      result: `search(${key}): not found`,
    },
  );
  return { ok: true, summary: `${key} is not in the tree.` };
}

export function* insert(tree: BinarySearchTree, key: number): Gen {
  const t = new Tracer(() => tree.snapshot(), ['comparisons', 'links']);

  if (tree.size >= MAX_TREE_NODES) {
    yield t.step(
      `The tree already holds ${MAX_TREE_NODES} keys, the most we can draw clearly. Delete a key or clear the tree before inserting ${key}.`,
      { line: 1, tone: 'bad', final: true },
    );
    return { ok: false, reason: 'tree is at its size limit' };
  }

  if (tree.root === null) {
    const id = tree.attach(null, 'left', key);
    t.count('links');
    yield t.step(`The tree is empty, so ${key} becomes the root.`, {
      line: 8,
      current: [id],
      marks: { [id]: 'new' },
      tone: 'good',
      final: true,
    });
    return { ok: true, model: tree, summary: `Inserted ${key} as the root.` };
  }

  const d = yield* descend(tree, key, t, { compare: 4, ask: 6 });

  if (d.found) {
    const view = pathView(tree, d.path);
    yield t.step(
      `${key} is already in the tree. Keys are unique here, so a second ${key} has nowhere to go. The tree is unchanged.`,
      {
        line: 4,
        current: [d.found],
        ...view,
        marks: { ...view.marks, [d.found]: 'error' },
        tone: 'bad',
        final: true,
      },
    );
    return { ok: false, reason: 'duplicate key' };
  }

  const id = tree.attach(d.parent, d.side as Side, key);
  t.count('links');
  const p = tree.node(d.parent as Id);
  const view = pathView(tree, [...d.path, id]);
  yield t.step(
    `${ranOffMessage(tree, key, d)} So ${key} becomes the ${d.side} child of ${p.key}. Inserted at depth ${tree.depth(id)} after ${plural(t.counters.comparisons, 'comparison')}.`,
    {
      line: 8,
      current: [id],
      ...view,
      marks: { ...view.marks, [id]: 'new' },
      tone: 'good',
      final: true,
    },
  );
  return { ok: true, model: tree, summary: `Inserted ${key}.` };
}

type DeleteCase = 'leaf' | 'one' | 'two';

export function* remove(tree: BinarySearchTree, key: number): Gen {
  const t = new Tracer(() => tree.snapshot(), ['comparisons', 'links']);

  if (tree.root === null) {
    yield t.step('The tree is empty, so there is nothing to delete.', {
      line: 3,
      tone: 'warn',
      final: true,
    });
    return { ok: true, summary: 'Empty tree.' };
  }

  const d = yield* descend(tree, key, t, { compare: 2, ask: 2 });

  if (!d.found) {
    yield t.step(
      `${ranOffMessage(tree, key, d)} So ${key} is not in the tree and there is nothing to delete. The tree is unchanged.`,
      { line: 3, current: [d.parent as Id], ...pathView(tree, d.path), tone: 'warn', final: true },
    );
    return { ok: true, summary: `${key} was not in the tree.` };
  }

  const z = tree.node(d.found);
  const parentKey = z.parent === null ? null : tree.keyOf(z.parent);
  const kind: DeleteCase =
    z.left === null && z.right === null
      ? 'leaf'
      : z.left !== null && z.right !== null
        ? 'two'
        : 'one';
  const onlyChild = z.left ?? z.right;

  yield t.step(`Found ${key}. Before changing any links, work out which deletion case applies.`, {
    line: 3,
    current: [z.id],
    marks: { [z.id]: 'found' },
  });

  yield t.ask(
    {
      prompt: `Which case is deleting ${key}?`,
      options: [
        { id: 'leaf', label: 'A leaf, no children' },
        { id: 'one', label: 'Exactly one child' },
        { id: 'two', label: 'Two children' },
      ],
      answer: kind,
      reason:
        kind === 'leaf'
          ? `${key} has no children, so it can simply be cut off.`
          : kind === 'one'
            ? `${key} has exactly one child (${tree.keyOf(onlyChild)}), so that child can move up into its place.`
            : `${key} has two children (${tree.keyOf(z.left)} and ${tree.keyOf(z.right)}), so it needs a replacement that keeps the order on both sides.`,
    },
    { line: 4, current: [z.id], marks: { [z.id]: 'found' } },
  );

  if (kind === 'leaf') {
    yield t.step(
      parentKey === null
        ? `Case 1: ${key} is a leaf and also the root, so removing it leaves an empty tree.`
        : `Case 1: ${key} is a leaf. Set the link from ${parentKey} to nil, which cuts ${key} off.`,
      { line: 5, current: [z.id], marks: { [z.id]: 'leaving' } },
    );
    tree.transplant(z.id, null);
    tree.forget(z.id);
    t.count('links');
    return yield* finishDelete(tree, t, key, 5);
  }

  if (kind === 'one') {
    const child = onlyChild as Id;
    const childSide = z.left === null ? 'right' : 'left';
    yield t.step(
      `Case 2: ${key} has only a ${childSide} child, ${tree.keyOf(child)}. Link ${tree.keyOf(child)} straight to ${
        parentKey === null ? 'the root position' : parentKey
      }, skipping over ${key}.`,
      {
        line: z.left === null ? 5 : 7,
        current: [z.id],
        marks: { [z.id]: 'leaving', [child]: 'path' },
      },
    );
    tree.transplant(z.id, child);
    tree.forget(z.id);
    t.count('links');
    return yield* finishDelete(tree, t, key, z.left === null ? 5 : 7, child);
  }

  // Case 3: two children. Find the in-order successor, copy it up, remove it.
  yield t.step(
    `Case 3: ${key} has two children. Its replacement must be larger than everything on the left and smaller than everything on the right. That is the in-order successor: the smallest key in the right subtree.`,
    { line: 9, current: [z.id], marks: { [z.id]: 'found' } },
  );

  let s = z.right as Id;
  const walk: Id[] = [s];
  const walkView = () => ({
    frontier: {
      title: 'Successor walk',
      ids: [...walk],
      labels: walk.map((id) => String(tree.keyOf(id))),
    },
  });
  yield t.step(`Step into the right subtree of ${key}, at ${tree.keyOf(s)}.`, {
    line: 9,
    current: [s],
    marks: { [z.id]: 'found' },
    ...walkView(),
  });
  while (tree.node(s).left !== null) {
    const from = tree.keyOf(s);
    s = tree.node(s).left as Id;
    walk.push(s);
    t.count('comparisons');
    yield t.step(
      `${from} has a left child, so a smaller key exists. Go left to ${tree.keyOf(s)}.`,
      {
        line: 9,
        current: [s],
        marks: { [z.id]: 'found' },
        ...walkView(),
      },
    );
  }

  const succKey = tree.keyOf(s) as number;
  yield t.step(
    `${succKey} has no left child, so it is the smallest key on the right: the successor.`,
    {
      line: 9,
      current: [s],
      marks: { [z.id]: 'found', [s]: 'successor' },
      ...walkView(),
    },
  );

  tree.setKey(z.id, succKey);
  yield t.step(
    `Copy ${succKey} into the node that held ${key}. For one step ${succKey} appears twice; the old copy goes next.`,
    { line: 10, current: [z.id], marks: { [z.id]: 'new', [s]: 'leaving' } },
  );

  const succRight = tree.node(s).right;
  tree.transplant(s, succRight);
  tree.forget(s);
  t.count('links');
  const lead =
    succRight === null
      ? `Remove the old ${succKey} node. It had no children, so this is case 1 again.`
      : `Remove the old ${succKey} node. Its right child ${tree.keyOf(succRight)} moves up into its place, which is case 2.`;
  return yield* finishDelete(tree, t, key, 11, succRight ?? undefined, lead);
}

function* finishDelete(
  tree: BinarySearchTree,
  t: Tracer<BstSnapshot>,
  key: number,
  line: number,
  moved?: Id,
  lead = '',
): Gen {
  const order = tree.inorderKeys();
  const tail =
    order.length === 0
      ? 'The tree is now empty.'
      : `The ordering rule still holds: in-order now reads ${order.join(' ')}.`;
  yield t.step(`${lead ? `${lead} ` : ''}Deleted ${key}. ${tail}`, {
    line,
    current: moved ? [moved] : [],
    marks: moved ? { [moved]: 'path' } : {},
    tone: 'good',
    final: true,
  });
  return { ok: true, model: tree, summary: `Deleted ${key}.` };
}
