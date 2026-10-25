// Auto is only a helper that presses Next on a timer (A2, table 6). It owns a
// single timer, and every run gets a token so a tick that was already queued
// when the learner pressed Reset can tell it is out of date and do nothing.
//
// The scheduler is injectable so tests can drive time by hand instead of
// waiting on real timeouts.

export interface Scheduler {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const browserScheduler: Scheduler = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class AutoPlayer {
  private handle: unknown = null;
  private token = 0;

  constructor(private readonly scheduler: Scheduler = browserScheduler) {}

  get running(): boolean {
    return this.handle !== null;
  }

  /**
   * Calls tick after every interval until tick returns false or stop() is
   * called. The interval is read again before each tick so the speed slider
   * takes effect straight away.
   */
  start(interval: () => number, tick: () => boolean): void {
    this.stop();
    const token = ++this.token;
    const loop = () => {
      if (token !== this.token) return;
      this.handle = null;
      if (!tick()) return;
      if (token !== this.token) return;
      this.handle = this.scheduler.set(loop, interval());
    };
    this.handle = this.scheduler.set(loop, interval());
  }

  stop(): void {
    if (this.handle !== null) this.scheduler.clear(this.handle);
    this.handle = null;
    this.token++;
  }
}
