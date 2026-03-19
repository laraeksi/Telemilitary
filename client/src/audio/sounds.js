/**
 * Game sounds: optional real SFX from public/sounds/*.ogg with Web Audio fallback.
 * Supports SFX and music toggles (persisted in localStorage).
 */

const STORAGE_SFX = "telemilitary_sfx";
const STORAGE_MUSIC = "telemilitary_music";
const BG_MUSIC_BASE_VOLUME = 0.35;

let audioContext = null;
let bgMusic = null; // HTML Audio for music.ogg
let bgMusicFallback = null; // Web Audio loop when no file
let bgMusicTempo = 1;
let bgMusicVolume = BG_MUSIC_BASE_VOLUME;
let bgMusicStress = 0;

function getContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function getSfxEnabled() {
  try {
    const v = localStorage.getItem(STORAGE_SFX);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

function getMusicEnabled() {
  try {
    const v = localStorage.getItem(STORAGE_MUSIC);
    // Default music ON for new players; they can mute via toggle.
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

export function setSfxEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_SFX, String(enabled));
  } catch {}
}

export function setMusicEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_MUSIC, String(enabled));
  } catch {}
  if (bgMusic) {
    if (enabled) {
      bgMusic.volume = bgMusicVolume;
      bgMusic.playbackRate = bgMusicTempo;
      bgMusic.play().catch(startFallbackMusic);
    } else {
      bgMusic.pause();
    }
  }
  if (bgMusicFallback && !enabled) {
    stopFallbackMusic();
  }
}

export { getSfxEnabled, getMusicEnabled };

function getChordDurationMs() {
  return 4000 / bgMusicTempo;
}

/** Try to play a file from public/sounds/, fallback to tone fn */
function trySound(path, fallbackFn) {
  if (!getSfxEnabled()) return;
  const base = typeof import.meta.env?.BASE_URL === "string" ? import.meta.env.BASE_URL : "/";
  const url = `${base}sounds/${path}`;
  const a = new Audio(url);
  a.volume = 0.35;
  a.play().catch(() => fallbackFn());
}

function playTone(frequency, durationMs, type = "sine", volume = 0.15) {
  if (!getSfxEnabled()) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {}
}

/** Short UI "tick" – doesn’t sound like the melody, so it doesn’t clash with music */
function flipTone() {
  if (!getSfxEnabled()) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 1800;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
    osc.start(t);
    osc.stop(t + 0.022);
  } catch {}
}

/** Two quick high ticks so it’s clearly a “success” effect, not part of the tune */
function matchTone() {
  if (!getSfxEnabled()) return;
  try {
    const ctx = getContext();
    const playTick = (freq, delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.start(t);
      osc.stop(t + 0.06);
    };
    playTick(880, 0);
    playTick(1320, 0.07);
  } catch {}
}

/** Short low thud – clearly different from music and flip */
function mismatchTone() {
  if (!getSfxEnabled()) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.value = 150;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    osc.stop(t + 0.08);
  } catch {}
}

function stageCompleteTone() {
  if (!getSfxEnabled()) return;
  try {
    const ctx = getContext();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.frequency.value = freq;
      osc.start(t);
      osc.stop(t + 0.15);
    });
  } catch {}
}

function stageFailTone() {
  playTone(180, 200, "sawtooth", 0.1);
}

/** Same family as flip – short high tick for buttons */
function clickTone() {
  if (!getSfxEnabled()) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 1400;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
    osc.start(t);
    osc.stop(t + 0.018);
  } catch {}
}

export function playFlip() {
  trySound("flip.ogg", flipTone);
}

export function playMatch() {
  trySound("match.ogg", matchTone);
}

export function playMismatch() {
  trySound("mismatch.ogg", mismatchTone);
}

export function playStageComplete() {
  trySound("stage-complete.ogg", stageCompleteTone);
}

export function playStageFail() {
  trySound("stage-fail.ogg", stageFailTone);
}

export function playClick() {
  trySound("click.ogg", clickTone);
}

function rewardTone() {
  if (!getSfxEnabled()) return;
  try {
    const ctx = getContext();
    const playPing = (freq, delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
      osc.start(t);
      osc.stop(t + 0.10);
    };
    playPing(659.25, 0);   // E5
    playPing(783.99, 0.12); // G5
    playPing(1046.5, 0.24); // C6
  } catch {}
}

/** Stage-streak reward sound */
export function playReward() {
  trySound("reward.ogg", rewardTone);
}

