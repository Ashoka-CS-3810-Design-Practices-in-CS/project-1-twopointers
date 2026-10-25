// Landing page: what the tool is, a live example, the five structures, and
// how a session works.

import { STRUCTURES } from '../registry';
import { Glyph } from './Glyphs';
import { HeroDemo } from './HeroDemo';
import { href } from './route';

const PRACTICE: Record<string, string> = {
  bst: 'Insert, search, all three delete cases, and the three depth-first traversals.',
  graph: 'Draw your own graph, then compare breadth first and depth first search on it.',
  heap: 'Watch entries bubble up and sink down, in the tree and in the array at once.',
  stack: 'Push, pop and peek, and see why the last value in is the first one out.',
  queue: 'Enqueue and dequeue on a circular buffer, including the wrap back to slot 0.',
};

const FLOW = [
  {
    title: 'Build it',
    body: 'Type values, load an example, or click to draw a graph. Building is instant.',
  },
  {
    title: 'Pick an operation',
    body: 'The pseudocode and the cost appear before anything runs, so you know what to expect.',
  },
  {
    title: 'Step and predict',
    body: 'Each Next runs exactly one step. With Guess mode on, you call each decision first, and every answer comes with the reason.',
  },
  {
    title: 'Check the cost',
    body: 'The worst-case bound sits next to a live count of the work your input actually took.',
  },
];

export function HomePage() {
  return (
    <main className="home" id="main">
      <section className="hero">
        <div className="hero__text">
          <h1>Build it. Step through it. Predict what happens next.</h1>
          <p className="hero__lede">
            Stepwise is a hands-on visualiser for binary search trees, graphs, priority queues,
            stacks and queues. Nothing moves until you press Next, every step explains itself, and
            the cost is always on screen.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary btn--large" href={href('bst')}>
              Start with a binary search tree
            </a>
            <a className="btn btn--large" href={href('graph')}>
              Draw a graph
            </a>
          </div>
          <p className="hero__keys">
            Press <kbd>→</kbd> for the next step and <kbd>←</kbd> to go back. <kbd>?</kbd> lists
            every shortcut.
          </p>
        </div>
        <HeroDemo />
      </section>

      <section className="modules" aria-labelledby="modules-title">
        <h2 id="modules-title">Five structures, one way of working</h2>
        <ul className="modules__list">
          {STRUCTURES.map((def) => (
            <li key={def.id}>
              <a className="module" href={href(def.id)}>
                <Glyph id={def.id} />
                <span className="module__text">
                  <span className="module__name">{def.name}</span>
                  <span className="module__tag">{def.tagline}</span>
                  <span className="module__practice">{PRACTICE[def.id]}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="flow" aria-labelledby="flow-title">
        <h2 id="flow-title">How a session works</h2>
        <ol className="flow__list">
          {FLOW.map((f, i) => (
            <li key={f.title}>
              <span className="flow__num" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="uses" aria-labelledby="uses-title">
        <h2 id="uses-title">Made for three ways of using it</h2>
        <div className="uses__grid">
          <article>
            <h3>Learning it for the first time</h3>
            <p>
              Start with an example, turn Guess mode on and step slowly. Wrong guesses are part of
              the plan: each one tells you which rule you missed.
            </p>
          </article>
          <article>
            <h3>Teaching it in a class</h3>
            <p>
              Build the exact example you want, then press <kbd>P</kbd> for presentation mode. Text
              gets larger and answers stay hidden until you reveal them, so the room can guess
              first.
            </p>
          </article>
          <article>
            <h3>Revising before an exam</h3>
            <p>
              Test the case you are unsure about. Delete a node with two children, or run BFS and
              DFS on the same graph and compare the orders.
            </p>
          </article>
        </div>
      </section>

      <footer className="footer">
        <p>
          Built by Two Pointers (Ramit Sachdev and Shubhay Agarwal) for CS-3810 Design Practices in
          Computer Science at Ashoka University.
        </p>
        <p>
          <a href={href('compare')}>Compare the structures side by side</a>
        </p>
      </footer>
    </main>
  );
}
