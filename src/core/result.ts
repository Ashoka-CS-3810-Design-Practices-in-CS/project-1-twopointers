// Small Result type so models can refuse an action with a reason instead of
// throwing. The interface always has a sentence to show that way (A3, Q4).

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const err = <T = never>(error: string): Result<T> => ({ ok: false, error });
