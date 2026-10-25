// What the registry knows about each structure and each operation.
//
// An operation's generator, its complexity entry and its pseudocode are
// registered together under one id (A2, rule 6), so the side panels can never
// describe a different operation from the one that is running.

import type { Result } from '../core/result';
import type { Id, StepGenerator, StructureId } from '../core/types';

export interface Complexity {
  /** Worst-case time, e.g. 'O(h)'. */
  time: string;
  /** Extra working space, e.g. 'O(1)'. */
  space: string;
  best?: string;
  average?: string;
  /** What the letters mean and the caveats a student should know. */
  notes: string[];
  /** Which live counter measures this operation's work. */
  counter?: string;
}

export type OpInput = 'none' | 'value' | 'entry' | 'endpoints';

export interface OpArgs {
  value?: number;
  priority?: number;
  source?: Id | null;
  target?: Id | null;
}

export interface OperationDef<M = any, S = any> {
  id: string;
  label: string;
  signature: string;
  blurb: string;
  input: OpInput;
  /** What the value field is called for this operation ('key' or 'value'). */
  inputName?: string;
  /** Quick operations run to the end by themselves unless a question stops them. */
  pace: 'quick' | 'stepped';
  complexity: Complexity;
  pseudocode: string[];
  /** Why Run is disabled right now, or null when it can run. */
  blocked?(model: M, args: OpArgs): string | null;
  run(model: M, args: OpArgs): StepGenerator<S, M>;
}

export interface Preset<M = any> {
  id: string;
  label: string;
  description: string;
  build(): M;
}

export interface Fact {
  label: string;
  value: string;
}

export interface QuickAdd<M = any> {
  label: string;
  placeholder: string;
  hint: string;
  button: string;
  apply(model: M, text: string): Result<{ model: M; message: string }>;
}

export interface CapacityControl<M = any> {
  choices: number[];
  current(model: M): number;
  /** Only allowed while the structure is empty, so nothing gets lost. */
  set(model: M, capacity: number): Result<M>;
}

export interface StructureDef<M = any, S = any> {
  id: StructureId;
  name: string;
  shortName: string;
  tagline: string;
  intro: string;
  empty(): M;
  clone(model: M): M;
  snapshot(model: M): S;
  invariant(model: M): string | null;
  size(model: M): number;
  facts(snapshot: S): Fact[];
  operations: OperationDef<M, S>[];
  presets: Preset<M>[];
  random(): M;
  quickAdd?: QuickAdd<M>;
  capacity?: CapacityControl<M>;
}
