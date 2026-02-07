import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/game.css";
import HUD from "../components/HUD";
import Board from "../components/Board";
import Controls from "../components/Controls";
import Modal from "../components/Modal";

import { DIFFICULTY_CONFIGS } from "../game/stages";
import { buildDeck } from "../game/deck";

function Game() {
  const navigate = useNavigate();

  const stages = DIFFICULTY_CONFIGS.balanced;

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

  // Reset when stage changes
  useEffect(() => {
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
    setFailReason("timeout");
    setLockInput(true);
    setTimerRunning(false);
  }, [timeRemaining, status]);

  // fail when moves hits 0
  useEffect(() => {
    if (status !== "playing") return;
    if (movesRemaining > 0) return;
    setStatus("lost");
    setFailReason("moves");
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
    }, 700);

    return () => clearTimeout(t);
  }, [flippedUids]);

  // stage complete
  useEffect(() => {
    if (status !== "playing") return;
    if (deck.length > 0 && matchedUids.size === deck.length) {
      setStatus("won");
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

    setTimeout(() => {
      setHintUids([]);
      setPeekActive(false);
    }, 1000);
  }

  function useFreeze() {
  if (status !== "playing") return;

  const cost = stage.powerupCosts.freeze;
  if (tokens < cost) return;

  setTokens((t) => t - cost);

  const FREEZE_DURATION_MS = 5000; //  5 seconds
  setFreezeUntil(Date.now() + FREEZE_DURATION_MS);
}
  
    function useUndo() {
    if (status !== "playing") return;
    const cost = stage.powerupCosts.undo;
    if (tokens < cost) return;
    if (!lastSnapshot) return;

    setTokens((t) => t - cost);

    setFlippedUids([]);
    setMatchedUids(new Set(lastSnapshot.matchedUids));
    setTimeRemaining(lastSnapshot.timeRemaining);
    setMovesRemaining(lastSnapshot.movesRemaining);

    setLastSnapshot(null);
  }

  function retryStage() {
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
            {failReason === "timeout"
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