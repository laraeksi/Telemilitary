# Test Plan (Scaffold)

## Manual end-to-end scenarios

1. Complete stage with no helpers.
2. Fail by time.
3. Fail by moves.
4. Use peek helper.
5. Use freeze helper.
6. Use shuffle helper.
7. Quit mid-stage.
8. Designer views funnel dashboard.
9. Run balancing simulation.
10. Export CSV.

## Automated tests (placeholders)

- event validation required fields
- event validation allowed event types
- anomaly creation on missing fields
- anomaly creation on impossible order
- anomaly creation on out-of-range data
- funnel metrics aggregation
- stage stats aggregation
- progression metrics aggregation
- fairness metrics aggregation
- compare metrics aggregation
- balancing rule: high fail/high time
- balancing rule: moves dominate
- balancing rule: token spend too high
- balancing rule: fairness gap
- balancing rule: high retries
- balancing rule: drop-off spike
- simulation: time overrun becomes success
- simulation: moves overrun becomes success
- CSV export formatting
