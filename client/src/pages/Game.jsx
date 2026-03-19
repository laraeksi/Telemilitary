// Main game loop and UI logic for a play session.
// Handles timers, state updates, and telemetry events.
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
import {
  playFlip,
  playMatch,
  playMismatch,
  playStageComplete,
  playStageFail,
  getSfxEnabled,
  setSfxEnabled,
  getMusicEnabled,
  setMusicEnabled,
  startBackgroundMusic,
  setBackgroundMusicPressure,
  stopBackgroundMusic,
  playReward,
  playFinalVictory,
  speakCelebration,
  stopCelebrationSpeech,
} from "../audio/sounds";
import confetti from "canvas-confetti";

const STYLE_THEME_KEY = "style_theme_v1";
const STYLE_UNLOCKS_KEY = "style_unlocked_v1";
const PLAYER_TOKEN_KEY = "player_tokens_v1";

const STYLE_THEMES = [
  { id: "classic", name: "Classic", desc: "Default look.", cost: 0 },
  { id: "neon", name: "Neon", desc: "Cyber pink + purple glow.", cost: 25 },
  { id: "forest", name: "Forest", desc: "Green calm theme.", cost: 30 },
  { id: "desert", name: "Desert", desc: "Warm sunset vibes.", cost: 30 },
  { id: "ice", name: "Ice", desc: "Cool blue frost.", cost: 35 },
];

