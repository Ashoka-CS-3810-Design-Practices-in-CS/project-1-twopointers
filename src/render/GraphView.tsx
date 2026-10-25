// Graph renderer and editor.
//
// While no operation is open the canvas is an editor: click empty space to
// add a vertex, drag from one vertex to another to join them, click a vertex
// or edge to select it, right-click a vertex to make it the start. During an
// operation the canvas only displays the step.
//
// The view never changes the graph itself. It reports what the learner did
// through callbacks and the controller decides whether that is allowed.

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { edgeKey } from '../core/ids';
import type { Id, StepRecord } from '../core/types';
import type { GraphSnapshot } from '../models/Graph';
import { markOf } from './marks';
import { NodeGlyph } from './NodeGlyph';
import { fitStyle } from './size';

export const GRAPH_W = 900;
export const GRAPH_H = 520;
const R = 22;

export type GraphSelection = { kind: 'vertex'; id: Id } | { kind: 'edge'; a: Id; b: Id } | null;

export interface GraphEditHandlers {
  onAddVertex(x: number, y: number): void;
  onConnect(a: Id, b: Id): void;
  onMove(id: Id, x: number, y: number): void;
  onSelect(selection: GraphSelection): void;
  onSetSource(id: Id): void;
}

interface Props extends Partial<GraphEditHandlers> {
  snapshot: GraphSnapshot;
  step: StepRecord<GraphSnapshot> | null;
  source: Id | null;
  target: Id | null;
  selection: GraphSelection;
  editable: boolean;
  dragMode: 'connect' | 'move';
}

interface Drag {
  from: Id;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function GraphView(props: Props) {
  const { snapshot, step, source, target, selection, editable, dragMode } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);

  // Window listeners outlive a single render, so they read the latest props
  // through a ref instead of a stale closure.
  const latest = useRef(props);
  latest.current = props;

  const byId = new Map(snapshot.vertices.map((v) => [v.id, v]));

  const toLocal = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const local = pt.matrixTransform(m.inverse());
    return { x: local.x, y: local.y };
  };

  const update = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  // A drag is followed on the whole window rather than with pointer capture.
  // That keeps working when the pointer leaves the canvas mid-drag and
  // behaves the same with a mouse, a trackpad or a finger.
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const p = toLocal(e.clientX, e.clientY);
      const moved = d.moved || Math.hypot(p.x - d.startX, p.y - d.startY) > 6;
      if (moved && latest.current.dragMode === 'move') {
        latest.current.onMove?.(
          d.from,
          clamp(p.x, R + 4, GRAPH_W - R - 4),
          clamp(p.y, R + 24, GRAPH_H - R - 24),
        );
      }
      update({ ...d, x: p.x, y: p.y, moved });
    };

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const { selection: sel, dragMode: mode, snapshot: snap } = latest.current;
      const p = toLocal(e.clientX, e.clientY);
      if (!d.moved) {
        const already = sel?.kind === 'vertex' && sel.id === d.from;
        latest.current.onSelect?.(already ? null : { kind: 'vertex', id: d.from });
      } else if (mode === 'connect') {
        const hit = snap.vertices.find(
          (v) => v.id !== d.from && Math.hypot(v.x - p.x, v.y - p.y) <= R + 8,
        );
        if (hit) latest.current.onConnect?.(d.from, hit.id);
      }
      update(null);
    };

    const onCancel = () => update(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [dragging]);

  const onVertexDown = (e: ReactPointerEvent, id: Id) => {
    if (!editable || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const p = toLocal(e.clientX, e.clientY);
    update({ from: id, startX: p.x, startY: p.y, x: p.x, y: p.y, moved: false });
  };

  const onBackgroundUp = (e: ReactPointerEvent) => {
    if (!editable || dragRef.current) return;
    if (selection) {
      props.onSelect?.(null);
      return;
    }
    const p = toLocal(e.clientX, e.clientY);
    props.onAddVertex?.(p.x, p.y);
  };

  const preview =
    drag && drag.moved && dragMode === 'connect'
      ? { from: byId.get(drag.from), x: drag.x, y: drag.y }
      : null;

  return (
    <svg
      ref={svgRef}
      className={`stage__svg graph${editable ? ' graph--editable' : ''}${editable && dragMode === 'move' ? ' graph--move' : ''}`}
      viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
      style={fitStyle(GRAPH_W)}
      role="img"
      aria-label={`Graph with ${snapshot.vertices.length} vertices and ${snapshot.edges.length} edges`}
    >
      <rect
        className="graph__hit"
        x={0}
        y={0}
        width={GRAPH_W}
        height={GRAPH_H}
        onPointerUp={onBackgroundUp}
      />

      {snapshot.vertices.length === 0 && (
        <text className="stage__note stage__note--big" x={GRAPH_W / 2} y={GRAPH_H / 2}>
          {editable ? 'Click anywhere here to place your first vertex' : 'The graph is empty'}
        </text>
      )}

      <g className="edges">
        {snapshot.edges.map(([a, b]) => {
          const va = byId.get(a);
          const vb = byId.get(b);
          if (!va || !vb) return null;
          const key = edgeKey(a, b);
          const checking = step?.edge && edgeKey(step.edge[0], step.edge[1]) === key;
          const mark = checking ? 'check' : step?.edgeMarks?.[key];
          const isSelected =
            selection?.kind === 'edge' && edgeKey(selection.a, selection.b) === key;
          return (
            <g key={key}>
              <line
                className={`edge${mark ? ` edge--${mark}` : ''}${isSelected ? ' edge--selected' : ''}`}
                x1={va.x}
                y1={va.y}
                x2={vb.x}
                y2={vb.y}
              />
              {editable && (
                <line
                  className="edge__hit"
                  x1={va.x}
                  y1={va.y}
                  x2={vb.x}
                  y2={vb.y}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    props.onSelect?.(isSelected ? null : { kind: 'edge', a, b });
                  }}
                >
                  <title>{`Edge ${va.label}–${vb.label}`}</title>
                </line>
              )}
            </g>
          );
        })}
      </g>

      {preview?.from && (
        <line
          className="edge edge--preview"
          x1={preview.from.x}
          y1={preview.from.y}
          x2={preview.x}
          y2={preview.y}
        />
      )}

      <g className="nodes">
        {snapshot.vertices.map((v) => {
          const tags: { text: string; tone: 'garnet' | 'moss' | 'ink' }[] = [];
          if (v.id === source) tags.push({ text: 'start', tone: 'garnet' });
          if (v.id === target) tags.push({ text: 'target', tone: 'moss' });
          return (
            <g
              key={v.id}
              className="graph__vertex"
              onPointerDown={(e) => onVertexDown(e, v.id)}
              onContextMenu={(e) => {
                if (!editable) return;
                e.preventDefault();
                props.onSetSource?.(v.id);
              }}
            >
              <NodeGlyph
                x={v.x}
                y={v.y}
                r={R}
                label={v.label}
                name={`vertex ${v.label}`}
                mark={markOf(v.id, step)}
                tags={tags}
                selected={selection?.kind === 'vertex' && selection.id === v.id}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
