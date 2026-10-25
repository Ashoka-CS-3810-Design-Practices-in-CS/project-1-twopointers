// Stack renderer: slots stacked bottom to top, with the index of each slot on
// the left and the top pointer on the right. Only a few empty slots are drawn
// above the top so a capacity of 30 still fits on screen.

import { EMPTY_FLAG, type StepRecord } from '../core/types';
import type { StackSnapshot } from '../models/Stack';
import { CAPTION, markOf } from './marks';
import { Pill } from './NodeGlyph';
import { fitStyle } from './size';

interface Props {
  snapshot: StackSnapshot;
  step: StepRecord<StackSnapshot> | null;
}

const SLOT_H = 46;
const SLOT_W = 180;
const EXTRA_EMPTY = 3;

export function StackView({ snapshot, step }: Props) {
  const { items, capacity } = snapshot;
  const visible = Math.min(capacity, items.length + EXTRA_EMPTY);
  const hidden = capacity - visible;
  const width = 440;
  const cx = width / 2;
  const top = hidden > 0 ? 70 : 44;
  const floorY = top + visible * SLOT_H;
  const height = floorY + 96;
  const topIndex = items.length - 1;
  const slotY = (i: number) => floorY - (i + 1) * SLOT_H;
  const emptyMark = step?.marks?.[EMPTY_FLAG];
  const pointerY = topIndex >= 0 ? slotY(topIndex) + SLOT_H / 2 : floorY + 16;

  return (
    <svg
      className="stage__svg"
      viewBox={`0 0 ${width} ${height}`}
      style={fitStyle(width)}
      role="img"
      aria-label={`Stack holding ${items.length} of ${capacity} values${topIndex >= 0 ? `, ${items[topIndex].value} on top` : ''}`}
    >
      {hidden > 0 && (
        <text className="stage__note" x={cx} y={top - 22}>
          {hidden} more empty slot{hidden === 1 ? '' : 's'} up to capacity {capacity}
        </text>
      )}

      {Array.from({ length: visible }, (_, i) => (
        <g key={`slot-${i}`}>
          <rect
            className="slot-frame"
            x={cx - SLOT_W / 2}
            y={slotY(i) + 3}
            width={SLOT_W}
            height={SLOT_H - 6}
            rx={8}
          />
          <text className="slot-index" x={cx - SLOT_W / 2 - 16} y={slotY(i) + SLOT_H / 2}>
            {i}
          </text>
        </g>
      ))}

      {items.map((item, i) => {
        const mark = markOf(item.id, step);
        const caption = CAPTION[mark];
        return (
          <g key={item.id} transform={`translate(${cx} ${slotY(i) + SLOT_H / 2})`}>
            <g className={`slot slot--${mark}`}>
              <title>{`index ${i}, value ${item.value}${caption ? `, ${caption}` : ''}`}</title>
              <rect
                x={-SLOT_W / 2 + 4}
                y={-SLOT_H / 2 + 6}
                width={SLOT_W - 8}
                height={SLOT_H - 12}
                rx={7}
              />
              <text className="slot__value" dy="0.35em">
                {item.value}
              </text>
              {caption && <Pill x={-SLOT_W / 2 - 66} y={0} text={caption} tone={`mark-${mark}`} />}
            </g>
          </g>
        );
      })}

      <line
        className="floor"
        x1={cx - SLOT_W / 2 - 22}
        x2={cx + SLOT_W / 2 + 22}
        y1={floorY}
        y2={floorY}
      />

      <g
        className="pointer pointer--top"
        transform={`translate(${cx + SLOT_W / 2 + 14} ${pointerY})`}
      >
        <path d="M0 0 L14 -7 L14 7 Z" />
        <line x1={14} x2={34} y1={0} y2={0} />
        <text x={40} dy="0.35em">
          top = {topIndex}
        </text>
      </g>

      <g transform={`translate(${cx} ${floorY + 52})`}>
        <Pill
          x={0}
          y={0}
          text={`isEmpty() = ${items.length === 0}`}
          tone={emptyMark ? `mark-${emptyMark}` : 'quiet'}
        />
      </g>
    </svg>
  );
}
