// Designer dashboard with charts and controls.
// Fetches metrics and renders charts from API data.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../api/base";

const CONFIGS = ["easy", "balanced", "hard"];

const DASHBOARD_ROLE_KEY = "dashboard_role";

function getDashboardRole() {
  return sessionStorage.getItem(DASHBOARD_ROLE_KEY) || "designer";
}

async function fetchJson(url, options = {}) {
  const role = getDashboardRole();
  const headers = {
    "Content-Type": "application/json",
    "X-Role": role,
    ...(options.headers || {}),
  };
  const res = await fetch(apiUrl(url), {
    ...options,
    headers,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data?.error?.message || data?.message || message;
    } catch {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {}
    }
    throw new Error(message);
  }
  // Always return parsed JSON for callers.
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

function decisionChangeLabel(ch) {
  if (!ch || typeof ch !== "object") return "Update recorded";
  if (typeof ch.summary === "string" && ch.summary.trim()) return ch.summary.trim();
  if (typeof ch.description === "string" && ch.description.trim()) return ch.description.trim();
  const skip = new Set(["summary", "description"]);
  const parts = Object.entries(ch)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => `${k}: ${v}`);
  return parts.length ? parts.join(", ") : "Update recorded";
}

function BarChart({ data, height = 18, valueFormatter, scaleMax }) {
  if (!data?.length) return <p>No data yet.</p>;

  // Compute min/max for scaling bars. Optional scaleMax (e.g. 0.2 for 20%) avoids compressing small values.
  const values = data.map((d) => d.value);
  const minValue = Math.min(...values, 0);
  const dataMax = Math.max(...values, 0, 1);
  const maxValue = scaleMax != null ? Math.max(scaleMax, dataMax) : dataMax;
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
  // Use three reference ticks (min/0/max).
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

function LineChart({ data, height = 180, color = "#37b24d", valueFormatter, yDomainMin, yDomainMax }) {
  if (!data?.length) return <p>No data yet.</p>;
  // Padding keeps axes labels visible.
  const padding = 36;
  const width = 560;
  const values = data.map((d) => d.value);
  const dataMax = Math.max(...values);
  // Default: scale Y from min(values)..max(values) (legacy). Optional fixed domain (e.g. yDomainMin=0)
  // makes absolute differences in seconds easier to read instead of zooming into a tight band.
  const minValue = yDomainMin !== undefined ? yDomainMin : Math.min(...values, 0);
  const maxValue =
    yDomainMax !== undefined ? yDomainMax : Math.max(dataMax, minValue + 1e-6, 1);
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

/** Easy vs hard completion rates on the same scale (0–100%). Shows separation; gap bars show the difference. */
function CompareDifficultyLines({ stages }) {
  if (!stages?.length) return <p>No comparison data yet.</p>;
  const padding = 36;
  const width = 560;
  const height = 200;
  const minValue = 0;
  const maxValue = 1;
  const range = maxValue - minValue || 1;
  const n = stages.length;
  const xDenom = Math.max(n - 1, 1);
  const formatPct = (v) => `${(v * 100).toFixed(1)}%`;

  const line = (getter) =>
    stages
      .map((s, i) => {
        const v = _clamp01(getter(s));
        const x = padding + (i / xDenom) * (width - padding * 2);
        const y = height - padding - ((v - minValue) / range) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");

  const easyLine = line((s) => s.by_config?.easy?.completion_rate ?? 0);
  const hardLine = line((s) => s.by_config?.hard?.completion_rate ?? 0);

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 16, fontSize: 12, marginBottom: 8, alignItems: "center" }}>
        <span>
          <span style={{ color: "#2f9e44", fontWeight: 600 }}>—</span> Easy clear %
        </span>
        <span>
          <span style={{ color: "#c92a2a", fontWeight: 600 }}>—</span> Hard clear %
        </span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {yTicks.map((tick, idx) => {
          const y = height - padding - ((tick - minValue) / range) * (height - padding * 2);
          return (
            <g key={`yl-${idx}`}>
              <line x1={padding} x2={width - padding} y1={y} y2={y} stroke="#ececec" />
              <text x={4} y={y + 4} fontSize="10" fill="#6b6b6b">
                {formatPct(tick)}
              </text>
            </g>
          );
        })}
        <polyline points={easyLine} fill="none" stroke="#2f9e44" strokeWidth="2.5" />
        <polyline points={hardLine} fill="none" stroke="#c92a2a" strokeWidth="2.5" />
        {stages.map((s, i) => {
          const x = padding + (i / xDenom) * (width - padding * 2);
          const show = n <= 10 || i % 2 === 0;
          return show ? (
            <text key={s.stage_id} x={x} y={height - 8} fontSize="10" fill="#6b6b6b" textAnchor="middle">
              {s.stage_id}
            </text>
          ) : null;
        })}
      </svg>
    </div>
  );
}

function _clamp01(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function FunnelTable({ stages }) {
  if (!stages?.length) return <p>No funnel data to show yet.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {[
            "Stage",
            "Started",
            "Cleared",
            "Failed",
            "Quit",
            "Clear %",
            "Fail %",
            "Drop to next stage",
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
    return <p>No result came back for that simulation.</p>;
  }

  const r = results.find((x) => Number(x.stage_id) === Number(stageId));
  if (!r) return <p>There is no simulation result for Stage {stageId}.</p>;

  const before = r.before || {};
  const after = r.after || {};

  const pct = (x) => ((x || 0) * 100);
  const fmt = (x) => `${x.toFixed(2)}%`;
  const delta = (a, b) => `${(b - a).toFixed(2)}%`;

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
            What this means
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {r.notes.map((n, idx) => (
              <li key={`${idx}-${n}`}>{n}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          No extra notes for this one.
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
  const [isLoading, setIsLoading] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [simStageId, setSimStageId] = useState(2);
  const [timerDelta, setTimerDelta] = useState(5);
  const [moveDelta, setMoveDelta] = useState(0);
  const [simulation, setSimulation] = useState(null);
  const [isSimulationLoading, setIsSimulationLoading] = useState(false);
  const [decisionStageId, setDecisionStageId] = useState(1);
  const [decisionChange, setDecisionChange] = useState("");
  const [decisionRationale, setDecisionRationale] = useState("");
  const [decisionEvidence, setDecisionEvidence] = useState("");
  const [decisionLog, setDecisionLog] = useState([]);

  const [editableStages, setEditableStages] = useState([]);
  const [paramEditStageId, setParamEditStageId] = useState(1);
  const [paramSaving, setParamSaving] = useState(false);
  const [paramLoadStatus, setParamLoadStatus] = useState("loading");
  const [paramLoadMessage, setParamLoadMessage] = useState("");

  const stageOptions = useMemo(() => {
    const ids = new Set();
  (funnel?.stages || []).forEach((s) => ids.add(s.stage_id));
  (stageStats?.stages || []).forEach((s) => ids.add(s.stage_id));

  const arr = Array.from(ids).sort((a, b) => a - b);
  return arr.length ? arr : [1, 2];
}, [funnel, stageStats]);
    

  async function loadMetrics(selectedConfig) {
    setError("");
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  async function loadParameters() {
    setParamLoadStatus("loading");
    setParamLoadMessage("");
    try {
      const data = await fetchJson(`/api/balancing/parameters?config_id=${configId}`);
      const stages = data.editable?.stages || [];
      setEditableStages(stages);
      if (!stages.length) {
        setParamLoadStatus("error");
        setParamLoadMessage("No stage parameters were returned. Ensure the server database has been initialised.");
      } else {
        setParamLoadStatus("ready");
      }
    } catch (e) {
      setEditableStages([]);
      setParamLoadStatus("error");
      setParamLoadMessage(e?.message || "Could not load stage parameters.");
    }
  }

  async function loadDecisionLog(selectedConfig) {
    try {
      const data = await fetchJson(`/api/decisions?config_id=${selectedConfig}`);
      const mapped = (data.decisions || []).map((entry) => ({
        id: entry.decision_id,
        stageId: entry.stage_id,
        change: decisionChangeLabel(entry.change),
        rationale: entry.rationale || "",
        evidence:
          Array.isArray(entry.evidence_links) && entry.evidence_links.length > 0
            ? entry.evidence_links.join(", ")
            : null,
        timestamp: entry.created_at
          ? new Date(entry.created_at).toLocaleString()
          : "Unknown time",
      }));
      setDecisionLog(mapped);
    } catch {
      setDecisionLog([]);
    }
  }

  async function runSimulation(e) {
    e.preventDefault();
    setError("");
    setSimulation(null);
    setIsSimulationLoading(true);
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
    } catch (err) {
      setError(err.message || "Failed to run simulation.");
      console.error("Simulation failed", err);
    } finally {
      setIsSimulationLoading(false);
    }
  }

  async function exportCsv() {
    try {
      // Download events as CSV for analysis.
      const res = await fetch(apiUrl(`/api/export/events.csv?config_id=${configId}`), {
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
    // Refresh all dashboard panels when config changes.
    loadMetrics(configId);
    loadSuggestions(configId);
    loadDecisionLog(configId);
    loadParameters();
  }, [configId]);

  useEffect(() => {
    if (!editableStages.length) return;
    if (!editableStages.some((s) => s.stage_id === paramEditStageId)) {
      setParamEditStageId(editableStages[0].stage_id);
    }
  }, [editableStages, paramEditStageId]);

// 2) Keep simStageId valid whenever stageOptions changes
useEffect(() => {
  const current = Number(simStageId);
  if (!stageOptions.includes(current)) {
    setSimStageId(stageOptions[0]);
  }
}, [stageOptions, simStageId]);

  useEffect(() => {
    setSimulation(null);
  }, [configId, simStageId, timerDelta, moveDelta]);

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
    R3_HELPERS_UNAFFORDABLE: "Helpers seem a bit too expensive for what players earn here.",
    R4_HELPERS_OVERUSED: "Players are relying on helpers a lot on this stage.",
    R5_FAIRNESS_VIOLATION: "Different player groups are getting noticeably different outcomes here.",
    R6_PROGRESSION_DROPOFF: "This is a point where a lot of players seem to drop off.",
  };

  async function saveStageParameters(e) {
    e.preventDefault();
    const stage = editableStages.find((s) => s.stage_id === paramEditStageId);
    if (!stage || isViewer) return;
    setParamSaving(true);
    setError("");
    try {
      await fetchJson(`/api/game/configs/${configId}/stages/${paramEditStageId}`, {
        method: "PUT",
        body: JSON.stringify({
          card_count: stage.card_count,
          timer_seconds: stage.timer_seconds,
          move_limit: stage.move_limit,
          mismatch_penalty_seconds: stage.mismatch_penalty_seconds,
          helpers: {
            peek_cost: stage.helpers?.peek_cost,
            freeze_cost: stage.helpers?.freeze_cost,
            shuffle_cost: stage.helpers?.shuffle_cost,
          },
          token_rules: {
            per_match: stage.token_rules?.per_match,
            on_complete: stage.token_rules?.on_complete,
          },
        }),
      });
      await loadParameters();
    } catch (err) {
      setError(err.message || "Failed to save stage parameters.");
    } finally {
      setParamSaving(false);
    }
  }

  async function addDecision(e) {
    e.preventDefault();
    const trimmedChange = decisionChange.trim();
    const trimmedRationale = decisionRationale.trim();
    const trimmedEvidence = decisionEvidence.trim();
    if (!trimmedChange || !trimmedRationale) return;

    try {
      await fetchJson("/api/decisions", {
        method: "POST",
        body: JSON.stringify({
          config_id: configId,
          stage_id: Number(decisionStageId),
          change: { summary: trimmedChange },
          rationale: trimmedRationale,
          evidence_links: trimmedEvidence ? [trimmedEvidence] : [],
        }),
      });
      setDecisionChange("");
      setDecisionRationale("");
      setDecisionEvidence("");
      loadDecisionLog(configId);
    } catch {
      setError("Failed to save decision note.");
    }
  }

  const isViewer = getDashboardRole() === "viewer";

  const paramStage = editableStages.find((s) => s.stage_id === paramEditStageId);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#0f172a",
      }}
    >
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Designer Dashboard</h1>
          <p style={{ marginTop: 0, opacity: 0.75 }}>
            A quick view of how players are getting on, where things feel too hard, and what might be worth adjusting.
          </p>
        </div>
        <Link to="/">
          <button type="button">Back to Home</button>
        </Link>
      </header>

      {isViewer && (
        <div style={{ padding: "10px 14px", background: "#e3f2fd", borderRadius: 8, fontSize: 14 }}>
          You are in view-only mode as <strong>viewer</strong>. Exporting data and adding decision notes are only available to designers.
        </div>
      )}

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

        <button type="button" onClick={() => loadMetrics(configId)} disabled={isLoading}>
          Refresh metrics
        </button>
        <button type="button" onClick={exportCsv} disabled={isViewer} title={isViewer ? "Designer only" : ""}>
          Export CSV
        </button>
      </div>

      {isLoading && (
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>Loading the latest dashboard data…</p>
      )}
      {error && <p style={{ color: "#b00020" }}>{error}</p>}

      <div style={{ display: "grid", gap: 16 }}>
      <DataBlock title="1) Player Funnel">
        <BarChart data={funnelBars} valueFormatter={formatPercent} />
        <div style={{ marginTop: 12 }}>
          <FunnelTable stages={funnel?.stages || []} />
        </div>
      </DataBlock>

        <DataBlock title="2) Where Players Struggle">
          <p style={{ fontSize: 12, opacity: 0.8, marginTop: 0 }}>
            Each bar is <strong>fails ÷ stage starts</strong>. You want the highest bar on the <strong>last</strong> stage:
            demo seeding is tuned so stage 10 is the worst step-up. Raw rates can still wobble when very few runs reach a
            late stage (small sample).
          </p>
          <BarChart data={spikeBars} valueFormatter={formatPercent} />
        </DataBlock>

        <DataBlock title="3) Time Spent by Stage">
          <p style={{ fontSize: 12, opacity: 0.8, marginTop: 0 }}>
            Average seconds from stage start to a <strong>successful clear</strong> (failed runs are excluded). The
            vertical scale starts at 0s so later stages do not look “flat” just because every stage finishes in a
            similar band of time.
          </p>
          <LineChart data={progressionTime} valueFormatter={formatSeconds} yDomainMin={0} />
        </DataBlock>

        <DataBlock title="4) Net Tokens by Stage">
          <p style={{ fontSize: 12, opacity: 0.8, marginTop: 0 }}>
            Average <strong>resource_gain</strong> minus <strong>resource_spend</strong> on <strong>successful clears</strong>{" "}
            only. Gains include per-match rewards plus the stage-completion bonus — later stages have more pairs, so totals
            should grow; spending on helpers (especially on harder stages) creates dips.
          </p>
          <LineChart data={progressionTokens} color="#ff922b" valueFormatter={formatTokens} yDomainMin={0} />
        </DataBlock>

        <DataBlock title="5) Fairness Check">
          <p style={{ fontSize: 12, opacity: 0.8, marginTop: 0 }}>
            This shows the gap in completion rates between different player groups. The scale is kept tight so smaller differences are easier to spot.
          </p>
          <BarChart data={fairnessBars} valueFormatter={formatPercent} scaleMax={0.20} />
        </DataBlock>

        <DataBlock title="6) Easy vs Hard Comparison">
          <p style={{ fontSize: 12, opacity: 0.85, marginTop: 0 }}>
            Each rate is <strong>clears ÷ starts for that stage only</strong> (people who never reached stage 7 do not
            count toward stage 7). Easy and hard therefore measure <strong>different cohorts</strong> at late stages:
            hard mode players who still reach stage 9 are usually stronger, so their clear rate can stay high and the{" "}
            <strong>easy−hard gap</strong> does not have to grow smoothly with stage number. The line chart shows both
            difficulties on the same 0–100% scale; the bars show the gap (easy − hard) per stage.
          </p>
          <CompareDifficultyLines stages={compare?.stages} />
          <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 8, marginTop: 0 }}>
            Gap (easy clear % minus hard clear %)
          </p>
          <BarChart data={compareBars} valueFormatter={formatPercent} />
        </DataBlock>
      </div>

      <section style={{ display: "grid", gap: 16 }}>
        <DataBlock title="Stage parameters (per difficulty & stage)">
          <p style={{ marginTop: 0, fontSize: 13, opacity: 0.85 }}>
            Values are loaded from the server database for the selected difficulty (config). Adjust timing, board size,
            helper token costs, and token reward rules for one stage at a time. Saving writes changes back to the
            database (designers only; viewers see this section read-only).
          </p>
          {paramLoadStatus === "loading" && (
            <p style={{ fontSize: 13, opacity: 0.8 }}>Loading parameters…</p>
          )}
          {paramLoadStatus === "error" && (
            <div style={{ fontSize: 13 }}>
              <p style={{ color: "#b00020", marginTop: 0 }}>{paramLoadMessage}</p>
              <button type="button" onClick={() => loadParameters()}>
                Retry
              </button>
            </div>
          )}
          {paramLoadStatus === "ready" && editableStages.length > 0 ? (
            <form onSubmit={saveStageParameters} style={{ display: "grid", gap: 10, maxWidth: 480 }}>
              <label>
                Stage
                <select
                  value={paramEditStageId}
                  onChange={(e) => setParamEditStageId(Number(e.target.value))}
                  style={{ marginLeft: 8 }}
                  disabled={isViewer}
                >
                  {editableStages.map((s) => (
                    <option key={s.stage_id} value={s.stage_id}>
                      Stage {s.stage_id}
                    </option>
                  ))}
                </select>
              </label>
              {paramStage && (
                <>
                  <label>
                    1) Card count
                    <input
                      type="number"
                      min={4}
                      value={paramStage.card_count ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setEditableStages((prev) =>
                          prev.map((s) =>
                            s.stage_id === paramEditStageId ? { ...s, card_count: v } : s
                          )
                        );
                      }}
                      disabled={isViewer}
                      style={{ marginLeft: 8, width: "100%" }}
                    />
                  </label>
                  <label>
                    2) Timer (seconds)
                    <input
                      type="number"
                      min={1}
                      value={paramStage.timer_seconds ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setEditableStages((prev) =>
                          prev.map((s) =>
                            s.stage_id === paramEditStageId ? { ...s, timer_seconds: v } : s
                          )
                        );
                      }}
                      disabled={isViewer}
                      style={{ marginLeft: 8, width: "100%" }}
                    />
                  </label>
                  <label>
                    3) Move limit
                    <input
                      type="number"
                      min={1}
                      value={paramStage.move_limit ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setEditableStages((prev) =>
                          prev.map((s) =>
                            s.stage_id === paramEditStageId ? { ...s, move_limit: v } : s
                          )
                        );
                      }}
                      disabled={isViewer}
                      style={{ marginLeft: 8, width: "100%" }}
                    />
                  </label>
                  <label>
                    4) Mismatch penalty (seconds)
                    <input
                      type="number"
                      min={0}
                      value={paramStage.mismatch_penalty_seconds ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setEditableStages((prev) =>
                          prev.map((s) =>
                            s.stage_id === paramEditStageId ? { ...s, mismatch_penalty_seconds: v } : s
                          )
                        );
                      }}
                      disabled={isViewer}
                      style={{ marginLeft: 8, width: "100%" }}
                    />
                  </label>
                  <label>
                    5) Peek cost (tokens)
                    <input
                      type="number"
                      min={0}
                      value={paramStage.helpers?.peek_cost ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setEditableStages((prev) =>
                          prev.map((s) =>
                            s.stage_id === paramEditStageId
                              ? {
                                  ...s,
                                  helpers: { ...s.helpers, peek_cost: v },
                                }
                              : s
                          )
                        );
                      }}
                      disabled={isViewer}
                      style={{ marginLeft: 8, width: "100%" }}
                    />
                  </label>
                  <label>
                    6) Freeze cost (tokens)
                    <input
                      type="number"
                      min={0}
                      value={paramStage.helpers?.freeze_cost ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setEditableStages((prev) =>
                          prev.map((s) =>
                            s.stage_id === paramEditStageId
                              ? {
                                  ...s,
                                  helpers: { ...s.helpers, freeze_cost: v },
                                }
                              : s
                          )
                        );
                      }}
                      disabled={isViewer}
                      style={{ marginLeft: 8, width: "100%" }}
                    />
                  </label>
                  <label>
                    7) Undo cost (tokens)
                    <input
                      type="number"
                      min={0}
                      value={paramStage.helpers?.shuffle_cost ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setEditableStages((prev) =>
                          prev.map((s) =>
                            s.stage_id === paramEditStageId
                              ? {
                                  ...s,
                                  helpers: { ...s.helpers, shuffle_cost: v },
                                }
                              : s
                          )
                        );
                      }}
                      disabled={isViewer}
                      style={{ marginLeft: 8, width: "100%" }}
                    />
                  </label>
                  <label>
                    8) Tokens per match
                    <input
                      type="number"
                      min={0}
                      value={paramStage.token_rules?.per_match ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setEditableStages((prev) =>
                          prev.map((s) =>
                            s.stage_id === paramEditStageId
                              ? {
                                  ...s,
                                  token_rules: { ...s.token_rules, per_match: v },
                                }
                              : s
                          )
                        );
                      }}
                      disabled={isViewer}
                      style={{ marginLeft: 8, width: "100%" }}
                    />
                  </label>
                  <label>
                    9) Tokens on stage complete
                    <input
                      type="number"
                      min={0}
                      value={paramStage.token_rules?.on_complete ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setEditableStages((prev) =>
                          prev.map((s) =>
                            s.stage_id === paramEditStageId
                              ? {
                                  ...s,
                                  token_rules: { ...s.token_rules, on_complete: v },
                                }
                              : s
                          )
                        );
                      }}
                      disabled={isViewer}
                      style={{ marginLeft: 8, width: "100%" }}
                    />
                  </label>
                </>
              )}
              {!isViewer && (
                <button type="submit" disabled={paramSaving || !paramStage}>
                  {paramSaving ? "Saving…" : "Save parameters for this stage"}
                </button>
              )}
            </form>
          ) : null}
        </DataBlock>

        <DataBlock title="Quick Takeaways">
          {suggestions.length === 0 ? (
            <p>Nothing stands out yet, but there may just not be enough data to call it confidently.</p>
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

        <DataBlock title="Decision notes">
          {!isViewer && (
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
              What we changed
              <input
                type="text"
                value={decisionChange}
                onChange={(e) => setDecisionChange(e.target.value)}
                placeholder="e.g. Peek cost 3 → 2"
                style={{ marginLeft: 8, width: "100%" }}
              />
            </label>
            <label>
              Why
              <input
                type="text"
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                placeholder="Short reason in your own words"
                style={{ marginLeft: 8, width: "100%" }}
              />
            </label>
            <label>
              Optional: link or where you saw it
              <input
                type="text"
                value={decisionEvidence}
                onChange={(e) => setDecisionEvidence(e.target.value)}
                placeholder="e.g. funnel export, playtest 12 Mar"
                style={{ marginLeft: 8, width: "100%" }}
              />
            </label>
            <button type="submit">Save note</button>
          </form>
          )}

          {decisionLog.length === 0 ? (
            <p style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>
              No notes yet.
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
                  <div style={{ marginTop: 4 }}>{entry.rationale}</div>
                  {entry.evidence ? (
                    <div style={{ marginTop: 4, opacity: 0.8 }}>{entry.evidence}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </DataBlock>

        <DataBlock title="Simulation">
          <form onSubmit={runSimulation} style={{ display: "grid", gap: 8 }}>
            <label>
              Stage
              <select
                value={simStageId}
                onChange={(e) => setSimStageId(Number(e.target.value))}
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
              Change timer by (seconds)
              <input
                type="number"
                value={timerDelta}
                onChange={(e) => setTimerDelta(e.target.value)}
                style={{ marginLeft: 8 }}
              />
            </label>
            <label>
              Change move limit by
              <input
                type="number"
                value={moveDelta}
                onChange={(e) => setMoveDelta(e.target.value)}
                style={{ marginLeft: 8 }}
              />
            </label>
            <button type="submit" disabled={isSimulationLoading}>
              {isSimulationLoading ? "Running…" : "Run simulation"}
            </button>
            {isSimulationLoading && <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>Trying that change against the current data…</p>}
          </form>
          {simulation && <SimulationResult simulation={simulation} stageId={simStageId} />}
        </DataBlock>
      </section>
    </main>
    </div>
  );
}

export default Dashboard;