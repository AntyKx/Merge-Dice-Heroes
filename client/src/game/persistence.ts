import type { PlayerProgress, ShopOfferId } from "./types";

const PROGRESS_KEY = "merge-dice-heroes:progress";

const todayKey = () => new Date().toISOString().slice(0, 10);
const defaultShop = () => ({ dayKey: todayKey(), offers: ["forgeBundle", "morningBladeOffer", "fateDiceBoxOffer"] as ShopOfferId[], purchased: [] as ShopOfferId[], freeRefreshAvailable: true });

export const defaultProgress: PlayerProgress = {
  playerName: "王都新秀",
  wins: 0, losses: 0, bestWave: 0, crystals: 120, sigils: 12, materials: 24, stamina: 20,
  inventory: ["morningBlade", "watcherCloak", "fateDiceBox"], equipmentLevels: { morningBlade: 1, watcherCloak: 1, fateDiceBox: 1 }, equipped: { weapon: "morningBlade", armor: "watcherCloak" },
  daily: { dayKey: todayKey(), battles: 0, merges: 0, victories: 0, claimed: [] }, dungeonClears: {}, shop: defaultShop(),
  lobbyRead: {}, heroProgress: {},
  settings: { musicEnabled: false, sfxEnabled: true, vibrationEnabled: true },
};

export function loadProgress(): PlayerProgress {
  try {
    const stored = window.localStorage.getItem(PROGRESS_KEY);
    if (!stored) return defaultProgress;
    const parsed = JSON.parse(stored) as Partial<PlayerProgress>;
    const daily = { ...defaultProgress.daily, ...parsed.daily };
    const freshDaily = daily.dayKey === todayKey() ? daily : { ...defaultProgress.daily, dayKey: todayKey() };
    const shop = { ...defaultProgress.shop, ...parsed.shop };
    const freshShop = shop.dayKey === todayKey() ? shop : defaultShop();
    const lobbyRead = { ...defaultProgress.lobbyRead, ...parsed.lobbyRead, ...(daily.dayKey !== todayKey() ? { daily: false } : {}), ...(shop.dayKey !== todayKey() ? { shop: false } : {}) };
    return { ...defaultProgress, ...parsed, inventory: parsed.inventory ?? defaultProgress.inventory, equipmentLevels: { ...defaultProgress.equipmentLevels, ...parsed.equipmentLevels }, equipped: { ...defaultProgress.equipped, ...parsed.equipped }, daily: freshDaily, dungeonClears: { ...defaultProgress.dungeonClears, ...parsed.dungeonClears }, shop: freshShop, lobbyRead, heroProgress: { ...defaultProgress.heroProgress, ...parsed.heroProgress }, settings: { ...defaultProgress.settings, ...parsed.settings } };
  } catch { return defaultProgress; }
}

export function saveProgress(progress: PlayerProgress) {
  try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* local storage may be unavailable */ }
}
