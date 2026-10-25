// Circular queue renderer: every slot of the buffer in one row, with front
// and rear markers underneath and an arrow showing where the end wraps back
// to slot 0. Values stay in their slots; only the markers move, which is the
// whole reason a circular buffer gives O(1) dequeue.

import { EMPTY_FLAG, type StepRecord } from '../core/types';
import type { QueueSnapshot } from '../models/CircularQueue';
import { CAPTION, markOf } from './marks';
import { Pill } from './NodeGlyph';
import { fitStyle } from './size';

interface Props {
  snapshot: QueueSnapshot;
  step: StepRecord<QueueSnapshot> | null;
}

export function QueueView({ snapshot, step }: Props) {
  const { capacity, slots, front, rear, count } = snapshot;
  const cellW = capacity <= 10 ? 66 : capacity <= 16 ? 54 : 46;
  const cellH = 56;
  const left = 40;
  const width = Math.max(440, capacity * cellW + left * 2);
  const rowY = 86;
  const x = (i: number) => left + i * cellW;
  const empty = count === 0;
  const emptyMark = step?.marks?.[EMPTY_FLAG];

  const markerY = rowY + cellH / 2 + 18;
  const sameSlot = front === rear;
  const wrapY = markerY + (sameSlot ? 64 : 46);
  const height = wrapY + 92;

  return (
    <svg
      className="stage__svg"
      viewBox={`0 0 ${width} ${height}`}
      style={fitStyle(width)}
      role="img"
      aria-label={`Circular queue with ${count} of ${capacity} slots used. Front is slot ${front}, rear is slot ${rear}.`}
    >
      <defs>
        <marker
          id="wrap-arrow"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" className="wrap-arrow__head" />
        </marker>
      </defs>

      {slots.map((_, i) => (
        <g key={`slot-${i}`}>
          <text className="slot-index" x={x(i) + cellW / 2} y={rowY - cellH / 2 - 12}>
            {i}
          </text>
          <rect
            className="slot-frame"
            x={x(i) + 3}
            y={rowY - cellH / 2}
            width={cellW - 6}
            height={cellH}
            rx={8}
          />
        </g>
      ))}

      {slots.map((item, i) => {
        if (!item) return null;
        const mark = markOf(item.id, step);
        const caption = CAPTION[mark];
        return (
          <g key={item.id} transform={`translate(${x(i) + cellW / 2} ${rowY})`}>
            <g className={`slot slot--${mark}`}>
              <title>{`slot ${i}, value ${item.value}${caption ? `, ${caption}` : ''}`}</title>
              <rect
                x={-cellW / 2 + 6}
                y={-cellH / 2 + 4}
                width={cellW - 12}
                height={cellH - 8}
                rx={7}
              />
              <text className="slot__value" dy="0.35em">
                {item.value}
              </text>
              {caption && <Pill x={0} y={-cellH / 2 - 34} text={caption} tone={`mark-${mark}`} />}
            </g>
          </g>
        );
      })}

      <Marker
        x={x(front) + cellW / 2}
        y={markerY}
        label={empty ? 'front (empty)' : 'front'}
        tone="front"
      />
      <Marker x={x(rear) + cellW / 2} y={markerY + (sameSlot ? 22 : 0)} label="rear" tone="rear" />

      <path
        className="wrap-arc"
        d={`M ${x(capacity - 1) + cellW / 2} ${wrapY - 14} C ${x(capacity - 1) + cellW / 2} ${wrapY + 26}, ${x(0) + cellW / 2} ${wrapY + 26}, ${x(0) + cellW / 2} ${wrapY - 14}`}
        markerEnd="url(#wrap-arrow)"
      />
      <text className="stage__note" x={width / 2} y={wrapY + 36}>
        after slot {capacity - 1}, the next slot is 0
      </text>

      <g transform={`translate(${width / 2} ${wrapY + 66})`}>
        <Pill x={-80} y={0} text={`count = ${count}`} tone="quiet" />
        <Pill
          x={70}
          y={0}
          text={`isEmpty() = ${empty}`}
          tone={emptyMark ? `mark-${emptyMark}` : 'quiet'}
        />
      </g>
    </svg>
  );
}

function Marker({ x, y, label, tone }: { x: number; y: number; label: string; tone: string }) {
  return (
    <g className={`qmarker qmarker--${tone}`} transform={`translate(${x} ${y})`}>
      <path d="M0 -12 L-6 -3 L6 -3 Z" />
      <text dy="0.9em">{label}</text>
    </g>
  );
}