function playNoteSequence(notes, type = "sine", volume = 0.16) {
  if (!getSfxEnabled()) return;
  try {
    const ctx = getContext();
    notes.forEach(([freq, delay, duration]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration);
    });
  } catch {}
}

function finalVictoryTone(configId = "balanced") {
  if (!getSfxEnabled()) return;
  if (configId === "easy") {
    playNoteSequence(
      [
        [523.25, 0.00, 0.18],
        [659.25, 0.14, 0.18],
        [783.99, 0.28, 0.22],
        [1046.5, 0.46, 0.34],
      ],
      "triangle",
      0.14,
    );
    return;
  }

  if (configId === "hard") {
    playNoteSequence(
      [
        [392.0, 0.00, 0.16],
        [523.25, 0.10, 0.18],
        [659.25, 0.22, 0.20],
        [783.99, 0.36, 0.22],
        [1046.5, 0.52, 0.42],
      ],
      "sawtooth",
      0.12,
    );
    return;
  }

  playNoteSequence(
    [
      [440.0, 0.00, 0.16],
      [554.37, 0.12, 0.18],
      [659.25, 0.26, 0.20],
      [880.0, 0.42, 0.36],
    ],
    "sine",
    0.13,
  );
}

export function playFinalVictory(configId = "balanced") {
  const soundName =
    configId === "easy"
      ? "victory-easy.ogg"
      : configId === "hard"
        ? "victory-hard.ogg"
        : "victory-balanced.ogg";
  trySound(soundName, () => finalVictoryTone(configId));
}

function pickSpeechVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices?.() || [];
  if (!voices.length) return null;
  return (
    voices.find((voice) => /en(-|_)?/i.test(voice.lang) && /female|zira|aria|samantha|victoria|google us english/i.test(`${voice.name} ${voice.voiceURI}`)) ||
    voices.find((voice) => /en(-|_)?/i.test(voice.lang)) ||
    voices[0]
  );
}

export function speakCelebration(text) {
  if (!getSfxEnabled()) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (typeof SpeechSynthesisUtterance === "undefined") return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 0.9;
    utterance.rate = 1;
    utterance.pitch = 1.08;
    const voice = pickSpeechVoice();
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  } catch {}
}

export function stopCelebrationSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {}
}

/** Chord progression: C - G - Am - F (each 4 sec). Frequencies in Hz [root, 3rd, 5th] for soft pad. */
const FALLBACK_CHORDS = [
  [130.81, 164.81, 196],       // C3 E3 G3
  [196, 246.94, 293.66],      // G3 B3 D4
  [220, 261.63, 329.63],      // A3 C4 E4
  [174.61, 220, 261.63],      // F3 A3 C4
];
/** Melody: [freq Hz, duration sec]. Harmonical phrase in C major, chord tones and stepwise. */
const FALLBACK_MELODY = [
  [261.63, 0.5], [329.63, 0.45], [392, 0.5], [440, 0.45], [392, 0.5], [329.63, 0.55], [261.63, 0.6],
  [392, 0.45], [440, 0.45], [523.25, 0.5], [493.88, 0.45], [440, 0.5], [392, 0.55], [329.63, 0.5], [261.63, 0.65],
  [329.63, 0.45], [261.63, 0.5], [329.63, 0.45], [392, 0.5], [440, 0.45], [392, 0.5], [329.63, 0.6],
  [392, 0.45], [440, 0.45], [523.25, 0.5], [440, 0.45], [392, 0.5], [329.63, 0.55], [261.63, 0.7],
];

function scheduleNextMelodyNote(ctx) {
  if (!bgMusicFallback) return;
  let noteIndex = 0;
  function play() {
    if (!bgMusicFallback) return;
    if (bgMusicFallback.currentMelodyOsc) {
      try { bgMusicFallback.currentMelodyOsc.stop(); } catch {}
      bgMusicFallback.currentMelodyOsc = null;
    }
    const [freq, dur] = FALLBACK_MELODY[noteIndex];
    noteIndex = (noteIndex + 1) % FALLBACK_MELODY.length;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1 + bgMusicStress * 0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = bgMusicStress >= 0.8 ? "sawtooth" : bgMusicStress >= 0.4 ? "square" : "triangle";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
    bgMusicFallback.currentMelodyOsc = osc;
    bgMusicFallback.timeoutId = setTimeout(play, (dur * 1000) / bgMusicTempo);
  }
  play();
}

