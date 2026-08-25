import { create } from "zustand";
import { emitAudio } from "./audio";
import { DAILY_QUESTS, DUNGEONS, EQUIPMENT, SHOP_OFFERS } from "./config";
import { createDefaultMetaAdapter } from "./defaultMetaAdapter";
import { awardHeroExperience } from "./heroProgress";
import { defaultProgress, loadProgress, saveProgress } from "./persistence";
import {
  acknowledgeWavePreview,
  advanceCombat,
  advanceToNextWave,
  buyExtraReposition,
  chooseBlessingReward,
  chooseComboEffect,
  chooseJackpotTierUpTarget,
  chooseSummonHero,
  chooseTalentReward,
  confirmFate,
  confirmFormation,
  createRun,
  mergeSelection,
  placePendingHero,
  recycleBoardHero,
  repositionHero,
  rerollDice,
  spendEnergyForChosenSummon,
  spendEnergyForRandomSummon,
  toggleDiceLock,
} from "./run-engine/orchestrator";
import type { CellKey, DiceComboKind, RunState } from "./run-engine/types";
import type { DailyQuestId, DungeonId, EquipmentId, EquipmentSlot, HeroId, LobbyNoticeId, PlayerProgress, ShopOfferId } from "./types";

export type GameScreen = "title" | "team" | "leader" | "game" | "guide" | "equipment" | "shop" | "daily" | "dungeon";

interface GameStore {
  screen: GameScreen;
  selectedHeroes: HeroId[];
  leaderId: HeroId;
  selectedDungeonId?: DungeonId;
  activeDungeonId?: DungeonId;
  run?: RunState;
  progress: PlayerProgress;
  autoSpeed: 1 | 2 | 4;
  isPaused: boolean;
  openScreen: (screen: GameScreen) => void;
  toggleTeamHero: (heroId: HeroId) => void;
  setTeamSlot: (slotIndex: number, heroId?: HeroId) => void;
  chooseLeader: (heroId: HeroId) => void;
  startRun: () => void;
  selectDungeon: (dungeonId: DungeonId) => void;
  equipItem: (equipmentId: EquipmentId) => void;
  unequipItem: (slot: EquipmentSlot) => void;
  claimDailyReward: (questId: DailyQuestId) => void;
  buyShopOffer: (offerId: ShopOfferId) => void;
  refreshShop: () => void;
  upgradeEquipment: (equipmentId: EquipmentId) => void;
  dismantleEquipment: (equipmentId: EquipmentId) => void;
  restartRun: () => void;
  // ---- Run Engine (Phase 9c) ----
  acknowledgeWavePreview: () => void;
  toggleDiceLock: (index: number) => void;
  rerollDice: () => void;
  confirmFate: () => void;
  chooseComboEffect: (kind: DiceComboKind) => void;
  chooseSummonHero: (heroId: HeroId) => void;
  chooseJackpotTierUpTarget: (cellKey: CellKey) => void;
  spendEnergyForRandomSummon: () => void;
  spendEnergyForChosenSummon: (heroId: HeroId) => void;
  mergeSelection: (cellKeys: CellKey[], targetCellKey: CellKey) => void;
  placePendingHero: (instanceId: string, cellKey: CellKey) => void;
  recycleBoardHero: (cellKey: CellKey) => void;
  repositionHero: (fromCellKey: CellKey, toCellKey: CellKey) => void;
  buyExtraReposition: () => void;
  confirmFormation: () => void;
  combatTick: (delta: number) => void;
  chooseTalentReward: (talentId: string) => void;
  chooseBlessingReward: (blessingId: string) => void;
  advanceToNextWave: () => void;
  setAutoSpeed: (speed: 1 | 2 | 4) => void;
  togglePause: () => void;
  setSetting: (setting: keyof PlayerProgress["settings"], value: boolean) => void;
}

const loadedProgress = typeof window === "undefined" ? defaultProgress : loadProgress();

