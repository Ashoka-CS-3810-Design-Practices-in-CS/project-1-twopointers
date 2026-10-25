// Smoothly moves elements between layouts, matched by stable id.
//
// If a new target arrives while a tween is still running (the learner
// pressed Next quickly), the new tween starts from wherever things are on
// screen right now, so the picture never jumps backwards or lags behind the
// state. With reduced motion turned on, positions update instantly.

import { easeCubicInOut } from 'd3-ease';
import { interpolateNumber } from 'd3-interpolate';
import { timer } from 'd3-timer';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Id } from '../core/types';

export interface Point {
  x: number;
  y: number;
}

export type Positions = Record<Id, Point>;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useTween(target: Positions, duration = 420): Positions {
  const [frame, setFrame] = useState<Positions>(target);
  const shown = useRef<Positions>(target);
  const signature = useMemo(() => JSON.stringify(target), [target]);

  useEffect(() => {
    const to = JSON.parse(signature) as Positions;
    const from = shown.current;
    if (prefersReducedMotion() || duration <= 0) {
      shown.current = to;
      setFrame(to);
      return;
    }
    const lerps = Object.keys(to).map((id) => {
      const start = from[id] ?? to[id];
      return {
        id,
        x: interpolateNumber(start.x, to[id].x),
        y: interpolateNumber(start.y, to[id].y),
      };
    });
    const t = timer((elapsed) => {
      const k = Math.min(1, elapsed / duration);
      const e = easeCubicInOut(k);
      const next: Positions = {};
      for (const l of lerps) next[l.id] = { x: l.x(e), y: l.y(e) };
      shown.current = next;
      setFrame(next);
      if (k >= 1) t.stop();
    });
    return () => t.stop();
  }, [signature, duration]);

  // Elements that only just appeared are drawn at their target straight
  // away; elements that disappeared are dropped.
  const out: Positions = {};
  for (const id of Object.keys(target)) out[id] = frame[id] ?? target[id];
  return out;
}