const FINAL_VICTORY_COPY = {
  easy: {
    badge: "Easy Campaign Complete",
    title: "Well Done, Recruit",
    subtitle: "You finished the full training route and kept your momentum all the way through.",
    summary: "A clean first campaign clear. You stayed sharp, stayed calm, and brought the mission home.",
    voice: "Well done, recruit. Easy campaign complete. You cleared all ten stages.",
  },
  balanced: {
    badge: "Balanced Campaign Complete",
    title: "Mission Complete",
    subtitle: "You cleared all ten stages with focus, consistency, and steady control.",
    summary: "That was the full standard run. Strong memory, strong pacing, and a solid finish.",
    voice: "Mission complete. Balanced campaign cleared. Outstanding work.",
  },
  hard: {
    badge: "Hard Campaign Complete",
    title: "Elite Victory",
    subtitle: "You conquered the toughest route and held your nerve right to the end.",
    summary: "That was a serious clear. Hard mode all the way through, with no easy wins handed to you.",
    voice: "Elite victory. Hard campaign complete. That was seriously impressive.",
  },
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readNumber(key, fallback) {
  try {
    const raw = Number(localStorage.getItem(key));
    return Number.isFinite(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

function getPressureTempo(timeRemaining, freezeActive, status) {
  if (status !== "playing" || freezeActive || timeRemaining <= 0) {
    return { tempo: 1, volume: 0.35, stress: 0 };
  }
  if (timeRemaining <= 5) {
    return { tempo: 2.2, volume: 0.58, stress: 1 };
  }
  if (timeRemaining <= 10) {
    return { tempo: 1.95, volume: 0.48, stress: 0.65 };
  }
  if (timeRemaining <= 15) {
    return { tempo: 1.6, volume: 0.4, stress: 0.25 };
  }
  return { tempo: 1, volume: 0.35, stress: 0 };
}


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
  const [mismatchUids, setMismatchUids] = useState([]);

  // counters
  const [timeRemaining, setTimeRemaining] = useState(stage.timeLimit);
  const [movesRemaining, setMovesRemaining] = useState(stage.moveLimit);
  const [tokens, setTokens] = useState(() => readNumber(PLAYER_TOKEN_KEY, stage.startTokens));
  const [tokensEarned, setTokensEarned] = useState(0);
  const [tokensSpent, setTokensSpent] = useState(0);
  const [styleOpen, setStyleOpen] = useState(false);
  const [styleSelected, setStyleSelected] = useState(() => localStorage.getItem(STYLE_THEME_KEY) || "classic");
  const [styleUnlocked, setStyleUnlocked] = useState(() => new Set(readJson(STYLE_UNLOCKS_KEY, ["classic"])));

  // struggle tracking for dynamic tips
  const [mismatchCount, setMismatchCount] = useState(0);
  const [stageFailCount, setStageFailCount] = useState(0);
  const [hintsUsedThisStage, setHintsUsedThisStage] = useState(0);
  const [tipMessage, setTipMessage] = useState("");

  // streak: consecutive stage clears without pressing Retry (across stages)
  const [stageStreakCount, setStageStreakCount] = useState(0);
  const [retriedThisStage, setRetriedThisStage] = useState(false);
  const [freeHintCharges, setFreeHintCharges] = useState(0);
  const [pendingReward, setPendingReward] = useState(null); // { freeHint: number, tokenBonus: number }

  // Replay highlight on win (ghost flips)
  const [flipHistory, setFlipHistory] = useState([]); // array of card uids (last N)
  const [replayUids, setReplayUids] = useState([]);

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

  const [sfxOn, setSfxOn] = useState(() => getSfxEnabled());
  const [musicOn, setMusicOn] = useState(() => getMusicEnabled());
  const [undoFlash, setUndoFlash] = useState(false);
  const [finalVoicePlayed, setFinalVoicePlayed] = useState(false);

  const freezeActive = freezeUntil > 0 && Date.now() < freezeUntil;
  const isFinalStage = stageIndex === stages.length - 1;
  const isFinalVictory = status === "won" && isFinalStage;
  const finalVictoryCopy = FINAL_VICTORY_COPY[configId] || FINAL_VICTORY_COPY.balanced;

  useEffect(() => {
    startSession(configId);
    setTokens(readNumber(PLAYER_TOKEN_KEY, stages[0]?.startTokens ?? stage.startTokens));
  }, [configId]);

  useEffect(() => {
    if (musicOn) startBackgroundMusic();
    else stopBackgroundMusic();
    return () => {
      stopBackgroundMusic();
      stopCelebrationSpeech();
    };
  }, [musicOn]);

  useEffect(() => {
    setBackgroundMusicPressure(getPressureTempo(timeRemaining, freezeActive, status));
  }, [timeRemaining, freezeActive, status]);

  useEffect(() => {
    try {
      localStorage.setItem(PLAYER_TOKEN_KEY, String(tokens));
    } catch {}
  }, [tokens]);

  // Reset when stage changes
  useEffect(() => {
    // Reset stage state for new level.
    setDeck(buildDeck(stage));
    setFlippedUids([]);
    setMatchedUids(new Set());
    setLockInput(false);

    setTimeRemaining(stage.timeLimit);
    setMovesRemaining(stage.moveLimit);
    setTokensEarned(0);
    setTokensSpent(0);

    setStatus("playing");
    setFailReason(null);

    setTimerRunning(false);
    setPeekActive(false);
    setHintUids([]);
    setFreezeUntil(0);
    setLastSnapshot(null);
    setMismatchUids([]);
    setMismatchCount(0);
    setStageFailCount(0);
    setHintsUsedThisStage(0);
    setTipMessage("");
    // stage streak persists across stages; don't reset here
    setRetriedThisStage(false);
    setFlipHistory([]);
    setReplayUids([]);
    setStyleOpen(false);
    setFinalVoicePlayed(false);

    trackEvent("stage_start", {
      stageId: stage.stageId,
      timer_seconds: stage.timeLimit,
      move_limit: stage.moveLimit,
      card_count: stage.rows * stage.cols,
      token_start: tokens,
    });
  }, [stageIndex]);

  useEffect(() => {
    if (!isFinalVictory || finalVoicePlayed) return;
    const timeout = setTimeout(() => {
      speakCelebration(finalVictoryCopy.voice);
      setFinalVoicePlayed(true);
    }, 520);
    return () => clearTimeout(timeout);
  }, [isFinalVictory, finalVoicePlayed, finalVictoryCopy.voice]);

  useEffect(() => {
    // Ensure classic is always unlocked.
    if (!styleUnlocked.has("classic")) {
      setStyleUnlocked((prev) => new Set([...prev, "classic"]));
    }
  }, []);

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
      // Freeze timer while freeze powerup is active.
      if (Date.now() < freezeUntil) return;
      setTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, timerRunning, freezeUntil]);

  // fail when time hits 0
  useEffect(() => {
    if (status !== "playing") return;
    if (timeRemaining > 0) return;
    playStageFail();
    setStatus("lost");
    setFailReason("time");
    setStageStreakCount(0);
    setStageFailCount((c) => c + 1);
    setPendingReward(null);

    // Dynamic hint: repeatedly running out of time
    if (stageFailCount >= 1 && !freezeActive && !tipMessage) {
      setTipMessage("You’re often running out of time. Try using Freeze when the timer gets low to pause it for a few seconds.");
    }

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
    playStageFail();
    setStatus("lost");
    setFailReason("moves");
    setStageStreakCount(0);
    setStageFailCount((c) => c + 1);
    setPendingReward(null);

    // Dynamic hint: running out of moves
    if (stageFailCount >= 1 && !tipMessage) {
      setTipMessage("You’re running out of moves. Try using Undo after a bad guess to recover a move.");
    }

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

    
    // Track which card index was flipped for telemetry.
    const cardIndex = deck.findIndex((card) => card.uid === uid);
    trackEvent("card_flip", {
      stageId: stage.stageId,
      card_index: cardIndex,
      is_first_flip: flippedUids.length === 0,
    });

    playFlip();
    setFlipHistory((prev) => {
      const next = [...prev, uid];
      // Keep last 14 flips for replay
      return next.length > 14 ? next.slice(next.length - 14) : next;
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
    if (!isMatch) {
      setMismatchUids([aUid, bUid]);
      setMismatchCount((c) => c + 1);
    }

    const t = setTimeout(() => {
      const nextMovesRemaining = Math.max(0, movesRemaining - 1);
      setMovesRemaining(nextMovesRemaining);

      if (isMatch) {
        playMatch();
        setMatchedUids((prev) => {
          const next = new Set(prev);
          next.add(aUid);
          next.add(bUid);
          return next;
        });
      } else {
        playMismatch();
        setTimeRemaining((tRem) =>
          Math.max(0, tRem - stage.penaltyMismatchTime)
        );

        // Dynamic hint: lots of mismatches and not using Hint
        if (mismatchCount + 1 >= 4 && hintsUsedThisStage === 0 && !tipMessage) {
          setTipMessage("You’ve had a few mismatches in a row. Try using Hint early to reveal a safe matching pair.");
        }
      }

      setFlippedUids([]);
      setMismatchUids([]);
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
    // All cards matched means stage win.
    if (deck.length > 0 && matchedUids.size === deck.length) {
      if (stageIndex === stages.length - 1) playFinalVictory(configId);
      else playStageComplete();
      setStatus("won");
      // Confetti burst on stage complete
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => {
        confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
      }, 150);
      if (stageIndex === stages.length - 1) {
        setTimeout(() => {
          confetti({
            particleCount: 180,
            spread: 110,
            startVelocity: 38,
            scalar: 1.1,
            origin: { y: 0.55 },
          });
        }, 340);
      }
      let streakTokenBonus = 0;

      if (!retriedThisStage) {
        const nextStreak = stageStreakCount + 1;
        if (nextStreak >= 5) {
          streakTokenBonus = 5;
          setFreeHintCharges((c) => c + 1);
          setPendingReward({ freeHint: 1, tokenBonus: 5 });
          playReward();
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.3 } });
          setTipMessage(""); // avoid stacking with struggle tips
          setTimeout(() => {
            setPendingReward(null);
          }, 2600);
          setStageStreakCount(0);
        } else {
          setStageStreakCount(nextStreak);
        }
      } else {
        setStageStreakCount(0);
      }

      const updatedTokensEarned = tokensEarned + stage.stageWinTokens + streakTokenBonus;

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

      if (streakTokenBonus > 0) {
        trackEvent("resource_gain", {
          stageId: stage.stageId,
          amount: streakTokenBonus,
          reason: "streak_bonus",
        });
      }

      setTokensEarned(updatedTokensEarned);
      setLockInput(true);
      setTimerRunning(false);
      setTokens((t) => t + stage.stageWinTokens + streakTokenBonus);

      // Replay highlight: ghost-flip the last N flips in order.
      const seq = flipHistory.slice(-12);
      if (seq.length) {
        let i = 0;
        const interval = setInterval(() => {
          // Show 1–2 cards at a time for a quick replay feel
          const a = seq[i];
          const b = seq[i + 1];
          setReplayUids([a, b].filter(Boolean));
          i += 2;
          if (i >= seq.length) {
            clearInterval(interval);
            setTimeout(() => setReplayUids([]), 350);
          }
        }, 260);
        return () => clearInterval(interval);
      }
    }
  }, [matchedUids, deck.length, status, stage.stageWinTokens, flipHistory, retriedThisStage, stageStreakCount, tokensEarned, tokensSpent, movesRemaining, timeRemaining, stageIndex, stages.length]);

  //  UPDATED HINT (reveals ONE matching pair)
  function usePeek() {
    if (status !== "playing") return;

    const isFree = freeHintCharges > 0;
    const cost = isFree ? 0 : stage.powerupCosts.peek;
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
      was_free: isFree,
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
    setHintsUsedThisStage((n) => n + 1);
    if (isFree) setFreeHintCharges((c) => Math.max(0, c - 1));

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
    setUndoFlash(true);
    setTimeout(() => setUndoFlash(false), 450);

    setLastSnapshot(null);
  }

  useEffect(() => {
    function handleShortcut(event) {
      if (status !== "playing" || styleOpen) return;
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target;
      const tagName = target?.tagName?.toLowerCase?.() || "";
      if (target?.isContentEditable || ["input", "textarea", "select"].includes(tagName)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "h") {
        event.preventDefault();
        usePeek();
      } else if (key === "f") {
        event.preventDefault();
        useFreeze();
      } else if (key === "u") {
        event.preventDefault();
        useUndo();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [
    status,
    styleOpen,
    tokens,
    freeHintCharges,
    stage.stageId,
    stage.powerupCosts.peek,
    stage.powerupCosts.freeze,
    stage.powerupCosts.undo,
    matchedUids,
    flippedUids,
    deck,
    lastSnapshot,
  ]);

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
    setTokensEarned(0);
    setTokensSpent(0);

    setStatus("playing");
    setFailReason(null);

    setTimerRunning(false);
    setPeekActive(false);
    setHintUids([]);
    setFreezeUntil(0);
    setLastSnapshot(null);
    setStageStreakCount(0);
    setPendingReward(null);
    setRetriedThisStage(true);
    setMismatchCount(0);
    setStageFailCount(0);
    setHintsUsedThisStage(0);
    setTipMessage("");
  }

  function nextStage() {
    if (stageIndex < stages.length - 1) {
      setStageIndex((i) => i + 1);
    } else {
      stopBackgroundMusic();
      stopCelebrationSpeech();
      endSession("completed", stage.stageId);
      navigate("/");
    }
  }

  function replayCampaign() {
    stopBackgroundMusic();
    stopCelebrationSpeech();
    endSession("completed", stage.stageId);
    navigate("/difficulty");
  }

  function quitToMenu() {
    stopBackgroundMusic();
    stopCelebrationSpeech();
    trackEvent("quit", {
      stageId: stage.stageId,
      reason: "quit_to_menu",
    });
    endSession("quit", stage.stageId);
    navigate("/");
  }

  function toggleSfx() {
    const next = !getSfxEnabled();
    setSfxEnabled(next);
    setSfxOn(next);
  }

  function toggleMusic() {
    const next = !getMusicEnabled();
    setMusicEnabled(next);
    setMusicOn(next);
    if (next) startBackgroundMusic();
    else stopBackgroundMusic();
  }

  function persistStyle(nextSelected, nextUnlocked) {
    try {
      localStorage.setItem(STYLE_THEME_KEY, nextSelected);
      localStorage.setItem(STYLE_UNLOCKS_KEY, JSON.stringify(Array.from(nextUnlocked)));
      document.documentElement.dataset.theme = nextSelected;
    } catch {}
  }

  function chooseTheme(id) {
    setStyleSelected(id);
    persistStyle(id, styleUnlocked);
  }

  function unlockTheme(theme) {
    if (styleUnlocked.has(theme.id)) return;
    if (tokens < theme.cost) return;
    const nextUnlocked = new Set(styleUnlocked);
    nextUnlocked.add(theme.id);
    setStyleUnlocked(nextUnlocked);
    setTokens((current) => current - theme.cost);
    setTokensSpent((spent) => spent + theme.cost);
    persistStyle(styleSelected, nextUnlocked);
  }

  return (
    <main
      className={`game ${freezeActive ? "game--frozen" : ""} ${peekActive ? "game--hint" : ""} ${undoFlash ? "game--undo-flash" : ""}`}
    >
      <HUD
        configId={configId}
        stageId={stage.stageId}
        timeRemaining={timeRemaining}
        movesRemaining={movesRemaining}
        tokens={tokens}
        freezeActive={freezeActive}
        streakCount={stageStreakCount}
        freeHintCharges={freeHintCharges}
        streakBonusTokens={pendingReward?.tokenBonus || 0}
      />
      <div className="game-sound-toggles">
        <button
          type="button"
          className={`game-sound-btn ${styleOpen ? "game-sound-btn--on" : ""}`}
          onClick={() => setStyleOpen(true)}
          title="Open style shop"
        >
          <span className="game-sound-btn__label">Style</span>
          <span className="game-sound-btn__meta">{tokens} tokens</span>
        </button>
        <button
          type="button"
          className={`game-sound-btn ${sfxOn ? "game-sound-btn--on" : ""}`}
          onClick={toggleSfx}
          title={sfxOn ? "Sound effects on" : "Sound effects off"}
          aria-label={sfxOn ? "Mute sound effects" : "Enable sound effects"}
        >
          <span className="game-sound-btn__label">Sound</span>
          <span className="game-sound-btn__meta">{sfxOn ? "On" : "Off"}</span>
        </button>
        <button
          type="button"
          className={`game-sound-btn ${musicOn ? "game-sound-btn--on" : ""}`}
          onClick={toggleMusic}
          title={musicOn ? "Music on" : "Music off"}
          aria-label={musicOn ? "Mute music" : "Play music"}
        >
          <span className="game-sound-btn__label">Music</span>
          <span className="game-sound-btn__meta">{musicOn ? "On" : "Off"}</span>
        </button>
      </div>

      {styleOpen && (
        <Modal title="Style Shop">
          <p style={{ marginTop: 0, fontSize: 13, opacity: 0.8 }}>
            Unlock themes using your current token balance. Themes stay cosmetic only.
          </p>
          <p style={{ marginTop: 0 }}>
            Tokens available: <b>{tokens}</b>
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {STYLE_THEMES.map((t) => {
              const isUnlocked = styleUnlocked.has(t.id);
              const isActive = styleSelected === t.id;
              return (
                <div
                  key={t.id}
                  style={{
                    border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 14,
                    padding: 12,
                    display: "grid",
                    gap: 8,
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>{t.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {t.cost === 0 ? "Free" : `${t.cost}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t.desc}</div>
                  <div
                    style={{
                      height: 38,
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card-back)",
                    }}
                    onMouseEnter={() => (document.documentElement.dataset.theme = t.id)}
                    onMouseLeave={() => (document.documentElement.dataset.theme = styleSelected)}
                    title="Hover to preview"
                  />
                  {!isUnlocked ? (
                    <button
                      type="button"
                      data-variant="ghost"
                      disabled={tokens < t.cost}
                      onClick={() => unlockTheme(t)}
                    >
                      Unlock for {t.cost}
                    </button>
                  ) : (
                    <button type="button" disabled={isActive} onClick={() => chooseTheme(t.id)}>
                      {isActive ? "Selected" : "Use theme"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" data-variant="ghost" onClick={() => setStyleOpen(false)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      <Board
        deck={deck}
        rows={stage.rows}
        cols={stage.cols}
        flippedUids={[...flippedUids, ...hintUids]}
        matchedUids={matchedUids}
        mismatchUids={mismatchUids}
        replayUids={replayUids}
        onFlip={handleFlip}
        peekActive={peekActive}
      />

      {pendingReward && (
        <section className="reward-toast" role="status" aria-live="polite">
          <div className="reward-toast__title">Prize unlocked!</div>
          <div className="reward-toast__body">
            You cleared <b>5 stages in a row</b> without retrying.
            <div className="reward-toast__chips">
              <span className="reward-chip">+{pendingReward.tokenBonus} tokens</span>
              <span className="reward-chip">Free Hint x{pendingReward.freeHint}</span>
            </div>
          </div>
          <button
            type="button"
            className="reward-toast__dismiss"
            onClick={() => setPendingReward(null)}
          >
            Nice!
          </button>
        </section>
      )}

      {tipMessage && (
        <section className="tip-card">
          <div className="tip-card__header">Tip</div>
          <p className="tip-card__body">{tipMessage}</p>
          <button
            type="button"
            className="tip-card__dismiss"
            onClick={() => setTipMessage("")}
          >
            Got it
          </button>
        </section>
      )}

      <Controls
        costs={stage.powerupCosts}
        tokens={tokens}
        onPeek={usePeek}
        onFreeze={useFreeze}
        onUndo={useUndo}
        onRetry={retryStage}
        onQuit={quitToMenu}
      />

      {status === "won" && !isFinalStage && (
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

      {isFinalVictory && (
        <Modal title={finalVictoryCopy.title} className={`final-victory-modal final-victory-modal--${configId}`}>
          <div className="final-victory">
            <div className="final-victory__badge">{finalVictoryCopy.badge}</div>
            <div className="final-victory__seal" aria-hidden="true">★</div>
            <p className="final-victory__subtitle">{finalVictoryCopy.subtitle}</p>
            <p className="final-victory__summary">{finalVictoryCopy.summary}</p>

            <div className="final-victory__stats">
              <div className="final-victory__stat">
                <span className="final-victory__stat-label">Tokens</span>
                <strong>{tokens}</strong>
              </div>
              <div className="final-victory__stat">
                <span className="final-victory__stat-label">Time left</span>
                <strong>{timeRemaining}</strong>
              </div>
              <div className="final-victory__stat">
                <span className="final-victory__stat-label">Moves left</span>
                <strong>{movesRemaining}</strong>
              </div>
            </div>

            <div className="final-victory__actions">
              <button type="button" onClick={replayCampaign}>Play Again</button>
              <button type="button" data-variant="ghost" onClick={nextStage}>Back to Menu</button>
            </div>
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