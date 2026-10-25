// Priority queue renderer: the same heap drawn twice, as a tree and as the
// array that actually stores it. Both views highlight the same entries, so the
// learner can link parent = ⌊(i − 1) / 2⌋ to the picture.

import { EMPTY_FLAG, type StepRecord } from '../core/types';
import type { HeapSnapshot } from '../models/MinHeap';
import { EmptyStage } from './BstView';
import { layoutHeap } from './layout/treeLayout';
import { markOf } from './marks';
import { NodeGlyph } from './NodeGlyph';
import { useTween } from './useTween';
import { fitStyle } from './size';

interface Props {
  snapshot: HeapSnapshot;
  step: StepRecord<HeapSnapshot> | null;
}

export function HeapView({ snapshot, step }: Props) {
  const layout = layoutHeap(snapshot);
  const pos = useTween(layout.pos);
  const cells = useTween(layout.cells);
  const items = snapshot.items;

  if (items.length === 0) {
    const flagged = step?.marks?.[EMPTY_FLAG];
    return (
      <EmptyStage
        title={flagged === 'error' ? 'Nothing to take out' : 'The priority queue is empty'}
        body="Add entries on the left as value:priority, or enqueue one at a time to watch it bubble up."
      />
    );
  }

  const w = layout.cellWidth;

  return (
    <svg
      className="stage__svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={fitStyle(layout.width)}
      role="img"
      aria-label={`Min heap with ${items.length} entries, drawn as a tree and as an array`}
    >
      <g className="edges">
        {layout.edges.map(({ from, to }) => {
          const a = pos[from];
          const b = pos[to];
          return a && b ? (
            <line key={`${from}-${to}`} className="edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ) : null;
        })}
      </g>

      <g className="nodes">
        {items.map((e, i) => {
          const p = pos[e.id];
          if (!p) return null;
          const mark = markOf(e.id, step);
          return (
            <g key={e.id}>
              <NodeGlyph
                x={p.x}
                y={p.y}
                label={String(e.priority)}
                name={`value ${e.value} with priority ${e.priority}, index ${i}`}
                mark={mark}
              />
              <g className="value-tag" transform={`translate(${p.x + 21} ${p.y - 19})`}>
                <rect x={0} y={-10} width={String(e.value).length * 7.5 + 12} height={20} rx={6} />
                <text x={6} dy="0.35em">
                  {e.value}
                </text>
              </g>
            </g>
          );
        })}
      </g>

      <g className="array" aria-hidden="true">
        <text className="array__caption" x={layout.width / 2} y={layout.arrayY - 46}>
          Stored as an array
        </text>
        {items.map((_, i) => {
          const x = (layout.width - items.length * w) / 2 + i * w;
          return (
            <g key={`slot-${i}`}>
              <text className="array__index" x={x + w / 2} y={layout.arrayY - 30}>
                {i}
              </text>
              <rect className="array__slot" x={x} y={layout.arrayY - 22} width={w} height={44} />
            </g>
          );
        })}
        {items.map((e) => {
          const c = cells[e.id];
          if (!c) return null;
          const mark = markOf(e.id, step);
          return (
            <g
              key={`cell-${e.id}`}
              className={`cell cell--${mark}`}
              transform={`translate(${c.x} ${c.y})`}
            >
              <rect x={-w / 2 + 3} y={-19} width={w - 6} height={38} rx={6} />
              <text className="cell__main" dy="-0.05em">
                p{e.priority}
              </text>
              <text className="cell__sub" dy="1.25em">
                {e.value}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