function startChord(ctx, chordFreqs, destGain) {
  const gain = ctx.createGain();
  gain.gain.value = 0.055 + bgMusicStress * 0.02;
  gain.connect(destGain);
  return chordFreqs.map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = bgMusicStress >= 0.8 ? "triangle" : "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(ctx.currentTime);
    return osc;
  });
}

/** Harmonical fallback: chord progression (C-G-Am-F) + melody when music.ogg is missing. */
function startFallbackMusic() {
  if (!getMusicEnabled()) return;
  if (bgMusicFallback) return;
  try {
    const ctx = getContext();
    if (ctx.state === "suspended") ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1 + bgMusicStress * 0.12;
    masterGain.connect(ctx.destination);

    let chordIndex = 0;
    let chordOscs = startChord(ctx, FALLBACK_CHORDS[0], masterGain);

    bgMusicFallback = { chordOscs, chordInterval: null, timeoutId: null, currentMelodyOsc: null };

    const chordInterval = setInterval(() => {
      if (!bgMusicFallback) return;
      (bgMusicFallback.chordOscs || []).forEach((osc) => {
        try { osc.stop(); } catch {}
      });
      chordIndex = (chordIndex + 1) % FALLBACK_CHORDS.length;
      chordOscs = startChord(ctx, FALLBACK_CHORDS[chordIndex], masterGain);
      bgMusicFallback.chordOscs = chordOscs;
    }, getChordDurationMs());

    bgMusicFallback.chordInterval = chordInterval;
    scheduleNextMelodyNote(ctx);
  } catch {}
}

function stopFallbackMusic() {
  if (!bgMusicFallback) return;
  try {
    if (bgMusicFallback.timeoutId) clearTimeout(bgMusicFallback.timeoutId);
    if (bgMusicFallback.chordInterval) clearInterval(bgMusicFallback.chordInterval);
    if (bgMusicFallback.currentMelodyOsc) {
      try { bgMusicFallback.currentMelodyOsc.stop(); } catch {}
    }
    (bgMusicFallback.chordOscs || []).forEach((osc) => {
      try { osc.stop(); } catch {}
    });
  } catch {}
  bgMusicFallback = null;
}

/** Background music: try music.ogg, then fall back to synthesized loop. Call after user gesture. */
export function startBackgroundMusic() {
  if (!getMusicEnabled()) return;
  if (bgMusicFallback) return;
  if (bgMusic) {
    bgMusic.volume = bgMusicVolume;
    bgMusic.playbackRate = bgMusicTempo;
    bgMusic.play().catch(startFallbackMusic);
    return;
  }
  const base = typeof import.meta.env?.BASE_URL === "string" ? import.meta.env.BASE_URL : "/";
  bgMusic = new Audio(`${base}sounds/music.ogg`);
  bgMusic.loop = true;
  bgMusic.volume = bgMusicVolume;
  bgMusic.playbackRate = bgMusicTempo;
  bgMusic.preservesPitch = false;
  bgMusic.onerror = startFallbackMusic;
  bgMusic.play().catch(startFallbackMusic);
}

export function setBackgroundMusicPressure({ tempo = 1, volume = BG_MUSIC_BASE_VOLUME, stress = 0 } = {}) {
  const normalizedTempo = Math.max(1, Math.min(2.2, tempo));
  const normalizedVolume = Math.max(BG_MUSIC_BASE_VOLUME, Math.min(0.65, volume));
  const normalizedStress = Math.max(0, Math.min(1, stress));
  const tempoChanged = Math.abs(bgMusicTempo - normalizedTempo) >= 0.01;
  const volumeChanged = Math.abs(bgMusicVolume - normalizedVolume) >= 0.01;
  const stressChanged = Math.abs(bgMusicStress - normalizedStress) >= 0.01;
  if (!tempoChanged && !volumeChanged && !stressChanged) return;

  bgMusicTempo = normalizedTempo;
  bgMusicVolume = normalizedVolume;
  bgMusicStress = normalizedStress;

  if (bgMusic) {
    bgMusic.playbackRate = bgMusicTempo;
    bgMusic.volume = bgMusicVolume;
    bgMusic.preservesPitch = false;
  }

  if (bgMusicFallback && (tempoChanged || stressChanged)) {
    stopFallbackMusic();
    startFallbackMusic();
  }
}

export function stopBackgroundMusic() {
  bgMusicTempo = 1;
  bgMusicVolume = BG_MUSIC_BASE_VOLUME;
  bgMusicStress = 0;
  if (bgMusic) {
    bgMusic.playbackRate = 1;
    bgMusic.volume = BG_MUSIC_BASE_VOLUME;
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
  stopFallbackMusic();
}
