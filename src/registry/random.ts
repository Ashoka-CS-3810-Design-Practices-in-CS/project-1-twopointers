// Tiny helpers for the Random buttons. Values stay small (1 to 99) so they
// read easily inside a node.

export function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function distinctValues(count: number, min = 1, max = 99): number[] {
  const pool = new Set<number>();
  while (pool.size < count) pool.add(randomInt(min, max));
  return [...pool];
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
