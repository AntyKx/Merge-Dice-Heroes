import type { PlayerProgress } from "./types";

const PROGRESS_KEY = "merge-dice-heroes:progress";

export const defaultProgress: PlayerProgress = { wins: 0, losses: 0, bestWave: 0, settings: { musicEnabled: false, sfxEnabled: true, vibrationEnabled: true } };

export function loadProgress(): PlayerProgress {
  try {
    const stored = window.localStorage.getItem(PROGRESS_KEY);
    if (!stored) return defaultProgress;
    const parsed = JSON.parse(stored) as Partial<PlayerProgress>;
    return { ...defaultProgress, ...parsed, settings: { ...defaultProgress.settings, ...parsed.settings } };
  } catch { return defaultProgress; }
}

export function saveProgress(progress: PlayerProgress) {
  try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* local storage may be unavailable */ }
}

