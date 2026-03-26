/**
 * Standalone "Style Shop" page.
 *
 * This is the same idea as the in-game style modal, just as a separate route.
 * It reads/writes theme + unlocks + token bank from localStorage.
 *
 * Cosmetic-only: themes do not affect difficulty or scoring.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const THEME_KEY = "style_theme_v1";
const UNLOCKS_KEY = "style_unlocked_v1";
const TOKEN_KEY = "player_tokens_v1";
const MIN_INITIAL_TOKENS = 5;

function readTokenBank() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (raw === null || raw === "") return MIN_INITIAL_TOKENS;
  const n = Number(raw);
  return Number.isFinite(n) ? n : MIN_INITIAL_TOKENS;
}

const THEMES = [
  { id: "classic", name: "Classic", desc: "Default look.", cost: 0 },
  { id: "neon", name: "Neon", desc: "Cyber pink + purple glow.", cost: 25 },
  { id: "forest", name: "Forest", desc: "Green calm theme.", cost: 30 },
  { id: "desert", name: "Desert", desc: "Warm sunset vibes.", cost: 30 },
  { id: "ice", name: "Ice", desc: "Cool blue frost.", cost: 35 },
];

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function Styles() {
  const [selected, setSelected] = useState(() => localStorage.getItem(THEME_KEY) || "classic");
  const [unlocked, setUnlocked] = useState(() => new Set(readJson(UNLOCKS_KEY, ["classic"])));
  const [bank, setBank] = useState(() => readTokenBank());

  useEffect(() => {
    // Ensure classic is always unlocked.
    if (!unlocked.has("classic")) {
      const next = new Set(unlocked);
      next.add("classic");
      setUnlocked(next);
    }
  }, []);

  const unlockedIds = useMemo(() => new Set(unlocked), [unlocked]);

  function persist(nextSelected, nextUnlocked, nextBank) {
    localStorage.setItem(THEME_KEY, nextSelected);
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify(Array.from(nextUnlocked)));
    localStorage.setItem(TOKEN_KEY, String(nextBank));
    document.documentElement.dataset.theme = nextSelected;
  }

  function chooseTheme(themeId) {
    setSelected(themeId);
    persist(themeId, unlockedIds, bank);
  }

  function unlockTheme(theme) {
    if (unlockedIds.has(theme.id)) return;
    if (bank < theme.cost) return;
    const nextBank = bank - theme.cost;
    const nextUnlocked = new Set(unlockedIds);
    nextUnlocked.add(theme.id);
    setBank(nextBank);
    setUnlocked(nextUnlocked);
    persist(selected, nextUnlocked, nextBank);
  }

  return (
    <main className="page">
      <div className="page__content">
        <section className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 className="panel__title">Style Shop</h1>
              <p className="panel__subtitle">
                Unlock cosmetic themes using your real token balance. This does not change difficulty.
              </p>
            </div>
            <div style={{ alignSelf: "center", fontWeight: 700 }}>
              Tokens: <span style={{ color: "var(--accent)" }}>{bank}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {THEMES.map((t) => {
              const isUnlocked = unlockedIds.has(t.id);
              const isActive = selected === t.id;
              return (
                <div
                  key={t.id}
                  style={{
                    border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 16,
                    padding: 14,
                    background: "var(--surface)",
                    boxShadow: isActive ? "var(--shadow-soft)" : "none",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>{t.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {t.cost === 0 ? "Free" : `${t.cost} tokens`}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t.desc}</div>

                  <div
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card-back)",
                    }}
                    // Preview by temporarily applying theme variables
                    onMouseEnter={() => (document.documentElement.dataset.theme = t.id)}
                    onMouseLeave={() => (document.documentElement.dataset.theme = selected)}
                    title="Hover to preview"
                  />

                  {!isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => unlockTheme(t)}
                      disabled={bank < t.cost}
                      data-variant="ghost"
                    >
                      Unlock
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => chooseTheme(t.id)}
                      disabled={isActive}
                    >
                      {isActive ? "Selected" : "Use theme"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/">
              <button type="button" data-variant="ghost">
                Back to Menu
              </button>
            </Link>
            <Link to="/difficulty">
              <button type="button">Play</button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Styles;