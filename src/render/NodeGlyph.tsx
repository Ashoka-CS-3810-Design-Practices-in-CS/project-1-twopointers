// One round node: body, label, a tick when visited, and a caption naming its
// state. Used by the tree, heap and graph views so they all speak the same
// visual language.

import { CAPTION, DESCRIPTION, type VisualMark } from './marks';

interface NodeGlyphProps {
  x: number;
  y: number;
  r?: number;
  label: string;
  mark: VisualMark;
  /** Spoken name, e.g. "node 40". The state is appended automatically. */
  name: string;
  /** Extra tags drawn above the node, like "start" or "root". */
  tags?: { text: string; tone: 'garnet' | 'moss' | 'ink' }[];
  selected?: boolean;
  showCaption?: boolean;
}

export function Pill({ x, y, text, tone }: { x: number; y: number; text: string; tone: string }) {
  const width = text.length * 6.6 + 14;
  return (
    <g className={`pill pill--${tone}`} transform={`translate(${x} ${y})`}>
      <rect x={-width / 2} y={-9} width={width} height={18} rx={9} />
      <text dy="0.35em">{text}</text>
    </g>
  );
}

export function NodeGlyph({
  x,
  y,
  r = 22,
  label,
  mark,
  name,
  tags = [],
  selected = false,
  showCaption = true,
}: NodeGlyphProps) {
  const caption = showCaption ? CAPTION[mark] : undefined;
  const spoken = mark === 'none' ? name : `${name}, ${DESCRIPTION[mark]}`;
  return (
    <g
      className={`node node--${mark}${selected ? ' node--selected' : ''}`}
      transform={`translate(${x} ${y})`}
    >
      <title>{spoken}</title>
      <circle className="node__halo" r={r + 6} />
      {selected && <circle className="node__select" r={r + 10} />}
      <circle className="node__body" r={r} />
      <text className="node__label" dy="0.35em" fontSize={label.length > 3 ? 12.5 : 15}>
        {label}
      </text>
      {mark === 'visited' && (
        <g className="node__tick" transform={`translate(${r * 0.72} ${-r * 0.72})`}>
          <circle r={8} />
          <path d="M-3.6 0.2 L-1 2.8 L3.8 -2.6" />
        </g>
      )}
      {caption && <Pill x={0} y={r + 17} text={caption} tone={`mark-${mark}`} />}
      {tags.map((tag, i) => (
        <Pill key={tag.text} x={0} y={-r - 15 - i * 21} text={tag.text} tone={tag.tone} />
      ))}
    </g>
  );
}
