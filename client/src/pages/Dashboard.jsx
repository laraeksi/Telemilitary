import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const CONFIGS = ["easy", "balanced", "hard"];

const designerHeaders = {
  "Content-Type": "application/json",
  "X-Role": "designer",
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...designerHeaders, ...(options.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

function DataBlock({ title, children }) {
  return (
    <section style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </section>
  );
}

const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;
const formatSeconds = (value) => `${value.toFixed(1)}s`;
const formatTokens = (value) => `${value.toFixed(1)} tokens`;

function BarChart({ data, height = 18, valueFormatter }) {
  if (!data?.length) return <p>No data yet.</p>;

  const values = data.map((d) => d.value);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0, 1);
  const range = maxValue - minValue || 1;

  const formatValue =
    valueFormatter ||
    ((value) => {
      if (maxValue <= 1 && minValue >= 0) {
        return `${(value * 100).toFixed(1)}%`;
      }
      return value.toFixed(2);
    });

  const ticks = [minValue, 0, maxValue];
  const tickLabels = ticks.map((tick) => formatValue(tick));
  const tickPositions = ticks.map((tick) => ((tick - minValue) / range) * 100);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ position: "relative", height: 18 }}>
        {tickPositions.map((pos, idx) => (
          <div
            key={`${pos}-${idx}`}
            style={{
              position: "absolute",
              left: `${pos}%`,
              top: 0,
              height: "100%",
              width: 1,
              background: idx === 1 ? "#a0a0a0" : "#d8d8d8",
            }}
          />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.7 }}>
          <span>{tickLabels[0]}</span>
          <span>{tickLabels[1]}</span>
          <span>{tickLabels[2]}</span>
        </div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {data.map((item) => {
          const start = ((Math.min(item.value, 0) - minValue) / range) * 100;
          const end = ((Math.max(item.value, 0) - minValue) / range) * 100;
          const left = Math.min(start, end);
          const width = Math.max(Math.abs(end - start), 2);
          const isNegative = item.value < 0;

          return (
            <div
              key={item.label}
              style={{ display: "grid", gridTemplateColumns: "160px 1fr 80px", gap: 10, alignItems: "center" }}
            >
              <div style={{ fontSize: 12 }}>{item.label}</div>
              <div style={{ background: "#f5f5f5", height, borderRadius: 8, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: 0,
                    height: "100%",
                    width: `${width}%`,
                    background: isNegative ? "#ff6b6b" : "#4f7cff",
                    borderRadius: 8,
                  }}
                  title={`${item.label}: ${formatValue(item.value)}`}
                />
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, textAlign: "right" }}>
                {formatValue(item.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineChart({ data, height = 180, color = "#37b24d", valueFormatter }) {
  if (!data?.length) return <p>No data yet.</p>;
  const padding = 36;
  const width = 560;
  const values = data.map((d) => d.value);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 1);
  const range = maxValue - minValue || 1;

  const formatValue =
    valueFormatter ||
    ((value) => {
      if (maxValue <= 1 && minValue >= 0) {
        return `${(value * 100).toFixed(1)}%`;
      }
      return value.toFixed(2);
    });

  const points = data
    .map((d, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((d.value - minValue) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => minValue + (range * i) / tickCount);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {yTicks.map((tick, idx) => {
        const y = height - padding - ((tick - minValue) / range) * (height - padding * 2);
        return (
          <g key={`y-${idx}`}>
            <line x1={padding} x2={width - padding} y1={y} y2={y} stroke="#e6e6e6" />
            <text x={4} y={y + 4} fontSize="10" fill="#6b6b6b">
              {formatValue(tick)}
            </text>
          </g>
        );
      })}

      <polyline points={points} fill="none" stroke={color} strokeWidth="3" />
      {data.map((d, index) => {
        const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - ((d.value - minValue) / range) * (height - padding * 2);
        const showLabel = data.length <= 8 || index % 2 === 0;
        return (
          <g key={d.label}>
            <circle cx={x} cy={y} r="4" fill={color}>
              <title>
                {d.label}: {formatValue(d.value)}
              </title>
            </circle>
            {showLabel && (
              <text x={x} y={height - 12} fontSize="10" fill="#6b6b6b" textAnchor="middle">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function FunnelTable({ stages }) {
  if (!stages?.length) return <p>No funnel data available.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {[
            "Stage",
            "Starts",
            "Completes",
            "Fails",
            "Quits",
            "Complete %",
            "Fail %",
            "Drop-off to next %",
          ].map((h) => (
            <th
              key={h}
              style={{
                textAlign: "left",
                borderBottom: "1px solid #ddd",
                padding: "8px 6px",
                fontSize: 13,
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stages.map((s) => {
          const completePct = ((s.completion_rate || 0) * 100).toFixed(1);
          const failPct = ((s.failure_rate || 0) * 100).toFixed(1);
          const dropPct =
            s.dropoff_to_next == null
              ? "—"
              : `${((s.dropoff_to_next || 0) * 100).toFixed(1)}%`;

          return (
            <tr key={s.stage_id}>
              <td style={{ padding: "8px 6px" }}>{s.stage_id}</td>
              <td style={{ padding: "8px 6px" }}>{s.starts ?? 0}</td>
              <td style={{ padding: "8px 6px" }}>{s.completes ?? 0}</td>
              <td style={{ padding: "8px 6px" }}>{s.fails ?? 0}</td>
              <td style={{ padding: "8px 6px" }}>{s.quits ?? 0}</td>
              <td style={{ padding: "8px 6px" }}>{completePct}%</td>
              <td style={{ padding: "8px 6px" }}>{failPct}%</td>
              <td style={{ padding: "8px 6px" }}>{dropPct}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}


function SimulationResult({ simulation, stageId }) {
  if (!simulation) return null;

  const results = simulation.results || [];
  if (!results.length) {
    return <p>No simulation results returned.</p>;
  }

  const r = results.find((x) => Number(x.stage_id) === Number(stageId));
  if (!r) return <p>No simulation result for Stage {stageId}.</p>;

  const before = r.before || {};
  const after = r.after || {};

  const pct = (x) => ((x || 0) * 100);
  const fmt = (x) => `${x.toFixed(1)}%`;
  const delta = (a, b) => `${(b - a).toFixed(1)}%`;

  const beforeC = pct(before.completion_rate);
  const afterC = pct(after.completion_rate);
  const beforeF = pct(before.failure_rate);
  const afterF = pct(after.failure_rate);
  const beforeQ = pct(before.quit_rate);
  const afterQ = pct(after.quit_rate);

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <div>
          <strong>Completion rate:</strong>{" "}
          {fmt(beforeC)} → {fmt(afterC)}{" "}
          <span style={{ opacity: 0.8 }}>
            (Δ {delta(beforeC, afterC)})
          </span>
        </div>
        <div>
          <strong>Failure rate:</strong>{" "}
          {fmt(beforeF)} → {fmt(afterF)}{" "}
          <span style={{ opacity: 0.8 }}>
            (Δ {delta(beforeF, afterF)})
          </span>
        </div>
        <div>
          <strong>Quit rate:</strong>{" "}
          {fmt(beforeQ)} → {fmt(afterQ)}{" "}
          <span style={{ opacity: 0.8 }}>
            (Δ {delta(beforeQ, afterQ)})
          </span>
        </div>
      </div>

      {Array.isArray(r.notes) && r.notes.length > 0 ? (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Simulation notes
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {r.notes.map((n, idx) => (
              <li key={`${idx}-${n}`}>{n}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          No notes returned.
        </div>
      )}
    </div>
  );
}




function Dashboard() {
  const [configId, setConfigId] = useState("balanced");
  const [funnel, setFunnel] = useState(null);
  const [stageStats, setStageStats] = useState(null);
  const [progression, setProgression] = useState(null);
  const [fairness, setFairness] = useState(null);
  const [compare, setCompare] = useState(null);
  const [error, setError] = useState("");

  const [suggestions, setSuggestions] = useState([]);
  const [simStageId, setSimStageId] = useState(2);
  const [timerDelta, setTimerDelta] = useState(5);
  const [moveDelta, setMoveDelta] = useState(0);
  const [simulation, setSimulation] = useState(null);
  const [decisionStageId, setDecisionStageId] = useState(1);
  const [decisionChange, setDecisionChange] = useState("");
  const [decisionRationale, setDecisionRationale] = useState("");
  const [decisionEvidence, setDecisionEvidence] = useState("");
  const [decisionLog, setDecisionLog] = useState([]);

  const stageOptions = useMemo(() => {
    const ids = new Set();
  (funnel?.stages || []).forEach((s) => ids.add(s.stage_id));
  (stageStats?.stages || []).forEach((s) => ids.add(s.stage_id));

  const arr = Array.from(ids).sort((a, b) => a - b);
  return arr.length ? arr : [1, 2];
}, [funnel, stageStats]);
    

  async function loadMetrics(selectedConfig) {
    setError("");
    try {
      const [funnelData, stageData, progressionData, fairnessData, compareData] =
        await Promise.all([
          fetchJson(`/api/metrics/funnel?config_id=${selectedConfig}`),
          fetchJson(`/api/metrics/stage-stats?config_id=${selectedConfig}`),
          fetchJson(`/api/metrics/progression?config_id=${selectedConfig}`),
          fetchJson(`/api/metrics/fairness?config_id=${selectedConfig}&segment=fast_vs_slow`),
          fetchJson(`/api/metrics/compare?configs=${CONFIGS.join(",")}`),
        ]);

      setFunnel(funnelData);
      setStageStats(stageData);
      setProgression(progressionData);
      setFairness(fairnessData);
      setCompare(compareData);
    } catch (err) {
      setError("Failed to load dashboard metrics.");
    }
  }

  async function loadSuggestions(selectedConfig) {
    try {
      const data = await fetchJson("/api/balancing/suggestions", {
        method: "POST",
        body: JSON.stringify({ config_id: selectedConfig }),
      });
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  }

  async function runSimulation(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await fetchJson("/api/balancing/simulate", {
        method: "POST",
        body: JSON.stringify({
          config_id: configId,
          changes: [
            {
              stage_id: Number(simStageId),
              timer_seconds_delta: Number(timerDelta),
              move_limit_delta: Number(moveDelta),
            },
          ],
        }),
      });
      setSimulation(data);
    } catch {
      setError("Failed to run simulation.");
    }
  }

  async function exportCsv() {
    try {
      const res = await fetch(`/api/export/events.csv?config_id=${configId}`, {
        headers: { "X-Role": "designer" },
      });
      if (!res.ok) throw new Error("export failed");
      const csv = await res.text();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `telemetry_${configId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("CSV export failed.");
    }
  }

  // 1) Load metrics whenever configId changes
useEffect(() => {
  loadMetrics(configId);
  loadSuggestions(configId);
}, [configId]);

// 2) Keep simStageId valid whenever stageOptions changes
useEffect(() => {
  const current = Number(simStageId);
  if (!stageOptions.includes(current)) {
    setSimStageId(stageOptions[0]);
  }
}, [stageOptions, simStageId]);

  const funnelBars =
    funnel?.stages?.map((stage) => ({
      label: `Stage ${stage.stage_id}`,
      value: stage.completion_rate || 0,
    })) || [];

  const spikeBars =
    stageStats?.stages?.map((stage) => {
    const isSpike = stage.flags?.includes("difficulty_spike");
    return {
      label: `Stage ${stage.stage_id}${isSpike ? " ⚠" : ""}`,
      value: stage.failure_rate || 0,
    };
  }) || [];

  const progressionTime =
    progression?.stages?.map((stage) => ({
      label: `Stage ${stage.stage_id}`,
      value: stage.avg_time_spent_seconds || 0,
    })) || [];

  const progressionTokens =
    progression?.stages?.map((stage) => ({
      label: `Stage ${stage.stage_id}`,
      value: (stage.avg_tokens_earned || 0) - (stage.avg_tokens_spent || 0),
    })) || [];

  const fairnessBars =
    fairness?.stages?.map((stage) => ({
      label: `Stage ${stage.stage_id}`,
      value: stage.fairness_gap || 0,
    })) || [];

  const compareBars =
    compare?.stages?.map((stage) => ({
      label: `Stage ${stage.stage_id}`,
      value:
        (stage.by_config?.easy?.completion_rate || 0) -
        (stage.by_config?.hard?.completion_rate || 0),
    })) || [];

  const suggestionCopy = {
    R3_HELPERS_UNAFFORDABLE: "Helpers feel pricey for the current rewards.",
    R4_HELPERS_OVERUSED: "Players lean on helpers a lot here.",
    R5_FAIRNESS_VIOLATION: "Player segments aren’t getting a fair shake.",
    R6_PROGRESSION_DROPOFF: "A lot of players drop here.",
  };

  function addDecision(e) {
    e.preventDefault();
    const trimmedChange = decisionChange.trim();
    const trimmedRationale = decisionRationale.trim();
    const trimmedEvidence = decisionEvidence.trim();
    if (!trimmedChange || !trimmedRationale) return;

    const next = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      stageId: Number(decisionStageId),
      change: trimmedChange,
      rationale: trimmedRationale,
      evidence: trimmedEvidence || "No specific chart noted.",
      timestamp: new Date().toLocaleString(),
    };
    setDecisionLog((prev) => [next, ...prev]);
    setDecisionChange("");
    setDecisionRationale("");
    setDecisionEvidence("");
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Designer Dashboard</h1>
          <p style={{ marginTop: 0, opacity: 0.75 }}>
            Telemetry funnel, difficulty spikes, fairness, and balancing suggestions.
          </p>
        </div>
        <Link to="/">
          <button type="button">Back to Home</button>
        </Link>
      </header>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          Config
          <select
            value={configId}
            onChange={(e) => setConfigId(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            {CONFIGS.map((cfg) => (
              <option key={cfg} value={cfg}>
                {cfg}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={() => loadMetrics(configId)}>
          Refresh metrics
        </button>
        <button type="button" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      {error && <p style={{ color: "#b00020" }}>{error}</p>}

      <div style={{ display: "grid", gap: 16 }}>
      <DataBlock title="1) Funnel View (Starts → Completes → Drop-off)">
        <BarChart data={funnelBars} valueFormatter={formatPercent} />
        <div style={{ marginTop: 12 }}>
          <FunnelTable stages={funnel?.stages || []} />
        </div>
      </DataBlock>

        <DataBlock title="2) Difficulty / Spike Detection (Failure Rate)">
          <BarChart data={spikeBars} valueFormatter={formatPercent} />
        </DataBlock>

        <DataBlock title="3) Progression Curves (Avg Time per Stage)">
          <LineChart data={progressionTime} valueFormatter={formatSeconds} />
        </DataBlock>

        <DataBlock title="3) Progression Curves (Net Tokens per Stage)">
          <LineChart data={progressionTokens} color="#ff922b" valueFormatter={formatTokens} />
        </DataBlock>

        <DataBlock title="4) Fairness Comparison (Completion Gap)">
          <BarChart data={fairnessBars} valueFormatter={formatPercent} />
        </DataBlock>

        <DataBlock title="5) Config Comparison (Easy vs Hard Completion Gap)">
          <BarChart data={compareBars} valueFormatter={formatPercent} />
        </DataBlock>
      </div>

      <section style={{ display: "grid", gap: 16 }}>
        <DataBlock title="Balancing Ideas (Quick Takeaways)">
          {suggestions.length === 0 ? (
            <p>Nothing to flag yet — data is still light.</p>
          ) : (
            <ul>
              {suggestions.map((item) => (
                <li key={`${item.rule_id}-${item.stage_id}`}>
                  Stage {item.stage_id}:{" "}
                  {suggestionCopy[item.rule_id] || item.expected_effect || "Worth a second look."}
                </li>
              ))}
            </ul>
          )}
          
        </DataBlock>

        <DataBlock title="Decision Log (What we changed and why)">
          
          <form onSubmit={addDecision} style={{ display: "grid", gap: 8 }}>
            <label>
              Stage
              <select
                value={decisionStageId}
                onChange={(e) => setDecisionStageId(e.target.value)}
                style={{ marginLeft: 8 }}
              >
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </label>
            <label>
              What did you change?
              <input
                type="text"
                value={decisionChange}
                onChange={(e) => setDecisionChange(e.target.value)}
                placeholder="Example: Lowered peek cost from 3 → 2"
                style={{ marginLeft: 8, width: "100%" }}
              />
            </label>
            <label>
              Why?
              <input
                type="text"
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                placeholder="Example: Stage 1 helper usage was too low"
                style={{ marginLeft: 8, width: "100%" }}
              />
            </label>
            <label>
              Evidence (which chart?)
              <input
                type="text"
                value={decisionEvidence}
                onChange={(e) => setDecisionEvidence(e.target.value)}
                placeholder="Example: Difficulty Spike chart + Funnel drop-off"
                style={{ marginLeft: 8, width: "100%" }}
              />
            </label>
            <button type="submit">Add note</button>
          </form>

          {decisionLog.length === 0 ? (
            <p style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>
              No decisions recorded yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {decisionLog.map((entry) => (
                <div
                  key={entry.id}
                  style={{ border: "1px solid #e3e3e3", borderRadius: 8, padding: 10 }}
                >
                  <div style={{ fontSize: 13, opacity: 0.7 }}>{entry.timestamp}</div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Stage {entry.stageId}:</strong> {entry.change}
                  </div>
                  <div style={{ marginTop: 4 }}>Why: {entry.rationale}</div>
                  <div style={{ marginTop: 4, opacity: 0.8 }}>Evidence: {entry.evidence}</div>
                </div>
              ))}
            </div>
          )}
        </DataBlock>

        <DataBlock title="Simulation: Adjust One Parameter">
          <form onSubmit={runSimulation} style={{ display: "grid", gap: 8 }}>
            <label>
              Stage
              <select
                value={simStageId}
                onChange={(e) => setSimStageId(e.target.value)}
                style={{ marginLeft: 8 }}
              >
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Timer delta (seconds)
              <input
                type="number"
                value={timerDelta}
                onChange={(e) => setTimerDelta(e.target.value)}
                style={{ marginLeft: 8 }}
              />
            </label>
            <label>
              Move limit delta
              <input
                type="number"
                value={moveDelta}
                onChange={(e) => setMoveDelta(e.target.value)}
                style={{ marginLeft: 8 }}
              />
            </label>
            <button type="submit">Run simulation</button>
          </form>
          {simulation && <SimulationResult simulation={simulation} stageId={simStageId} />}
        </DataBlock>
      </section>
    </main>
  );
}

export default Dashboard;