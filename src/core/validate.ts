// Input checks that run in the controller before any model is touched (ER1).
// Every rejection says what was wrong and what is accepted (A3, D4).

import { VALUE_MAX, VALUE_MIN } from './limits';
import { err, ok, type Result } from './result';

const RANGE_TEXT = `a whole number from ${VALUE_MIN} to ${VALUE_MAX}`;

export function parseValue(raw: string, what = 'value'): Result<number> {
  const text = raw.trim();
  if (text === '') return err(`Type a ${what} first: ${RANGE_TEXT}.`);

  // Number('') and Number(' ') are 0 and Number('1e2') is 100, so we check
  // the shape with a regex rather than trusting Number() on its own.
  if (/^[+-]?\d+\.\d*$|^[+-]?\.\d+$/.test(text)) {
    return err(`${text} has a decimal part. Nodes hold whole numbers only, so use ${RANGE_TEXT}.`);
  }
  if (!/^[+-]?\d+$/.test(text)) {
    return err(`"${shorten(text)}" is not a number. Enter ${RANGE_TEXT}.`);
  }

  const n = Number(text);
  if (n < VALUE_MIN || n > VALUE_MAX) {
    return err(`${text} is outside the range. Use ${RANGE_TEXT} so it fits inside a node.`);
  }
  // Avoid showing "-0" anywhere later on.
  return ok(n === 0 ? 0 : n);
}

/** Parses "50, 30 70" style lists used by the quick build fields. */
export function parseValueList(raw: string, what = 'value'): Result<number[]> {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return err(`Type one or more ${what}s, separated by spaces or commas.`);

  const values: number[] = [];
  for (const token of tokens) {
    const parsed = parseValue(token, what);
    if (!parsed.ok) return parsed;
    values.push(parsed.value);
  }
  return ok(values);
}

export interface ValuePriority {
  value: number;
  priority: number;
}

/** Parses "7:2 9:2 1:1" for the priority queue (value:priority pairs). */
export function parsePairList(raw: string): Result<ValuePriority[]> {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return err('Type entries as value:priority, for example 7:2 9:1.');

  const pairs: ValuePriority[] = [];
  for (const token of tokens) {
    const parts = token.split(':');
    if (parts.length !== 2) {
      return err(`"${shorten(token)}" needs a colon between value and priority, like 7:2.`);
    }
    const value = parseValue(parts[0], 'value');
    if (!value.ok) return value;
    const priority = parseValue(parts[1], 'priority');
    if (!priority.ok) return priority;
    pairs.push({ value: value.value, priority: priority.value });
  }
  return ok(pairs);
}

function shorten(text: string): string {
  return text.length > 12 ? `${text.slice(0, 12)}...` : text;
}
