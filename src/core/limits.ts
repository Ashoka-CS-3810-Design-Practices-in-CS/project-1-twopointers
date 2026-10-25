// Size caps from A1 (A3) and A3 (D3). These are legibility limits, not
// algorithmic ones: past these sizes the labels get too small to read on a
// laptop screen, and an animation nobody can read teaches nothing.

export const VALUE_MIN = -999;
export const VALUE_MAX = 999;

export const MAX_TREE_NODES = 31;
export const MAX_HEAP_ENTRIES = 31;
export const MAX_VERTICES = 25;
export const MAX_EDGES = 50;

export const MAX_LINEAR_CAPACITY = 30;
export const MIN_LINEAR_CAPACITY = 4;
export const DEFAULT_STACK_CAPACITY = 8;
export const DEFAULT_QUEUE_CAPACITY = 8;

/** Capacities offered in the build panel for the stack and the queue. */
export const CAPACITY_CHOICES = [4, 6, 8, 10, 12, 16, 20, 30];
