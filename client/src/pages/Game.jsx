import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { track } from "../telemetry/events";

import "../styles/game.css";
import HUD from "../components/HUD";
import Board from "../components/Board";
import Controls from "../components/Controls";
import Modal from "../components/Modal";

import { buildDeck } from "../game/deck";

// --- backend -> frontend normaliser (snake_case -> your existing stage shape)
function normaliseBackendConfig(cfg) {
  return {
    configId: cfg.config_id,
    label: cfg.label,
    startTokens: cfg.start_tokens ?? 0,
    stages: (cfg.stages ?? []).map((s) => ({
      // keep names your current code expects:
      stageId: s.stage_id,
      rows: s.rows,
      cols: s.cols,
      timeLimit: s.timer_seconds,
      moveLimit: s.move_limit,
      penaltyMismatchTime: s.mismatch_penalty_seconds,

      rewardMatch: s.token_rules?.per_match ?? 0,
      stageWinTokens: s.token_rules?.on_complete ?? 0,

      powerupCosts: {
        peek: s.helpers?.peek?.cost ?? 999,
        freeze: s.helpers?.freeze?.cost ?? 999,
        undo: s.helpers?.undo?.cost ?? 999,
      },

      powerupDurationsMs: {
        peek: (s.helpers?.peek?.effect_seconds ?? 1) * 1000,
        freeze: (s.helpers?.freeze?.effect_seconds ?? 0) * 1000,
      },

      // optional: keep for debugging/validation
      cardCount: s.card_count,
    })),
  };
}

