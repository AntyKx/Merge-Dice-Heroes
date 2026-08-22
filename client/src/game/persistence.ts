import type { PlayerProgress } from "./types";

const PROGRESS_KEY = "merge-dice-heroes:progress";

const todayKey = () => new Date().toISOString().slice(0, 10);

export const defaultProgress: PlayerProgress = {
  wins: 0, losses: 0, bestWave: 0, crystals: 120, sigils: 12, stamina: 20,
  inventory: ["morningBlade", "watcherCloak", "fateDiceBox"], equipped: { weapon: "morningBlade", armor: "watcherCloak" },
  daily: { dayKey: todayKey(), battles: 0, merges: 0, victories: 0, claimed: [] }, dungeonClears: {},
  settings: { musicEnabled: false, sfxEnabled: true, vibrationEnabled: true },
};

export function loadProgress(): PlayerProgress {
  try {
    const stored = window.localStorage.getItem(PROGRESS_KEY);
    if (!stored) return defaultProgress;
    const parsed = JSON.parse(stored) as Partial<PlayerProgress>;
    const daily = { ...defaultProgress.daily, ...parsed.daily };
    const freshDaily = daily.dayKey === todayKey() ? daily : { ...defaultProgress.daily, dayKey: todayKey() };
    return { ...defaultProgress, ...parsed, inventory: parsed.inventory ?? defaultProgress.inventory, equipped: { ...defaultProgress.equipped, ...parsed.equipped }, daily: freshDaily, dungeonClears: { ...defaultProgress.dungeonClears, ...parsed.dungeonClears }, settings: { ...defaultProgress.settings, ...parsed.settings } };
  } catch { return defaultProgress; }
}

export function saveProgress(progress: PlayerProgress) {
  try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* local storage may be unavailable */ }
}