function persist(progress: PlayerProgress) {
  saveProgress(progress);
  return progress;
}

/** Mirrors the old game/store.ts's maybeRecord(): awards Meta-layer progress
 * (wins/losses/bestWave/crystals/hero XP/dungeon clears) exactly once, on the
 * tick a Run first transitions into RUN_WIN/RUN_LOSE. Dungeon-specific enemy
 * scaling isn't wired into the new Run Engine yet (see orchestrator.ts's own
 * scope notes) -- this only carries over the dungeon REWARD bookkeeping. */
function maybeRecordRunResult(previous: RunState | undefined, next: RunState, progress: PlayerProgress, activeDungeonId: DungeonId | undefined): PlayerProgress {
  if (!previous || previous.phase === next.phase || !["RUN_WIN", "RUN_LOSE"].includes(next.phase)) return progress;
  const victorious = next.phase === "RUN_WIN";
  const dungeon = activeDungeonId ? DUNGEONS.find((candidate) => candidate.id === activeDungeonId) : undefined;
  const updated: PlayerProgress = {
    ...progress,
    wins: progress.wins + (victorious ? 1 : 0),
    losses: progress.losses + (victorious ? 0 : 1),
    bestWave: Math.max(progress.bestWave, next.wave),
    crystals: progress.crystals + (victorious ? (dungeon?.reward.crystals ?? 18) : 0),
    inventory: victorious && dungeon?.reward.equipmentId && !progress.inventory.includes(dungeon.reward.equipmentId) ? [...progress.inventory, dungeon.reward.equipmentId] : progress.inventory,
    dungeonClears: victorious && dungeon ? { ...progress.dungeonClears, [dungeon.id]: (progress.dungeonClears[dungeon.id] ?? 0) + 1 } : progress.dungeonClears,
    daily: victorious ? { ...progress.daily, victories: progress.daily.victories + 1 } : progress.daily,
    heroProgress: victorious ? awardHeroExperience(progress.heroProgress, previous.selectedHeroes) : progress.heroProgress,
  };
  return persist(updated);
}

