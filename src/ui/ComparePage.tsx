// Compare: every operation's cost in one table, generated from the same
// registry entries the side panels use, plus the two pairings that are worth
// seeing side by side (stack vs queue, DFS vs BFS).

import { getWorkspace } from '../app/workspaces';
import type { StructureId } from '../core/types';
import { STRUCTURES } from '../registry';
import { Glyph } from './Glyphs';
import { href } from './route';

const JOBS: { need: string; pick: StructureId; why: string }[] = [
  { need: 'Undo the most recent action', pick: 'stack', why: 'The newest item is always on top.' },
  {
    need: 'Serve people in the order they arrived',
    pick: 'queue',
    why: 'First in, first out, with O(1) at both ends.',
  },
  {
    need: 'Always handle the most urgent job next',
    pick: 'heap',
    why: 'The minimum sits at the root, and updates cost O(log n).',
  },
  {
    need: 'Keep keys sorted and look them up',
    pick: 'bst',
    why: 'Each comparison discards a subtree, as long as the tree stays bushy.',
  },
  {
    need: 'Model connections and find routes',
    pick: 'graph',
    why: 'BFS finds fewest-edge routes; DFS explores whole branches.',
  },
];

function openOperation(structure: StructureId, opId: string) {
  getWorkspace(structure).selectOp(opId);
  window.location.hash = href(structure);
}

export function ComparePage() {
  const nameOf = (id: StructureId) => STRUCTURES.find((s) => s.id === id)?.name ?? id;

  return (
    <main className="compare" id="main">
      <header className="compare__head">
        <h1>Compare the structures</h1>
        <p>
          Every operation in Stepwise with its worst-case time and the extra space it needs. Open
          any row to step through it and see the bound next to the work your own input takes.
        </p>
      </header>

      <div className="table-wrap">
        <table className="cost-table">
          <caption className="visually-hidden">Worst-case cost of every operation</caption>
          <thead>
            <tr>
              <th scope="col">Operation</th>
              <th scope="col">Worst-case time</th>
              <th scope="col">Extra space</th>
              <th scope="col">What it does</th>
              <th scope="col">
                <span className="visually-hidden">Open</span>
              </th>
            </tr>
          </thead>
          {STRUCTURES.map((def) => (
            <tbody key={def.id}>
              <tr className="cost-table__group">
                <th scope="rowgroup" colSpan={5}>
                  <Glyph id={def.id} />
                  {def.name}
                  <span className="cost-table__tag">{def.tagline}</span>
                </th>
              </tr>
              {def.operations.map((op) => (
                <tr key={op.id}>
                  <th scope="row">
                    <code>{op.signature}</code>
                  </th>
                  <td className="math">{op.complexity.time}</td>
                  <td className="math">{op.complexity.space}</td>
                  <td className="cost-table__why">{op.blurb}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--small"
                      onClick={() => openOperation(def.id, op.id)}
                    >
                      Try it
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <section className="pairs" aria-labelledby="pairs-title">
        <h2 id="pairs-title">Two pairs worth comparing</h2>
        <div className="pairs__grid">
          <article className="pair">
            <h3>Stack and queue</h3>
            <p>
              Both add and remove in O(1). The only difference is which end things leave from: a
              stack hands back the newest value, a queue the oldest. That one difference is also
              what separates depth first from breadth first search.
            </p>
            <div className="pair__actions">
              <a className="btn btn--small" href={href('stack')}>
                Open the stack
              </a>
              <a className="btn btn--small" href={href('queue')}>
                Open the queue
              </a>
            </div>
          </article>
          <article className="pair">
            <h3>Depth first and breadth first search</h3>
            <p>
              Same skeleton, different waiting line. Run both from the same start on the grid
              example: BFS spreads out in waves and finds fewest-edge routes, while DFS follows one
              route until it runs out.
            </p>
            <div className="pair__actions">
              <button
                type="button"
                className="btn btn--small"
                onClick={() => openOperation('graph', 'graph.bfs')}
              >
                Run breadth first
              </button>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => openOperation('graph', 'graph.dfs')}
              >
                Run depth first
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="jobs" aria-labelledby="jobs-title">
        <h2 id="jobs-title">Which one fits the job?</h2>
        <ul className="jobs__list">
          {JOBS.map((j) => (
            <li key={j.need}>
              <span className="jobs__need">{j.need}</span>
              <a className="jobs__pick" href={href(j.pick)}>
                {nameOf(j.pick)}
              </a>
              <span className="jobs__why">{j.why}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
