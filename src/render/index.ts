// Renderer registry: one renderer per structure (A3, design review Q6).
// A renderer can be rewritten without touching models, generators or the
// session, because all it receives is a snapshot and a step record.

export { BstView } from './BstView';
export { GraphView, GRAPH_H, GRAPH_W, type GraphSelection } from './GraphView';
export { HeapView } from './HeapView';
export { QueueView } from './QueueView';
export { StackView } from './StackView';
export { Legend } from './Legend';
export { markOf } from './marks';