const dailyValue = (progress: PlayerProgress, questId: DailyQuestId) => questId === "battle" ? progress.daily.battles : questId === "merge" ? progress.daily.merges : progress.daily.victories;
const SHOP_ROTATIONS: ShopOfferId[][] = [["forgeBundle", "morningBladeOffer", "fateDiceBoxOffer"], ["forgeBundle", "watcherCloakOffer", "morningBladeOffer"], ["fateDiceBoxOffer", "watcherCloakOffer", "forgeBundle"]];
const rarityMaterials = (equipmentId: EquipmentId) => EQUIPMENT[equipmentId].rarity === "史詩" ? 24 : EQUIPMENT[equipmentId].rarity === "稀有" ? 16 : 10;

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "title",
  selectedHeroes: ["knight", "fireMage", "ranger"],
  leaderId: "knight",
  selectedDungeonId: undefined,
  activeDungeonId: undefined,
  progress: loadedProgress,
  autoSpeed: 1,
  isPaused: false,
  openScreen: (screen) => set((state) => {
    const noticeId = (["equipment", "shop", "daily", "dungeon"] as string[]).includes(screen) ? screen as LobbyNoticeId : undefined;
    const progress = noticeId && !state.progress.lobbyRead[noticeId] ? persist({ ...state.progress, lobbyRead: { ...state.progress.lobbyRead, [noticeId]: true } }) : state.progress;
    return { screen, progress, selectedDungeonId: screen === "title" ? undefined : state.selectedDungeonId };
  }),
  toggleTeamHero: (heroId) => set((state) => {
    const selectedHeroes = state.selectedHeroes.includes(heroId)
      ? state.selectedHeroes.filter((id) => id !== heroId)
      : state.selectedHeroes.length < 3 ? [...state.selectedHeroes, heroId] : state.selectedHeroes;
    const leaderId = selectedHeroes.includes(state.leaderId) ? state.leaderId : selectedHeroes[0] ?? "knight";
    return { selectedHeroes, leaderId };
  }),
  setTeamSlot: (slotIndex, heroId) => set((state) => {
    if (slotIndex < 0 || slotIndex > 2) return state;
    const selectedHeroes = [...state.selectedHeroes];
    if (!heroId) {
      selectedHeroes.splice(slotIndex, 1);
    } else {
      const currentIndex = selectedHeroes.indexOf(heroId);
      if (currentIndex >= 0) {
        if (currentIndex !== slotIndex) {
          const slotHero = selectedHeroes[slotIndex];
          selectedHeroes[slotIndex] = heroId;
          if (slotHero) selectedHeroes[currentIndex] = slotHero;
          else selectedHeroes.splice(currentIndex, 1);
        }
      } else if (slotIndex < selectedHeroes.length) {
        selectedHeroes[slotIndex] = heroId;
      } else if (selectedHeroes.length < 3) {
        selectedHeroes.push(heroId);
      }
    }
    const leaderId = selectedHeroes.includes(state.leaderId) ? state.leaderId : selectedHeroes[0] ?? "knight";
    return { selectedHeroes, leaderId };
  }),
  chooseLeader: (leaderId) => set((state) => state.selectedHeroes.includes(leaderId) ? { leaderId } : state),
  startRun: () => {
    const { selectedHeroes, leaderId, selectedDungeonId, progress } = get();
    if (selectedHeroes.length !== 3) return;
    const dungeon = selectedDungeonId ? DUNGEONS.find((candidate) => candidate.id === selectedDungeonId) : undefined;
    if (dungeon && progress.stamina < dungeon.energyCost) return;
    const nextProgress = dungeon ? persist({ ...progress, stamina: progress.stamina - dungeon.energyCost }) : progress;
    const run = createRun({ selectedHeroes, leaderHeroId: leaderId, adapter: createDefaultMetaAdapter(nextProgress) });
    set({ run, progress: nextProgress, selectedDungeonId: undefined, activeDungeonId: dungeon?.id, screen: "game", isPaused: false });
  },
  selectDungeon: (selectedDungeonId) => set((state) => {
    const dungeon = DUNGEONS.find((candidate) => candidate.id === selectedDungeonId);
    const index = DUNGEONS.findIndex((candidate) => candidate.id === selectedDungeonId);
    const previous = DUNGEONS[index - 1];
    const unlocked = dungeon?.unlocked || (previous ? (state.progress.dungeonClears[previous.id] ?? 0) > 0 : false);
    if (!dungeon || !unlocked || state.selectedHeroes.length !== 3 || state.progress.stamina < dungeon.energyCost) return state;
    const progress = persist({ ...state.progress, stamina: state.progress.stamina - dungeon.energyCost });
    return {
      run: createRun({ selectedHeroes: state.selectedHeroes, leaderHeroId: state.leaderId, adapter: createDefaultMetaAdapter(progress) }),
      progress,
      selectedDungeonId: undefined,
      activeDungeonId: dungeon.id,
      screen: "game",
      isPaused: false,
    };
  }),
  equipItem: (equipmentId) => set((state) => {
    if (!state.progress.inventory.includes(equipmentId)) return state;
    const slot = EQUIPMENT[equipmentId].slot;
    return { progress: persist({ ...state.progress, equipped: { ...state.progress.equipped, [slot]: state.progress.equipped[slot] === equipmentId ? undefined : equipmentId } }) };
  }),
  unequipItem: (slot) => set((state) => ({ progress: persist({ ...state.progress, equipped: { ...state.progress.equipped, [slot]: undefined } }) })),
  claimDailyReward: (questId) => set((state) => {
    const quest = DAILY_QUESTS.find((candidate) => candidate.id === questId);
    if (!quest || state.progress.daily.claimed.includes(questId) || dailyValue(state.progress, questId) < quest.target) return state;
    return { progress: persist({ ...state.progress, crystals: state.progress.crystals + quest.rewardCrystals, daily: { ...state.progress.daily, claimed: [...state.progress.daily.claimed, questId] }, lobbyRead: { ...state.progress.lobbyRead, daily: true } }) };
  }),
  buyShopOffer: (offerId) => set((state) => {
    const offer = SHOP_OFFERS[offerId];
    if (!state.progress.shop.offers.includes(offerId) || state.progress.shop.purchased.includes(offerId) || state.progress.sigils < offer.price) return state;
    const equipmentId = offer.reward.equipmentId;
    const duplicateMaterials = equipmentId && state.progress.inventory.includes(equipmentId) ? rarityMaterials(equipmentId) : 0;
    return { progress: persist({ ...state.progress, sigils: state.progress.sigils - offer.price, materials: state.progress.materials + (offer.reward.materials ?? 0) + duplicateMaterials, inventory: equipmentId && !state.progress.inventory.includes(equipmentId) ? [...state.progress.inventory, equipmentId] : state.progress.inventory, equipmentLevels: equipmentId && !state.progress.equipmentLevels[equipmentId] ? { ...state.progress.equipmentLevels, [equipmentId]: 1 } : state.progress.equipmentLevels, shop: { ...state.progress.shop, purchased: [...state.progress.shop.purchased, offerId] } }) };
  }),
  refreshShop: () => set((state) => {
    if (!state.progress.shop.freeRefreshAvailable) return state;
    const currentIndex = SHOP_ROTATIONS.findIndex((rotation) => rotation.join("|") === state.progress.shop.offers.join("|"));
    const offers = SHOP_ROTATIONS[(currentIndex + 1) % SHOP_ROTATIONS.length];
    return { progress: persist({ ...state.progress, shop: { ...state.progress.shop, offers, purchased: [], freeRefreshAvailable: false } }) };
  }),
  upgradeEquipment: (equipmentId) => set((state) => {
    if (!state.progress.inventory.includes(equipmentId)) return state;
    const level = state.progress.equipmentLevels[equipmentId] ?? 1; const cost = level * 8;
    if (level >= 5 || state.progress.materials < cost) return state;
    return { progress: persist({ ...state.progress, materials: state.progress.materials - cost, equipmentLevels: { ...state.progress.equipmentLevels, [equipmentId]: level + 1 } }) };
  }),
  dismantleEquipment: (equipmentId) => set((state) => {
    if (!state.progress.inventory.includes(equipmentId)) return state;
    const level = state.progress.equipmentLevels[equipmentId] ?? 1; const materials = state.progress.materials + rarityMaterials(equipmentId) + (level - 1) * 6;
    const slot = EQUIPMENT[equipmentId].slot;
    const equipmentLevels = { ...state.progress.equipmentLevels }; delete equipmentLevels[equipmentId];
    return { progress: persist({ ...state.progress, materials, inventory: state.progress.inventory.filter((id) => id !== equipmentId), equipmentLevels, equipped: state.progress.equipped[slot] === equipmentId ? { ...state.progress.equipped, [slot]: undefined } : state.progress.equipped }) };
  }),
  restartRun: () => {
    const { selectedHeroes, leaderId, progress } = get();
    set({ run: createRun({ selectedHeroes, leaderHeroId: leaderId, adapter: createDefaultMetaAdapter(progress) }), screen: "game", activeDungeonId: undefined, isPaused: false });
  },
  // ---- Run Engine (Phase 9c) ----
  acknowledgeWavePreview: () => set((state) => state.run ? { run: acknowledgeWavePreview(state.run) } : state),
  toggleDiceLock: (index) => set((state) => state.run ? { run: toggleDiceLock(state.run, index) } : state),
  rerollDice: () => {
    const state = get();
    if (!state.run) return;
    emitAudio("reroll", state.progress.settings);
    set({ run: rerollDice(state.run) });
  },
  confirmFate: () => {
    const state = get();
    if (!state.run) return;
    if (state.progress.settings.vibrationEnabled) navigator.vibrate?.(12);
    emitAudio("dice_result", state.progress.settings);
    set({ run: confirmFate(state.run) });
  },
  chooseComboEffect: (kind) => set((state) => state.run ? { run: chooseComboEffect(state.run, kind, createDefaultMetaAdapter(state.progress)) } : state),
  chooseSummonHero: (heroId) => set((state) => state.run ? { run: chooseSummonHero(state.run, heroId, createDefaultMetaAdapter(state.progress)) } : state),
  chooseJackpotTierUpTarget: (cellKey) => set((state) => state.run ? { run: chooseJackpotTierUpTarget(state.run, cellKey) } : state),
  spendEnergyForRandomSummon: () => set((state) => state.run ? { run: spendEnergyForRandomSummon(state.run, createDefaultMetaAdapter(state.progress)) } : state),
  spendEnergyForChosenSummon: (heroId) => set((state) => state.run ? { run: spendEnergyForChosenSummon(state.run, heroId, createDefaultMetaAdapter(state.progress)) } : state),
  mergeSelection: (cellKeys, targetCellKey) => set((state) => {
    if (!state.run) return state;
    const run = mergeSelection(state.run, cellKeys, targetCellKey);
    if (run === state.run) return state;
    emitAudio("merge", state.progress.settings);
    return { run, progress: persist({ ...state.progress, daily: { ...state.progress.daily, merges: state.progress.daily.merges + 1 } }) };
  }),
  placePendingHero: (instanceId, cellKey) => set((state) => state.run ? { run: placePendingHero(state.run, instanceId, cellKey) } : state),
  recycleBoardHero: (cellKey) => set((state) => state.run ? { run: recycleBoardHero(state.run, cellKey) } : state),
  repositionHero: (fromCellKey, toCellKey) => set((state) => state.run ? { run: repositionHero(state.run, fromCellKey, toCellKey) } : state),
  buyExtraReposition: () => set((state) => state.run ? { run: buyExtraReposition(state.run) } : state),
  confirmFormation: () => set((state) => state.run ? { run: confirmFormation(state.run) } : state),
  combatTick: (delta) => set((state) => {
    if (!state.run || state.isPaused) return state;
    const run = advanceCombat(state.run, delta);
    const resolvedBattle = state.run.phase === "COMBAT_RUNNING" && run.phase !== "COMBAT_RUNNING";
    const baseProgress = resolvedBattle ? persist({ ...state.progress, daily: { ...state.progress.daily, battles: state.progress.daily.battles + 1 } }) : state.progress;
    return { run, progress: maybeRecordRunResult(state.run, run, baseProgress, state.activeDungeonId) };
  }),
  chooseTalentReward: (talentId) => set((state) => state.run ? { run: chooseTalentReward(state.run, talentId) } : state),
  chooseBlessingReward: (blessingId) => set((state) => state.run ? { run: chooseBlessingReward(state.run, blessingId) } : state),
  advanceToNextWave: () => set((state) => {
    if (!state.run) return state;
    const run = advanceToNextWave(state.run);
    return { run, progress: maybeRecordRunResult(state.run, run, state.progress, state.activeDungeonId) };
  }),
  setAutoSpeed: (autoSpeed) => set({ autoSpeed }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  setSetting: (setting, value) => set((state) => ({ progress: persist({ ...state.progress, settings: { ...state.progress.settings, [setting]: value } }) })),
}));

// Dev-only console/QA hook -- lets `window.__gameStore.getState()` drive combatTick()
// manually from devtools when a headless/backgrounded tab throttles requestAnimationFrame.
// Stripped from production builds by Vite's import.meta.env.DEV dead-code elimination.
if (import.meta.env.DEV && typeof window !== "undefined") (window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore;
