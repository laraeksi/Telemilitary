/**
 * Pseudocode:
 * 1) Display summary metrics after a run.
 * 2) Provide Retry and Exit actions.
 * 3) Hook into game flow later.
 */

export const PostRunSummary = ({
  timeSpentSeconds,
  fails,
  tokensEarned,
  tokensSpent,
  stagesCompleted,
  onRetry,
  onExit,
}) => (
  <section className="post-run-summary" aria-labelledby="post-run-title">
    <h2 id="post-run-title">Run summary</h2>
    <dl>
      <div>
        <dt>Time spent</dt>
        <dd>{timeSpentSeconds}s</dd>
      </div>
      <div>
        <dt>Fails</dt>
        <dd>{fails}</dd>
      </div>
      <div>
        <dt>Tokens earned</dt>
        <dd>{tokensEarned}</dd>
      </div>
      <div>
        <dt>Tokens spent</dt>
        <dd>{tokensSpent}</dd>
      </div>
      <div>
        <dt>Stages completed</dt>
        <dd>{stagesCompleted}</dd>
      </div>
    </dl>
    <div className="post-run-actions">
      <button type="button" onClick={onRetry}>
        Retry
      </button>
      <button type="button" onClick={onExit}>
        Exit
      </button>
    </div>
  </section>
);
