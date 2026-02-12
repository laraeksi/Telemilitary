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

function BarChart({ data, maxValue, height = 140 }) {
  if (!data?.length) return <p>No data yet.</p>;
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {data.map((item) => (
        <div key={item.label} style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 12 }}>{item.label}</div>
          <div style={{ background: "#f2f2f2", height, borderRadius: 6, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                width: "100%",
                height: `${Math.max((item.value / max) * 100, 2)}%`,
                background: "#4f7cff",
                borderRadius: 6,
              }}
            />
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{item.value.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, height = 160, color = "#37b24d" }) {
  if (!data?.length) return <p>No data yet.</p>;
  const padding = 24;
  const width = 500;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const points = data
    .map((d, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - (d.value / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" />
      {data.map((d, index) => {
        const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - (d.value / maxValue) * (height - padding * 2);
        return <circle key={d.label} cx={x} cy={y} r="4" fill={color} />;
      })}
    </svg>
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

  const stageOptions = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => i + 1);
  }, []);

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

  useEffect(() => {
    loadMetrics(configId);
    loadSuggestions(configId);
  }, [configId]);

  const funnelBars =
    funnel?.stages?.map((stage) => ({
      label: `Stage ${stage.stage_id}`,
      value: stage.completion_rate || 0,
    })) || [];

  const spikeBars =
    stageStats?.stages?.map((stage) => ({
      label: `Stage ${stage.stage_id}`,
      value: stage.failure_rate || 0,
    })) || [];

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
        <DataBlock title="1) Funnel View (Completion Rate by Stage)">
          <BarChart data={funnelBars} maxValue={1} />
        </DataBlock>

        <DataBlock title="2) Difficulty / Spike Detection (Failure Rate)">
          <BarChart data={spikeBars} maxValue={1} />
        </DataBlock>

        <DataBlock title="3) Progression Curves (Avg Time per Stage)">
          <LineChart data={progressionTime} />
        </DataBlock>

        <DataBlock title="3) Progression Curves (Net Tokens per Stage)">
          <LineChart data={progressionTokens} color="#ff922b" />
        </DataBlock>

        <DataBlock title="4) Fairness Comparison (Completion Gap)">
          <BarChart data={fairnessBars} maxValue={1} />
        </DataBlock>

        <DataBlock title="5) Config Comparison (Easy vs Hard Completion Gap)">
          <BarChart data={compareBars} maxValue={1} />
        </DataBlock>
      </div>

      <section style={{ display: "grid", gap: 16 }}>
        <DataBlock title="Balancing Suggestions">
          {suggestions.length === 0 ? (
            <p>No suggestions yet (seeded telemetry is small).</p>
          ) : (
            <ul>
              {suggestions.map((item) => (
                <li key={`${item.rule_id}-${item.stage_id}`}>
                  <strong>{item.rule_id}</strong> — Stage {item.stage_id}: {item.expected_effect}
                </li>
              ))}
            </ul>
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
          {simulation && (
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(simulation, null, 2)}</pre>
          )}
        </DataBlock>
      </section>
    </main>
  );
}

export default Dashboard;