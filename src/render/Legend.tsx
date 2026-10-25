// "What the colours mean", drawn with the same classes as the real diagram
// so the legend can never drift out of sync with it.

import type { StructureId } from '../core/types';
import { DESCRIPTION, type VisualMark } from './marks';

const MARKS: Record<StructureId, VisualMark[]> = {
  bst: ['current', 'path', 'visited', 'waiting', 'found', 'new', 'leaving', 'successor'],
  graph: ['current', 'waiting', 'visited', 'found', 'unreachable'],
  heap: ['current', 'compare', 'swap', 'new', 'leaving', 'found'],
  stack: ['new', 'leaving', 'found'],
  queue: ['new', 'leaving', 'found'],
};

export function Legend({ structure }: { structure: StructureId }) {
  return (
    <ul className="legend" aria-label="Legend">
      {MARKS[structure].map((mark) => (
        <li key={mark}>
          <svg viewBox="-16 -16 32 32" aria-hidden="true">
            <g className={`node node--${mark}`}>
              <circle className="node__body" r={10} />
            </g>
          </svg>
          <span>{DESCRIPTION[mark]}</span>
        </li>
      ))}
      {structure === 'graph' && (
        <>
          <li>
            <svg viewBox="0 -8 32 16" aria-hidden="true">
              <line className="edge edge--check" x1={2} x2={30} y1={0} y2={0} />
            </svg>
            <span>edge being checked</span>
          </li>
          <li>
            <svg viewBox="0 -8 32 16" aria-hidden="true">
              <line className="edge edge--tree" x1={2} x2={30} y1={0} y2={0} />
            </svg>
            <span>edge used to discover a vertex</span>
          </li>
        </>
      )}
    </ul>
  );
}
