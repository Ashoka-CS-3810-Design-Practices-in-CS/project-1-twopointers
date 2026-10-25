// Binary search tree renderer. Reads a snapshot and the current step, draws
// nodes keyed by their stable ids, and animates them between layouts.

import { edgeKey } from '../core/ids';
import type { StepRecord } from '../core/types';
import type { BstSnapshot } from '../models/BinarySearchTree';
import { layoutBst } from './layout/treeLayout';
import { markOf } from './marks';
import { NodeGlyph } from './NodeGlyph';
import { useTween } from './useTween';
import { fitStyle } from './size';

interface Props {
  snapshot: BstSnapshot;
  step: StepRecord<BstSnapshot> | null;
}

export function BstView({ snapshot, step }: Props) {
  const layout = layoutBst(snapshot);
  const pos = useTween(layout.pos);
  const nodes = Object.values(snapshot.nodes);

  if (nodes.length === 0) {
    return (
      <EmptyStage
        title="The tree is empty"
        body="Add keys on the left, or load one of the examples. The first key becomes the root."
      />
    );
  }

  return (
    <svg
      className="stage__svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={fitStyle(layout.width)}
      role="img"
      aria-label={`Binary search tree with ${nodes.length} keys`}
    >
      <g className="edges">
        {layout.edges.map(({ from, to }) => {
          const a = pos[from];
          const b = pos[to];
          if (!a || !b) return null;
          const mark = step?.edgeMarks?.[edgeKey(from, to)];
          return (
            <line
              key={`${from}-${to}`}
              className={`edge${mark ? ` edge--${mark}` : ''}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
            />
          );
        })}
      </g>
      <g className="nodes">
        {nodes.map((n) => {
          const p = pos[n.id];
          if (!p) return null;
          return (
            <NodeGlyph
              key={n.id}
              x={p.x}
              y={p.y}
              label={String(n.key)}
              name={`key ${n.key}`}
              mark={markOf(n.id, step)}
              tags={snapshot.root === n.id ? [{ text: 'root', tone: 'ink' }] : []}
            />
          );
        })}
      </g>
    </svg>
  );
}

export function EmptyStage({ title, body }: { title: string; body: string }) {
  return (
    <div className="stage__empty">
      <p className="stage__empty-title">{title}</p>
      <p>{body}</p>
    </div>
  );
}
