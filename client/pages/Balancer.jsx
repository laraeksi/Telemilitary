import { ChartPlaceholder } from "../components/ChartPlaceholder";
import { TablePlaceholder } from "../components/TablePlaceholder";

/**
 * Pseudocode:
 * 1) Render editable balancing parameters.
 * 2) Show rule-based suggestions.
 * 3) Run simulation and display results.
 * 4) Display decision log entries.
 */

export const BalancerPage = () => (
  <main className="balancer-page">
    <h1>Balancing Toolkit</h1>
    <section>
      <h2>Parameter editor</h2>
      <form>
        <label htmlFor="timer">Timer (seconds)</label>
        <input id="timer" name="timer" type="number" />
        <label htmlFor="moves">Move limit</label>
        <input id="moves" name="moves" type="number" />
        <label htmlFor="penalty">Mismatch penalty</label>
        <input id="penalty" name="penalty" type="number" />
        <label htmlFor="peek">Peek cost</label>
        <input id="peek" name="peek" type="number" />
        <label htmlFor="freeze">Freeze cost</label>
        <input id="freeze" name="freeze" type="number" />
        <label htmlFor="shuffle">Shuffle cost</label>
        <input id="shuffle" name="shuffle" type="number" />
        <label htmlFor="token-match">Token per match</label>
        <input id="token-match" name="token-match" type="number" />
        <label htmlFor="token-complete">Token on complete</label>
        <input id="token-complete" name="token-complete" type="number" />
      </form>
    </section>
    <section>
      <h2>Suggestions</h2>
      <TablePlaceholder title="Rule suggestions" columns={["Rule", "Trigger", "Suggestion"]} />
    </section>
    <section>
      <h2>Simulation</h2>
      <button type="button">Simulate</button>
      <ChartPlaceholder title="Simulation results" description="Predicted completion rates" />
    </section>
    <section>
      <h2>Decision log</h2>
      <TablePlaceholder title="Decision log entries" columns={["Timestamp", "Change", "Rationale"]} />
    </section>
  </main>
);
