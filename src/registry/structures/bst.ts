// Binary search tree: registry entry.

import { MAX_TREE_NODES } from '../../core/limits';
import { err, ok } from '../../core/result';
import { parseValueList } from '../../core/validate';
import { BinarySearchTree, type BstSnapshot } from '../../models/BinarySearchTree';
import {
  DELETE_CODE,
  INSERT_CODE,
  SEARCH_CODE,
  insert,
  remove,
  search,
} from '../../algorithms/bstOps';
import { TRAVERSAL_CODE, traverse, type TraversalKind } from '../../algorithms/bstTraversals';
import { distinctValues } from '../random';
import type { Complexity, OperationDef, StructureDef } from '../types';

type Op = OperationDef<BinarySearchTree, BstSnapshot>;

const HEIGHT_NOTE =
  'h is the height of the tree. A balanced tree has h close to log₂ n, but a chain built from sorted input has h = n − 1, so the worst case is O(n).';

const pathCost = (extra: string[]): Complexity => ({
  time: 'O(h)',
  space: 'O(1)',
  best: 'O(1)',
  average: 'O(log n)',
  notes: [
    HEIGHT_NOTE,
    'Space is O(1) because our loop only remembers the current node. Written recursively, the same search would use O(h) stack space.',
    ...extra,
  ],
  counter: 'comparisons',
});

const traversal = (kind: TraversalKind, label: string, blurb: string): Op => ({
  id: `bst.${kind}order`,
  label,
  signature: `${label.toLowerCase().replace('-', '')}()`,
  blurb,
  input: 'none',
  pace: 'stepped',
  complexity: {
    time: 'Θ(n)',
    space: 'O(h)',
    notes: [
      'Every node is entered once and visited once, whatever the shape of the tree.',
      'The call stack holds one call per level on the current path, so it never grows past h + 1 frames.',
    ],
    counter: 'visits',
  },
  pseudocode: TRAVERSAL_CODE[kind],
  run: (tree) => traverse(tree, kind),
});

const operations: Op[] = [
  {
    id: 'bst.insert',
    label: 'Insert',
    signature: 'insert(key)',
    blurb: 'Walk down from the root and hang the new key on the first empty link.',
    input: 'value',
    inputName: 'key',
    pace: 'stepped',
    complexity: pathCost(['Duplicates are refused, so a repeated key ends the walk early.']),
    pseudocode: INSERT_CODE,
    run: (tree, args) => insert(tree, args.value as number),
  },
  {
    id: 'bst.search',
    label: 'Search',
    signature: 'search(key)',
    blurb: 'Each comparison rules out a whole subtree.',
    input: 'value',
    inputName: 'key',
    pace: 'stepped',
    complexity: pathCost([]),
    pseudocode: SEARCH_CODE,
    run: (tree, args) => search(tree, args.value as number),
  },
  {
    id: 'bst.delete',
    label: 'Delete',
    signature: 'delete(key)',
    blurb: 'Find the key, then handle the leaf, one-child or two-children case.',
    input: 'value',
    inputName: 'key',
    pace: 'stepped',
    complexity: {
      ...pathCost([
        'The successor walk also follows a single downward path, so it adds at most h more steps.',
      ]),
    },
    pseudocode: DELETE_CODE,
    run: (tree, args) => remove(tree, args.value as number),
  },
  traversal('pre', 'Pre-order', 'Visit the node, then its left subtree, then its right.'),
  traversal('in', 'In-order', 'Left subtree, then the node, then right. Comes out sorted.'),
  traversal('post', 'Post-order', 'Both subtrees first, the node last.'),
];

export const bstDef: StructureDef<BinarySearchTree, BstSnapshot> = {
  id: 'bst',
  name: 'Binary search tree',
  shortName: 'BST',
  tagline: 'Smaller keys go left, larger keys go right.',
  intro:
    'Every node keeps smaller keys on its left and larger keys on its right. Watch how the shape, not just the size, decides how much work a search takes.',
  empty: () => new BinarySearchTree(),
  clone: (tree) => tree.clone(),
  snapshot: (tree) => tree.snapshot(),
  invariant: (tree) => tree.checkInvariant(),
  size: (tree) => tree.size,
  facts: (snap) => {
    const nodes = Object.values(snap.nodes);
    const depth = (id: string | null): number => {
      if (id === null) return -1;
      const n = snap.nodes[id];
      return n ? 1 + Math.max(depth(n.left), depth(n.right)) : -1;
    };
    const h = depth(snap.root);
    return [
      { label: 'Keys (n)', value: String(nodes.length) },
      { label: 'Height (h)', value: nodes.length === 0 ? 'empty' : String(h) },
      { label: 'Root', value: snap.root ? String(snap.nodes[snap.root].key) : 'none' },
    ];
  },
  operations,
  presets: [
    {
      id: 'balanced',
      label: 'Balanced, 7 keys',
      description: 'A full tree of height 2. Any search takes at most 3 comparisons.',
      build: () => BinarySearchTree.from([50, 30, 70, 20, 40, 60, 80]),
    },
    {
      id: 'chain',
      label: 'Chain from sorted input',
      description: 'The same kind of keys inserted in order. Height 7, so searches get slow.',
      build: () => BinarySearchTree.from([10, 20, 30, 40, 50, 60, 70, 80]),
    },
    {
      id: 'delete-cases',
      label: 'All three delete cases',
      description: 'Try deleting 20 (a leaf), 40 (one child) and 50 (two children).',
      build: () => BinarySearchTree.from([50, 30, 70, 20, 40, 60, 80, 35, 65, 75]),
    },
  ],
  random: () => BinarySearchTree.from(distinctValues(9)),
  quickAdd: {
    label: 'Add keys',
    placeholder: 'e.g. 50 30 70',
    hint: 'Inserted in the order you type them, without stepping.',
    button: 'Add keys',
    apply: (tree, text) => {
      const parsed = parseValueList(text, 'key');
      if (!parsed.ok) return err(parsed.error);
      const added: number[] = [];
      const skipped: number[] = [];
      for (const key of parsed.value) {
        if (tree.size >= MAX_TREE_NODES) {
          return ok({
            model: tree,
            message: `Added ${added.join(', ') || 'nothing'}. Stopped at ${MAX_TREE_NODES} keys, the most we can draw clearly.`,
          });
        }
        if (tree.insert(key).ok) added.push(key);
        else skipped.push(key);
      }
      const parts = [];
      if (added.length) parts.push(`Added ${added.join(', ')}.`);
      if (skipped.length) {
        parts.push(`Skipped ${skipped.join(', ')}: already in the tree, and keys must be unique.`);
      }
      return ok({ model: tree, message: parts.join(' ') });
    },
  },
};
