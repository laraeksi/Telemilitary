import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { endSession, startSession, trackEvent } from "../telemetry/events";

import { DIFFICULTY_CONFIGS } from "../game/stages";
import { buildDeck } from "../game/deck";

import "../styles/game.css";
import HUD from "../components/HUD";
import Board from "../components/Board";
import Controls from "../components/Controls";
import Modal from "../components/Modal";


function Game() {
  const navigate = useNavigate();

  const configId = localStorage.getItem("telemetry_config_id_v1") || "balanced";
  const stages = DIFFICULTY_CONFIGS[configId] || DIFFICULTY_CONFIGS.balanced;

  const [stageIndex, setStageIndex] = useState(0);
  const stage = stages[stageIndex];

  const [deck, setDeck] = useState(() => buildDeck(stage));
  const [flippedUids, setFlippedUids] = useState([]);
  const [matchedUids, setMatchedUids] = useState(() => new Set());
  const [lockInput, setLockInput] = useState(false);

  // counters
  const [timeRemaining, setTimeRemaining] = useState(stage.timeLimit);
  const [movesRemaining, setMovesRemaining] = useState(stage.moveLimit);
  const [tokens, setTokens] = useState(stage.startTokens);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [tokensSpent, setTokensSpent] = useState(0);

  // timer runs only after first flip
  const [timerRunning, setTimerRunning] = useState(false);

  // powerups
  const [peekActive, setPeekActive] = useState(false);
  const [hintUids, setHintUids] = useState([]); // ✅ NEW
  const [freezeUntil, setFreezeUntil] = useState(0);

  // undo snapshot
  const [lastSnapshot, setLastSnapshot] = useState(null);

  // status
  const [status, setStatus] = useState("playing");
  const [failReason, setFailReason] = useState(null);

  useEffect(() => {
    startSession(configId);
  }, [configId]);

  // Reset when stage changes
  useEffect(() => {
    setDeck(buildDeck(stage));
    setFlippedUids([]);
    setMatchedUids(new Set());
    setLockInput(false);

    setTimeRemaining(stage.timeLimit);
    setMovesRemaining(stage.moveLimit);
    setTokens(stage.startTokens);
    setTokensEarned(0);
    setTokensSpent(0);

    setStatus("playing");
    setFailReason(null);

    setTimerRunning(false);
    setPeekActive(false);
    setHintUids([]);
    setFreezeUntil(0);
    setLastSnapshot(null);

    trackEvent("stage_start", {
      stageId: stage.stageId,
      timer_seconds: stage.timeLimit,
      move_limit: stage.moveLimit,
      card_count: stage.rows * stage.cols,
      token_start: stage.startTokens,
    });
  }, [stageIndex]);

  const cardByUid = useMemo(() => {
    const map = new Map();
    deck.forEach((c) => map.set(c.uid, c));
    return map;
  }, [deck]);

  // Countdown timer
  useEffect(() => {
    if (status !== "playing") return;
    if (!timerRunning) return;

    const interval = setInterval(() => {
      if (Date.now() < freezeUntil) return;
      setTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, timerRunning, freezeUntil]);

  // fail when time hits 0
  useEffect(() => {
    if (status !== "playing") return;
    if (timeRemaining > 0) return;
    setStatus("lost");
    setFailReason("time");

    trackEvent("stage_fail", {
      stageId: stage.stageId,
      fail_reason: "time",
      time_remaining: timeRemaining,
      moves_remaining: movesRemaining,
      tokens_earned: tokensEarned,
      tokens_spent: tokensSpent,
    });

    setLockInput(true);
    setTimerRunning(false);
  }, [timeRemaining, status]);

  // fail when moves hits 0
  useEffect(() => {
    if (status !== "playing") return;
    if (movesRemaining > 0) return;
    setStatus("lost");
    setFailReason("moves");

    trackEvent("stage_fail", {
      stageId: stage.stageId,
      fail_reason: "moves",
      time_remaining: timeRemaining,
      moves_remaining: movesRemaining,
      tokens_earned: tokensEarned,
      tokens_spent: tokensSpent,
    });

    setLockInput(true);
    setTimerRunning(false);
  }, [movesRemaining, status]);

  function handleFlip(uid) {
    if (status !== "playing") return;
    if (lockInput) return;
    if (matchedUids.has(uid)) return;
    if (flippedUids.includes(uid)) return;
    if (flippedUids.length >= 2) return;

    if (!timerRunning) setTimerRunning(true);

    
    const cardIndex = deck.findIndex((card) => card.uid === uid);
    trackEvent("card_flip", {
      stageId: stage.stageId,
      card_index: cardIndex,
      is_first_flip: flippedUids.length === 0,
    });

    setFlippedUids((prev) => [...prev, uid]);
  }

  // Resolve when 2 cards are flipped
  useEffect(() => {
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
      const nextMovesRemaining = Math.max(0, movesRemaining - 1);
      setMovesRemaining(nextMovesRemaining);

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
    
      trackEvent(isMatch ? "match_success" : "match_fail", {
        stageId: stage.stageId,
        cards: [a.id, b.id],
        penalty_seconds: isMatch ? 0 : stage.penaltyMismatchTime,
        moves_used: stage.moveLimit - nextMovesRemaining,
        moves_remaining: nextMovesRemaining,
        time_remaining: timeRemaining,
        tokens_after: tokens,
      });

      trackEvent("move_used", {
        stageId: stage.stageId,
        moves_used: stage.moveLimit - nextMovesRemaining,
        moves_remaining: nextMovesRemaining,
      });
    }, 700);

    return () => clearTimeout(t);
  }, [flippedUids]);

  // stage complete
  useEffect(() => {
    if (status !== "playing") return;
    if (deck.length > 0 && matchedUids.size === deck.length) {
      setStatus("won");
      const updatedTokensEarned = tokensEarned + stage.stageWinTokens;

      trackEvent("stage_complete", {
        stageId: stage.stageId,
        time_remaining: timeRemaining,
        moves_remaining: movesRemaining,
        total_moves_used: stage.moveLimit - movesRemaining,
        tokens_earned: updatedTokensEarned,
        tokens_spent: tokensSpent,
      });

      trackEvent("resource_gain", {
        stageId: stage.stageId,
        amount: stage.stageWinTokens,
        reason: "stage_complete",
      });

      setTokensEarned(updatedTokensEarned);
      setLockInput(true);
      setTimerRunning(false);
      setTokens((t) => t + stage.stageWinTokens);
    }
  }, [matchedUids, deck.length, status, stage.stageWinTokens]);

  //  UPDATED HINT (reveals ONE matching pair)
  function usePeek() {
    if (status !== "playing") return;

    const cost = stage.powerupCosts.peek;
    if (tokens < cost) return;

    trackEvent("powerup_used", {
      stageId: stage.stageId,
      powerup_type: "peek",
      effect_duration_seconds: 1,
    });
    trackEvent("resource_spend", {
      stageId: stage.stageId,
      amount: cost,
      powerup_type: "peek",
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
    setTokensSpent((spent) => spent + cost);
    setHintUids([a.uid, b.uid]);
    setPeekActive(true);

    setTimeout(() => {
      setHintUids([]);
      setPeekActive(false);
    }, 1000);
  }

  function useFreeze() {
  if (status !== "playing") return;

  const cost = stage.powerupCosts.freeze;
  if (tokens < cost) return;
  trackEvent("powerup_used", {
    stageId: stage.stageId,
    powerup_type: "freeze",
    effect_duration_seconds: 5,
  });
  trackEvent("resource_spend", {
    stageId: stage.stageId,
    amount: cost,
    powerup_type: "freeze",
  });

  setTokens((t) => t - cost);
  setTokensSpent((spent) => spent + cost);

  const FREEZE_DURATION_MS = 5000; //  5 seconds
  setFreezeUntil(Date.now() + FREEZE_DURATION_MS);
}
  
    function useUndo() {
    if (status !== "playing") return;
    const cost = stage.powerupCosts.undo;
    if (tokens < cost) return;
    if (!lastSnapshot) return;

    trackEvent("powerup_used", {
      stageId: stage.stageId,
      powerup_type: "undo",
      effect_duration_seconds: 0,
    });
    trackEvent("resource_spend", {
      stageId: stage.stageId,
      amount: cost,
      powerup_type: "undo",
    });
    setTokens((t) => t - cost);
    setTokensSpent((spent) => spent + cost);

    setFlippedUids([]);
    setMatchedUids(new Set(lastSnapshot.matchedUids));
    setTimeRemaining(lastSnapshot.timeRemaining);
    setMovesRemaining(lastSnapshot.movesRemaining);

    setLastSnapshot(null);
  }

  function retryStage() {

    trackEvent("retry", {
      stageId: stage.stageId,
      reason: "manual_retry",
    });

    setDeck(buildDeck(stage));
    setFlippedUids([]);
    setMatchedUids(new Set());
    setLockInput(false);

    setTimeRemaining(stage.timeLimit);
    setMovesRemaining(stage.moveLimit);
    setTokens(stage.startTokens);
    setTokensEarned(0);
    setTokensSpent(0);

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
      endSession("completed", stage.stageId);
      navigate("/");
    }
  }

  function quitToMenu() {
    navigate("/");

    trackEvent("quit", {
      stageId: stage.stageId,
      reason: "quit_to_menu",
    });
    endSession("quit", stage.stageId);
  }

  return (
    <main className="game">
      <HUD
        configId={configId}
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
            Stage {stage.stageId} complete — you earned <b>+{stage.stageWinTokens}</b> tokens.
          </p>
          <p>
            Tokens: <b>{tokens}</b> • Time left: <b>{timeRemaining}</b> • Moves left: <b>{movesRemaining}</b>
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" onClick={nextStage}>Next Stage</button>
            <button type="button" onClick={quitToMenu}>Quit</button>
          </div>
        </Modal>
      )}

      {status === "lost" && (
        <Modal title="You Lost">
          <p>
            {failReason === "time"
              ? "You ran out of time."
              : "You ran out of moves."}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" onClick={retryStage}>Retry</button>
            <button type="button" onClick={quitToMenu}>Quit</button>
          </div>
        </Modal>
      )}
    </main>
  );
}

export default Game; 