function Game() {
  const navigate = useNavigate();

  // -----------------------------
  // backend config + stages
  // -----------------------------
  const [gameConfig, setGameConfig] = useState(null);
  const [stages, setStages] = useState([]);
  const [stageIndex, setStageIndex] = useState(0);
  const stage = stages[stageIndex];

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // -----------------------------
  // game state (guarded: don’t read stage.* until stage exists)
  // -----------------------------
  const [deck, setDeck] = useState([]);
  const [flippedUids, setFlippedUids] = useState([]);
  const [matchedUids, setMatchedUids] = useState(() => new Set());
  const [lockInput, setLockInput] = useState(false);

  // counters
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [movesRemaining, setMovesRemaining] = useState(0);

  // IMPORTANT: tokens come from config.start_tokens (once), and persist across stages
  const [tokens, setTokens] = useState(0);

  // timer runs only after first flip
  const [timerRunning, setTimerRunning] = useState(false);

  // powerups
  const [peekActive, setPeekActive] = useState(false);
  const [hintUids, setHintUids] = useState([]);
  const [freezeUntil, setFreezeUntil] = useState(0);

  // undo snapshot
  const [lastSnapshot, setLastSnapshot] = useState(null);

  // status
  const [status, setStatus] = useState("playing");
  const [failReason, setFailReason] = useState(null);

  // keep your existing mount telemetry
  useEffect(() => {
    track("stage_start", { mode: "player" });

    return () => {
      track("stage_end", { mode: "player" });
    };
  }, []);

  // -----------------------------
  // Fetch config once (swap 'balanced' later if you have difficulty selection)
  // -----------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        setLoading(true);
        setLoadError(null);

        const configId = "balanced";

        // If you use a Vite proxy, this can be `/api/game/configs/${configId}`
        const baseUrl =
          import.meta?.env?.VITE_API_BASE_URL || "http://127.0.0.1:5000";
        const res = await fetch(`${baseUrl}/api/game/configs/${configId}`);

        if (!res.ok) throw new Error(`Failed to load config (${res.status})`);

        const data = await res.json();
        const norm = normaliseBackendConfig(data.config);

        if (cancelled) return;

        setGameConfig(norm);
        setStages(norm.stages);
        setStageIndex(0);

        // set start tokens ONCE from backend
        setTokens(norm.startTokens);

        setLoading(false);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setLoadError(err?.message || "Failed to load config");
        setLoading(false);
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset when stage changes (guarded)
  useEffect(() => {
    if (!stage) return;

    setDeck(buildDeck(stage));
    setFlippedUids([]);
    setMatchedUids(new Set());
    setLockInput(false);

    setTimeRemaining(stage.timeLimit);
    setMovesRemaining(stage.moveLimit);

    setStatus("playing");
    setFailReason(null);

    setTimerRunning(false);
    setPeekActive(false);
    setHintUids([]);
    setFreezeUntil(0);
    setLastSnapshot(null);

    track("stage_start", {
      stageId: stage.stageId,
      rows: stage.rows,
      cols: stage.cols,
      timeLimit: stage.timeLimit,
      moveLimit: stage.moveLimit,
    });
  }, [stageIndex, stage]);

  const cardByUid = useMemo(() => {
    const map = new Map();
    deck.forEach((c) => map.set(c.uid, c));
    return map;
  }, [deck]);

  // Countdown timer
  useEffect(() => {
    if (!stage) return;
    if (status !== "playing") return;
    if (!timerRunning) return;

    const interval = setInterval(() => {
      if (Date.now() < freezeUntil) return;
      setTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [stage, status, timerRunning, freezeUntil]);

  // ✅ FIX: fail when time hits 0 ONLY after the run has started
  useEffect(() => {
    if (!stage) return;
    if (status !== "playing") return;
    if (!timerRunning) return; // <-- important gate
    if (timeRemaining > 0) return;

    setStatus("lost");
    setFailReason("timeout");

    track("stage_failed", {
      stageId: stage.stageId,
      reason: "timeout",
      timeRemaining,
      movesRemaining,
      tokens,
    });

    setLockInput(true);
    setTimerRunning(false);
  }, [stage, timeRemaining, status, movesRemaining, tokens, timerRunning]);

  // ✅ FIX: fail when moves hits 0 ONLY after the run has started
  useEffect(() => {
    if (!stage) return;
    if (status !== "playing") return;
    if (!timerRunning) return; // <-- important gate
    if (movesRemaining > 0) return;

    setStatus("lost");
    setFailReason("moves");

    track("stage_failed", {
      stageId: stage.stageId,
      reason: "moves",
      timeRemaining,
      movesRemaining,
      tokens,
    });

    setLockInput(true);
    setTimerRunning(false);
  }, [stage, movesRemaining, status, timeRemaining, tokens, timerRunning]);

  function handleFlip(uid) {
    if (!stage) return;
    if (status !== "playing") return;
    if (lockInput) return;
    if (matchedUids.has(uid)) return;
    if (flippedUids.includes(uid)) return;
    if (flippedUids.length >= 2) return;

    if (!timerRunning) setTimerRunning(true);

    track("card_flip", {
      stageId: stage.stageId,
      cardId: cardByUid.get(uid)?.id,
      timeRemaining,
      movesRemaining,
    });

    setFlippedUids((prev) => [...prev, uid]);
  }

  // Resolve when 2 cards are flipped
  useEffect(() => {
    if (!stage) return;
    if (status !== "playing") return;
    if (flippedUids.length !== 2) return;

    const [aUid, bUid] = flippedUids;
    const a = cardByUid.get(aUid);
    const b = cardByUid.get(bUid);
    if (!a || !b) return;

    setLastSnapshot({
      matchedUids: new Set(matchedUids),
      timeRemaining,
      movesRemaining,
    });

    setLockInput(true);
    const isMatch = a.id === b.id;

    const t = setTimeout(() => {
      setMovesRemaining((m) => Math.max(0, m - 1));

      if (isMatch) {
        setMatchedUids((prev) => {
          const next = new Set(prev);
          next.add(aUid);
          next.add(bUid);
          return next;
        });
      } else {
        setTimeRemaining((tRem) =>
          Math.max(0, tRem - stage.penaltyMismatchTime)
        );
      }

      setFlippedUids([]);
      setLockInput(false);

      track(isMatch ? "match_success" : "match_fail", {
        stageId: stage.stageId,
        cardAId: a.id,
        cardBId: b.id,
        timeRemaining,
        movesRemaining,
      });
    }, 700);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flippedUids]);

  // stage complete
  useEffect(() => {
    if (!stage) return;
    if (status !== "playing") return;

    if (deck.length > 0 && matchedUids.size === deck.length) {
      setStatus("won");

      track("stage_complete", {
        stageId: stage.stageId,
        timeRemaining,
        movesRemaining,
        tokensEarned: tokens + stage.stageWinTokens,
      });

      setLockInput(true);
      setTimerRunning(false);
      setTokens((t) => t + stage.stageWinTokens);
    }
  }, [
    stage,
    matchedUids,
    deck.length,
    status,
    stage?.stageWinTokens,
    timeRemaining,
    movesRemaining,
    tokens,
  ]);

  // Peek (reveals one matching pair)
  function usePeek() {
    if (!stage) return;
    if (status !== "playing") return;

    const cost = stage.powerupCosts.peek;
    if (tokens < cost) return;

    track("powerup_used", {
      stageId: stage.stageId,
      powerup: "peek",
      cost: stage.powerupCosts.peek,
      tokensBefore: tokens,
    });

    const unmatched = deck.filter(
      (c) => !matchedUids.has(c.uid) && !flippedUids.includes(c.uid)
    );

    const groups = {};
    unmatched.forEach((c) => {
      groups[c.id] = groups[c.id] || [];
      groups[c.id].push(c);
    });

    const pair = Object.values(groups).find((g) => g.length >= 2);
    if (!pair) return;

    const [a, b] = pair;

    setTokens((t) => t - cost);
    setHintUids([a.uid, b.uid]);
    setPeekActive(true);

    const duration = stage.powerupDurationsMs?.peek ?? 1000;
    setTimeout(() => {
      setHintUids([]);
      setPeekActive(false);
    }, duration);
  }

  function useFreeze() {
    if (!stage) return;
    if (status !== "playing") return;

    const cost = stage.powerupCosts.freeze;
    if (tokens < cost) return;

    track("powerup_used", {
      stageId: stage.stageId,
      powerup: "freeze",
      cost: stage.powerupCosts.freeze,
      tokensBefore: tokens,
    });

    setTokens((t) => t - cost);

    const duration = stage.powerupDurationsMs?.freeze ?? 0;
    setFreezeUntil(Date.now() + duration);
  }

  function useUndo() {
    if (!stage) return;
    if (status !== "playing") return;

    const cost = stage.powerupCosts.undo;
    if (tokens < cost) return;
    if (!lastSnapshot) return;

    track("powerup_used", {
      stageId: stage.stageId,
      powerup: "undo",
      cost: stage.powerupCosts.undo,
      tokensBefore: tokens,
    });
    setTokens((t) => t - cost);

    setFlippedUids([]);
    setMatchedUids(new Set(lastSnapshot.matchedUids));
    setTimeRemaining(lastSnapshot.timeRemaining);
    setMovesRemaining(lastSnapshot.movesRemaining);

    setLastSnapshot(null);
  }

  function retryStage() {
    if (!stage) return;

    track("stage_retry", {
      stageId: stage.stageId,
      timeRemaining,
      movesRemaining,
      tokens,
    });

    setDeck(buildDeck(stage));
    setFlippedUids([]);
    setMatchedUids(new Set());
    setLockInput(false);

    setTimeRemaining(stage.timeLimit);
    setMovesRemaining(stage.moveLimit);

    setStatus("playing");
    setFailReason(null);

    setTimerRunning(false);
    setPeekActive(false);
    setHintUids([]);
    setFreezeUntil(0);
    setLastSnapshot(null);
  }

  function nextStage() {
    if (stageIndex < stages.length - 1) {
      setStageIndex((i) => i + 1);
    } else {
      navigate("/");
    }
  }

  function quitToMenu() {
    navigate("/");

    if (!stage) return;
    track("quit_to_menu", {
      stageId: stage.stageId,
      timeRemaining,
      movesRemaining,
      tokens,
    });
  }

  // -----------------------------
  // Loading / error / guard UI
  // -----------------------------
  if (loading) {
    return (
      <main className="game">
        <p style={{ padding: 16 }}>Loading game config…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="game">
        <p style={{ padding: 16 }}>
          Failed to load config: <b>{loadError}</b>
        </p>
        <button type="button" onClick={() => navigate("/")}>
          Back to menu
        </button>
      </main>
    );
  }

  if (!stage) {
    return (
      <main className="game">
        <p style={{ padding: 16 }}>No stages found in config.</p>
        <button type="button" onClick={() => navigate("/")}>
          Back to menu
        </button>
      </main>
    );
  }

  return (
    <main className="game">
      <HUD
        stageId={stage.stageId}
        timeRemaining={timeRemaining}
        movesRemaining={movesRemaining}
        tokens={tokens}
      />

      <Board
        deck={deck}
        flippedUids={[...flippedUids, ...hintUids]}
        matchedUids={matchedUids}
        onFlip={handleFlip}
        peekActive={peekActive}
      />

      <Controls
        costs={stage.powerupCosts}
        tokens={tokens}
        onPeek={usePeek}
        onFreeze={useFreeze}
        onUndo={useUndo}
        onRetry={retryStage}
        onQuit={quitToMenu}
      />

      {status === "won" && (
        <Modal title="You Won!">
          <p>
            Stage {stage.stageId} complete — you earned{" "}
            <b>+{stage.stageWinTokens}</b> tokens.
          </p>
          <p>
            Tokens: <b>{tokens}</b> • Time left: <b>{timeRemaining}</b> • Moves
            left: <b>{movesRemaining}</b>
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <button type="button" onClick={nextStage}>
              Next Stage
            </button>
            <button type="button" onClick={quitToMenu}>
              Quit
            </button>
          </div>
        </Modal>
      )}

      {status === "lost" && (
        <Modal title="You Lost">
          <p>
            {failReason === "timeout"
              ? "You ran out of time."
              : "You ran out of moves."}
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <button type="button" onClick={retryStage}>
              Retry
            </button>
            <button type="button" onClick={quitToMenu}>
              Quit
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

export default Game;
