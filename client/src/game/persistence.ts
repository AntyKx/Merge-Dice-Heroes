import type { EquipmentId, PlayerProgress, ShopOfferId } from "./types";
import { EQUIPMENT, SHOP_OFFERS } from "./config";

const PROGRESS_KEY = "merge-dice-heroes:progress";

const todayKey = () => new Date().toISOString().slice(0, 10);
const defaultShop = () => ({ dayKey: todayKey(), offers: ["forgeBundleSmall", "forgeBundle", "forgeBundleLarge"] as ShopOfferId[], purchased: [] as ShopOfferId[], freeRefreshAvailable: true });

/** Every item a fresh (or returning, via loadProgress's merge below) player owns
 * from the start -- the full 27-item roster (素材/軍需官密卷), since there's no
 * shop/dungeon drop rotation for any of it yet. `equipped` below picks a
 * specific weapon/armor starting loadout (relic stays empty) so this constant
 * only ever ADDS backpack options, never silently changes what's worn. */
const STARTER_EQUIPMENT_IDS = Object.keys(EQUIPMENT) as EquipmentId[];

export const defaultProgress: PlayerProgress = {
  playerName: "王都新秀",
  wins: 0, losses: 0, bestWave: 0, crystals: 120, sigils: 12, materials: 24, stamina: 20,
  inventory: STARTER_EQUIPMENT_IDS,
  equipmentLevels: Object.fromEntries(STARTER_EQUIPMENT_IDS.map((id) => [id, 1])) as Partial<Record<EquipmentId, number>>,
  equipped: { weapon: "ironedgeBlade", armor: "stalwartBuckler" },
  daily: { dayKey: todayKey(), battles: 0, merges: 0, victories: 0, claimed: [] }, dungeonClears: {}, shop: defaultShop(),
  lobbyRead: {}, heroProgress: {},
  chaptersCleared: {}, bestWaveByChapter: {},
  settings: { musicEnabled: false, sfxEnabled: true, vibrationEnabled: true },
};

/** Reconciles a persisted save (from localStorage OR a cloud pull -- both are
 * equally likely to predate the 30-item roster) against defaultProgress, so
 * neither path can silently revert a returning player to a stale equipment
 * set. Exported so store.ts's cloud-load callback applies the same merge
 * instead of trusting cloudProgress verbatim. */
export function mergeWithDefaults(parsed: Partial<PlayerProgress> | undefined): PlayerProgress {
  if (!parsed) return defaultProgress;
  const daily = { ...defaultProgress.daily, ...parsed.daily };
  const freshDaily = daily.dayKey === todayKey() ? daily : { ...defaultProgress.daily, dayKey: todayKey() };
  const shop = { ...defaultProgress.shop, ...parsed.shop };
  // A returning save's offers may name an offer id that no longer exists in
  // SHOP_OFFERS (the catalog changed since this save was written) -- treat
  // that like a stale dayKey and regenerate today's shop instead of crashing
  // on a missing ShopOfferDefinition later.
  const shopOffersStillValid = shop.offers.every((id) => id in SHOP_OFFERS);
  const freshShop = shop.dayKey === todayKey() && shopOffersStillValid ? shop : defaultShop();
  const lobbyRead = { ...defaultProgress.lobbyRead, ...parsed.lobbyRead, ...(daily.dayKey !== todayKey() ? { daily: false } : {}), ...(shop.dayKey !== todayKey() ? { shop: false } : {}) };
  // Union (not override) with the default roster so a returning save picks up
  // any equipment added to the game since it was last written, instead of
  // being stuck with whatever the roster looked like at first-save time. Also
  // drop any id no longer in EQUIPMENT (an item removed from the game since
  // this save was written), so it can't dangle into `equipped`/
  // `equipmentLevels` below and crash on a missing EquipmentDefinition.
  const inventory = Array.from(new Set([...(parsed.inventory ?? []), ...defaultProgress.inventory])).filter((id) => id in EQUIPMENT);
  const equipped = Object.fromEntries(Object.entries({ ...defaultProgress.equipped, ...parsed.equipped }).filter(([, id]) => id === undefined || id in EQUIPMENT)) as PlayerProgress["equipped"];
  const equipmentLevels = Object.fromEntries(Object.entries({ ...defaultProgress.equipmentLevels, ...parsed.equipmentLevels }).filter(([id]) => id in EQUIPMENT)) as Partial<Record<EquipmentId, number>>;
  return { ...defaultProgress, ...parsed, inventory, equipmentLevels, equipped, daily: freshDaily, dungeonClears: { ...defaultProgress.dungeonClears, ...parsed.dungeonClears }, shop: freshShop, lobbyRead, heroProgress: { ...defaultProgress.heroProgress, ...parsed.heroProgress }, chaptersCleared: { ...defaultProgress.chaptersCleared, ...parsed.chaptersCleared }, bestWaveByChapter: { ...defaultProgress.bestWaveByChapter, ...parsed.bestWaveByChapter }, settings: { ...defaultProgress.settings, ...parsed.settings } };
}

export function loadProgress(): PlayerProgress {
  try {
    const stored = window.localStorage.getItem(PROGRESS_KEY);
    if (!stored) return defaultProgress;
    return mergeWithDefaults(JSON.parse(stored) as Partial<PlayerProgress>);
  } catch { return defaultProgress; }
}

export function saveProgress(progress: PlayerProgress) {
  try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* local storage may be unavailable */ }
}
