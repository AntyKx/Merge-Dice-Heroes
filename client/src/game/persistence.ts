import type { EquipmentId, PlayerProgress, ShopOfferId } from "./types";
import { EQUIPMENT } from "./config";

const PROGRESS_KEY = "merge-dice-heroes:progress";

const todayKey = () => new Date().toISOString().slice(0, 10);
const defaultShop = () => ({ dayKey: todayKey(), offers: ["forgeBundle", "morningBladeOffer", "fateDiceBoxOffer"] as ShopOfferId[], purchased: [] as ShopOfferId[], freeRefreshAvailable: true });

/** Every item a fresh (or returning, via loadProgress's merge below) player owns
 * from the start -- the full 30-item roster (素材/軍需官密卷), not just the 3
 * original starters, since there's no shop/dungeon drop rotation for the new 27
 * yet. Equip slots stay untouched (weapon/armor default, relic empty) so this
 * only ever ADDS backpack options, never silently changes what's worn. */
const STARTER_EQUIPMENT_IDS = Object.keys(EQUIPMENT) as EquipmentId[];

export const defaultProgress: PlayerProgress = {
  playerName: "王都新秀",
  wins: 0, losses: 0, bestWave: 0, crystals: 120, sigils: 12, materials: 24, stamina: 20,
  inventory: STARTER_EQUIPMENT_IDS,
  equipmentLevels: Object.fromEntries(STARTER_EQUIPMENT_IDS.map((id) => [id, 1])) as Partial<Record<EquipmentId, number>>,
  equipped: { weapon: "morningBlade", armor: "watcherCloak" },
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
    // Union (not override) with the default roster so a returning save picks up
    // any equipment added to the game since it was last written, instead of
    // being stuck with whatever the roster looked like at first-save time.
    const inventory = Array.from(new Set([...(parsed.inventory ?? []), ...defaultProgress.inventory]));
    return { ...defaultProgress, ...parsed, inventory, equipmentLevels: { ...defaultProgress.equipmentLevels, ...parsed.equipmentLevels }, equipped: { ...defaultProgress.equipped, ...parsed.equipped }, daily: freshDaily, dungeonClears: { ...defaultProgress.dungeonClears, ...parsed.dungeonClears }, shop: freshShop, lobbyRead, heroProgress: { ...defaultProgress.heroProgress, ...parsed.heroProgress }, settings: { ...defaultProgress.settings, ...parsed.settings } };
  } catch { return defaultProgress; }
}

export function saveProgress(progress: PlayerProgress) {
  try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* local storage may be unavailable */ }
}
