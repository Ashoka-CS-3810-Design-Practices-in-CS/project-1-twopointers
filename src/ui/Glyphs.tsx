// Small drawings of each structure for the home page and the compare page.

import type { StructureId } from '../core/types';

const dot = (cx: number, cy: number, hot = false) => (
  <circle
    key={`${cx}-${cy}`}
    cx={cx}
    cy={cy}
    r={6.5}
    className={hot ? 'glyph__hot' : 'glyph__dot'}
  />
);

export function Glyph({ id }: { id: StructureId }) {
  return (
    <svg className="glyph" viewBox="0 0 96 64" aria-hidden="true">
      {id === 'bst' && (
        <g>
          <path
            d="M48 12 L28 32 M48 12 L68 32 M28 32 L18 52 M28 32 L38 52 M68 32 L78 52"
            className="glyph__line"
          />
          {dot(48, 12)}
          {dot(28, 32, true)}
          {dot(68, 32)}
          {dot(18, 52)}
          {dot(38, 52)}
          {dot(78, 52)}
        </g>
      )}
      {id === 'graph' && (
        <g>
          <path
            d="M14 34 L38 14 M14 34 L38 52 M38 14 L62 32 M38 52 L62 32 M62 32 L84 22 M38 14 L38 52"
            className="glyph__line"
          />
          {dot(14, 34, true)}
          {dot(38, 14)}
          {dot(38, 52)}
          {dot(62, 32)}
          {dot(84, 22)}
        </g>
      )}
      {id === 'heap' && (
        <g>
          <path d="M48 10 L32 26 M48 10 L64 26 M32 26 L24 40" className="glyph__line" />
          {dot(48, 10, true)}
          {dot(32, 26)}
          {dot(64, 26)}
          {dot(24, 40)}
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={22 + i * 13}
              y={48}
              width={12}
              height={11}
              rx={2}
              className={i === 0 ? 'glyph__hot' : 'glyph__box'}
            />
          ))}
        </g>
      )}
      {id === 'stack' && (
        <g>
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={30}
              y={46 - i * 14}
              width={36}
              height={11}
              rx={3}
              className={i === 2 ? 'glyph__hot' : 'glyph__box'}
            />
          ))}
          <path d="M24 60 L72 60" className="glyph__line" />
          <path d="M78 22 L70 22 M74 18 L70 22 L74 26" className="glyph__line" />
        </g>
      )}
      {id === 'queue' && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={12 + i * 15}
              y={22}
              width={13}
              height={18}
              rx={3}
              className={i === 1 ? 'glyph__hot' : i < 4 ? 'glyph__box' : 'glyph__empty'}
            />
          ))}
          <path d="M82 46 C 82 58, 18 58, 18 46" className="glyph__line" fill="none" />
          <path d="M14 50 L18 45 L22 50" className="glyph__line" fill="none" />
        </g>
      )}
    </svg>
  );
}
