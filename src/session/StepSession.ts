// The step session from A2 (section 4.1). It sits between the learner and a
// paused algorithm:
//
//   Next    -> if we went back earlier, show the next step we already have;
//              otherwise wake the algorithm up for exactly one new step.
//   Back    -> show the previous step from history. The algorithm is not touched.
//   Answer  -> record the learner's choice for the open question.
//   Restart -> throw the paused algorithm away and start again from the same copy.
//
// The session never knows which algorithm it is running. It only knows that
// it was given a generator, and that the generator yields step records.

import type { OpOutcome, StepGenerator, StepRecord } from '../core/types';

export type SessionPhase = 'stepping' | 'question' | 'done';

export interface AnswerRecord {
  /** null means the answer was revealed without a guess (presentation mode). */
  choice: string | null;
  correct: boolean | null;
}

export interface SessionOptions {
  /** Read on every pull, so toggling Guess mode mid-run takes effect at once. */
  guessMode: () => boolean;
}

let nextSessionId = 1;

export class StepSession<S = unknown, M = unknown> {
  /** A fresh number per session. Timer ticks from an old session are ignored (T13). */
  readonly id = nextSessionId++;

  private gen: StepGenerator<S, M>;
  private history: StepRecord<S>[] = [];
  private answers = new Map<number, AnswerRecord>();
  private position = -1;
  private done = false;
  private result: OpOutcome<M> | null = null;

  /** How many steps the algorithm has produced. Tests check this to prove nothing runs ahead. */
  produced = 0;

  constructor(
    private readonly factory: () => StepGenerator<S, M>,
    private readonly options: SessionOptions,
  ) {
    this.gen = factory();
  }

  /** Shows the first step. */
  start(): this {
    this.pull();
    return this;
  }

  get current(): StepRecord<S> | null {
    return this.history[this.position] ?? null;
  }

  get index(): number {
    return this.position;
  }

  get length(): number {
    return this.history.length;
  }

  get isFinished(): boolean {
    return this.done;
  }

  get outcome(): OpOutcome<M> | null {
    return this.result;
  }

  get atNewest(): boolean {
    return this.position === this.history.length - 1;
  }

  /** Every step seen so far. Handy for tests and for the "steps so far" count. */
  steps(): readonly StepRecord<S>[] {
    return this.history;
  }

  answerAt(index = this.position): AnswerRecord | undefined {
    return this.answers.get(index);
  }

  /** A question is open when it has not been answered and Guess mode is on. */
  get questionOpen(): boolean {
    const step = this.current;
    return (
      !!step && step.kind === 'ask' && !this.answers.has(this.position) && this.options.guessMode()
    );
  }

  get phase(): SessionPhase {
    if (this.questionOpen) return 'question';
    if (this.done && this.atNewest) return 'done';
    return 'stepping';
  }

  canNext(): boolean {
    if (this.questionOpen) return false;
    return !this.atNewest || !this.done;
  }

  canBack(): boolean {
    return this.position > 0;
  }

  next(): boolean {
    if (!this.canNext()) return false;
    if (!this.atNewest) {
      this.position++;
      return true;
    }
    return this.pull();
  }

  back(): boolean {
    if (!this.canBack()) return false;
    this.position--;
    return true;
  }

  answer(choice: string): AnswerRecord | null {
    const step = this.current;
    if (!step || step.kind !== 'ask' || !step.question || this.answers.has(this.position))
      return null;
    // The choice only decides which feedback we show. The algorithm carries
    // on exactly the same either way (A2, rule 1).
    const record = { choice, correct: choice === step.question.answer };
    this.answers.set(this.position, record);
    return record;
  }

  /** Shows the answer without a guess, for an instructor at the front of a room. */
  reveal(): AnswerRecord | null {
    const step = this.current;
    if (!step || step.kind !== 'ask' || this.answers.has(this.position)) return null;
    const record = { choice: null, correct: null };
    this.answers.set(this.position, record);
    return record;
  }

  restart(): void {
    this.gen = this.factory();
    this.history = [];
    this.answers.clear();
    this.position = -1;
    this.done = false;
    this.result = null;
    this.produced = 0;
    this.pull();
  }

  /** Runs to the end without asking anything. Used by Finish and by quick operations. */
  finishAll(): void {
    this.position = this.history.length - 1;
    while (!this.done) this.pull(true);
  }

  /** Resumes the algorithm once and stores the step it hands back. */
  private pull(skipQuestions = !this.options.guessMode()): boolean {
    if (this.done) return false;
    for (;;) {
      const next = this.gen.next();
      if (next.done) {
        // The algorithm finished without flagging its last step. Stay where we are.
        this.finish(next.value);
        return true;
      }
      const step = next.value;
      if (step.kind === 'ask' && skipQuestions) continue;

      this.produced++;
      this.history.push(step);
      this.position = this.history.length - 1;

      if (step.final) {
        // The algorithm has already done all its work by the time it hands
        // out a final step, so collecting its return value is not running ahead.
        const end = this.gen.next();
        if (!end.done) throw new Error('An algorithm yielded a step after its final step.');
        this.finish(end.value);
      }
      return true;
    }
  }

  private finish(outcome: OpOutcome<M>): void {
    this.done = true;
    this.result = outcome;
  }
}
