import { create } from "zustand";
import { emitAudio } from "./audio";
import { DAILY_QUESTS, DICE_COMBINATIONS, DUNGEONS, EQUIPMENT, getEquipmentBonuses, HEROES, SHOP_OFFERS } from "./config";
import { advanceCombat } from "./engine/combat";
import {
  beginReroll,
  chooseHeroSummon,
  chooseTalent,
  createDungeonRun,
  createRun,
  finishReroll,
  mergeBoardSelection,
  nextWave,
  pauseRun,
  prepareTalents,
  recycleTierOne,
  resolveDice,
  spendSummonEnergy,
  startCombat,
  toggleLock,
  triggerDebugCombination,
} from "./engine/run";
import { defaultProgress, loadProgress, saveProgress } from "./persistence";
import { createHero } from "./rules/merge";
import type { DailyQuestId, DiceCombinationKind, DungeonId, EquipmentId, EquipmentSlot, HeroId, PlayerProgress, RunState, ShopOfferId } from "./types";

export type GameScreen = "title" | "team" | "leader" | "game" | "guide" | "equipment" | "shop" | "daily" | "dungeon";

interface GameStore {
  screen: GameScreen;
  selectedHeroes: HeroId[];
  leaderId: HeroId;
  selectedDungeonId?: DungeonId;
  run?: RunState;
  progress: PlayerProgress;
  selectedBoardIndexes: number[];
  autoSpeed: 1 | 2 | 4;
  showDebug: boolean;
  openScreen: (screen: GameScreen) => void;
  toggleTeamHero: (heroId: HeroId) => void;
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
  startDemo: (fireMageTier?: 2 | 3, showcaseHero?: HeroId, castMode?: "leader" | "ultimate") => void;
  restartRun: () => void;
  toggleLock: (index: number) => void;
  reroll: () => void;
  resolve: () => void;
  chooseSummonHero: (heroId: HeroId) => void;
  useSummonEnergy: () => void;
  selectBoardHero: (index: number) => void;
  mergeSelected: () => void;
  swapBoardHeroes: (from: number, to: number) => void;
  recycleTierOne: () => void;
  beginCombat: () => void;
  combatTick: (delta: number) => void;
  prepareTalents: () => void;
  takeTalent: (talentId: string) => void;
  continueWave: () => void;
  pause: () => void;
  setSetting: (setting: keyof PlayerProgress["settings"], value: boolean) => void;
  setAutoSpeed: (speed: 1 | 2 | 4) => void;
  toggleDebug: () => void;
  debugTriggerCombination: (kind: DiceCombinationKind) => void;
  debugSummon: (heroId: HeroId, tier: 1 | 2 | 3) => void;
  debugJumpWave: (wave: number) => void;
  debugCastleHp: (amount: number) => void;
}

const loadedProgress = typeof window === "undefined" ? defaultProgress : loadProgress();

function persist(progress: PlayerProgress) {
  saveProgress(progress);
  return progress;
}

function maybeRecord(previous: RunState | undefined, next: RunState, progress: PlayerProgress) {
  if (!previous || previous.phase === next.phase || !["VICTORY", "DEFEAT"].includes(next.phase)) return progress;
  const victorious = next.phase === "VICTORY";
  const updated = {
    ...progress,
    wins: progress.wins + (victorious ? 1 : 0),
    losses: progress.losses + (victorious ? 0 : 1),
    bestWave: Math.max(progress.bestWave, next.wave),
    crystals: progress.crystals + (victorious ? (next.dungeonId ? (DUNGEONS.find((dungeon) => dungeon.id === next.dungeonId)?.reward.crystals ?? 0) : 18) : 0),
    inventory: victorious && next.dungeonId && DUNGEONS.find((dungeon) => dungeon.id === next.dungeonId)?.reward.equipmentId && !progress.inventory.includes(DUNGEONS.find((dungeon) => dungeon.id === next.dungeonId)!.reward.equipmentId!) ? [...progress.inventory, DUNGEONS.find((dungeon) => dungeon.id === next.dungeonId)!.reward.equipmentId!] : progress.inventory,
    dungeonClears: victorious && next.dungeonId ? { ...progress.dungeonClears, [next.dungeonId]: (progress.dungeonClears[next.dungeonId] ?? 0) + 1 } : progress.dungeonClears,
    daily: victorious ? { ...progress.daily, victories: progress.daily.victories + 1 } : progress.daily,
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
  progress: loadedProgress,
  selectedBoardIndexes: [],
  autoSpeed: 1,
  showDebug: false,
  openScreen: (screen) => set((state) => ({ screen, selectedBoardIndexes: [], selectedDungeonId: screen === "title" ? undefined : state.selectedDungeonId })),
  toggleTeamHero: (heroId) => set((state) => {
    const selectedHeroes = state.selectedHeroes.includes(heroId)
      ? state.selectedHeroes.filter((id) => id !== heroId)
      : state.selectedHeroes.length < 3 ? [...state.selectedHeroes, heroId] : state.selectedHeroes;
    const leaderId = selectedHeroes.includes(state.leaderId) ? state.leaderId : selectedHeroes[0] ?? "knight";
    return { selectedHeroes, leaderId };
  }),
  chooseLeader: (leaderId) => set({ leaderId }),
  startRun: () => {
    const { selectedHeroes, leaderId, selectedDungeonId, progress } = get();
    if (selectedHeroes.length !== 3) return;
    const equipmentBonuses = getEquipmentBonuses(progress.equipped, progress.equipmentLevels);
    const dungeon = selectedDungeonId ? DUNGEONS.find((candidate) => candidate.id === selectedDungeonId) : undefined;
    if (dungeon && progress.stamina < dungeon.energyCost) return;
    const nextProgress = dungeon ? persist({ ...progress, stamina: progress.stamina - dungeon.energyCost }) : progress;
    const run = dungeon ? createDungeonRun(selectedHeroes, leaderId, dungeon.id, equipmentBonuses) : createRun(selectedHeroes, leaderId, Math.random, equipmentBonuses);
    set({ run, progress: nextProgress, selectedDungeonId: undefined, screen: "game", selectedBoardIndexes: [] });
  },
  selectDungeon: (selectedDungeonId) => set((state) => {
    const dungeon = DUNGEONS.find((candidate) => candidate.id === selectedDungeonId);
    const index = DUNGEONS.findIndex((candidate) => candidate.id === selectedDungeonId);
    const previous = DUNGEONS[index - 1];
    const unlocked = dungeon?.unlocked || (previous ? (state.progress.dungeonClears[previous.id] ?? 0) > 0 : false);
    return dungeon && unlocked ? { selectedDungeonId, screen: "team" } : state;
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
    return { progress: persist({ ...state.progress, crystals: state.progress.crystals + quest.rewardCrystals, daily: { ...state.progress.daily, claimed: [...state.progress.daily.claimed, questId] } }) };
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
  startDemo: (fireMageTier = 2, showcaseHero: HeroId = "ranger", castMode?: "leader" | "ultimate") => {
    const random = () => 0.42;
    let run = createRun(["knight", "fireMage", showcaseHero], castMode ? showcaseHero : "fireMage", random);
    const board = [...run.board];
    board[0] = createHero("knight", 2);
    board[5] = createHero("fireMage", fireMageTier);
    board[10] = createHero(showcaseHero, 1);
    board[14] = createHero("knight", 1);
    run = castMode
      ? { ...run, board, phase: "MERGING", lastCombination: DICE_COMBINATIONS[castMode === "leader" ? "FOUR_KIND" : "FIVE_KIND"], message: castMode === "leader" ? "展示模式：隊長技能施放中。" : "展示模式：命運必殺施放中。" }
      : { ...run, board, phase: "COMBAT", message: "展示模式：第 1 波自動戰鬥中。" };
    set({ run, screen: "game", selectedBoardIndexes: [] });
  },
  restartRun: () => {
    const { selectedHeroes, leaderId, progress } = get();
    set({ run: createRun(selectedHeroes, leaderId, Math.random, getEquipmentBonuses(progress.equipped, progress.equipmentLevels)), screen: "game", selectedBoardIndexes: [] });
  },
  toggleLock: (index) => set((state) => state.run ? { run: toggleLock(state.run, index) } : state),
  reroll: () => {
    const current = get().run;
    if (!current) return;
    const started = beginReroll(current);
    if (started === current) return;
    emitAudio("reroll", get().progress.settings);
    set({ run: started });
    window.setTimeout(() => set((state) => state.run ? { run: finishReroll(state.run) } : state), 440);
  },
  resolve: () => set((state) => {
    if (!state.run) return state;
    if (state.progress.settings.vibrationEnabled) navigator.vibrate?.(12);
    emitAudio("dice_result", state.progress.settings);
    return { run: resolveDice(state.run), selectedBoardIndexes: [] };
  }),
  chooseSummonHero: (heroId) => set((state) => state.run ? { run: chooseHeroSummon(state.run, heroId) } : state),
  useSummonEnergy: () => set((state) => state.run ? { run: spendSummonEnergy(state.run) } : state),
  selectBoardHero: (index) => set((state) => {
    const hero = state.run?.board[index];
    if (!hero || !state.run) return state;
    const selection = state.selectedBoardIndexes;
    if (selection.includes(index)) return { selectedBoardIndexes: selection.filter((item) => item !== index) };
    const anchor = state.run.board[selection[0]];
    if (!anchor || (anchor.heroId === hero.heroId && anchor.tier === hero.tier)) return { selectedBoardIndexes: [...selection, index].slice(0, 3) };
    return { selectedBoardIndexes: [index] };
  }),
  mergeSelected: () => set((state) => {
    if (!state.run || !state.selectedBoardIndexes.length) return state;
    const run = mergeBoardSelection(state.run, state.selectedBoardIndexes, state.selectedBoardIndexes[0]);
    if (run !== state.run) emitAudio("merge", state.progress.settings);
    const progress = run !== state.run ? persist({ ...state.progress, daily: { ...state.progress.daily, merges: state.progress.daily.merges + 1 } }) : state.progress;
    return { run, progress, selectedBoardIndexes: [] };
  }),
  swapBoardHeroes: (from, to) => set((state) => {
    if (!state.run || state.run.phase !== "MERGING" || from === to || state.run.combat.lockedTile === to) return state;
    const board = [...state.run.board];
    [board[from], board[to]] = [board[to], board[from]];
    return { run: { ...state.run, board }, selectedBoardIndexes: [] };
  }),
  recycleTierOne: () => set((state) => state.run ? { run: recycleTierOne(state.run) } : state),
  beginCombat: () => set((state) => state.run ? { run: startCombat(state.run), selectedBoardIndexes: [] } : state),
  combatTick: (delta) => set((state) => {
    if (!state.run) return state;
    const run = advanceCombat(state.run, delta);
    const resolvedBattle = state.run.phase === "COMBAT" && run.phase !== "COMBAT";
    const baseProgress = resolvedBattle ? persist({ ...state.progress, daily: { ...state.progress.daily, battles: state.progress.daily.battles + 1 } }) : state.progress;
    return { run, progress: maybeRecord(state.run, run, baseProgress) };
  }),
  prepareTalents: () => set((state) => state.run ? { run: prepareTalents(state.run) } : state),
  takeTalent: (talentId) => set((state) => {
    if (!state.run) return state;
    if (state.progress.settings.vibrationEnabled) navigator.vibrate?.([10, 35, 10]);
    return { run: chooseTalent(state.run, talentId) };
  }),
  continueWave: () => set((state) => {
    if (!state.run) return state;
    const run = nextWave(state.run);
    return { run, progress: maybeRecord(state.run, run, state.progress) };
  }),
  pause: () => set((state) => state.run ? { run: pauseRun(state.run) } : state),
  setSetting: (setting, value) => set((state) => ({ progress: persist({ ...state.progress, settings: { ...state.progress.settings, [setting]: value } }) })),
  setAutoSpeed: (autoSpeed) => set({ autoSpeed }),
  toggleDebug: () => set((state) => ({ showDebug: !state.showDebug })),
  debugTriggerCombination: (kind) => set((state) => state.run ? { run: triggerDebugCombination(state.run, kind) } : state),
  debugSummon: (heroId, tier) => set((state) => {
    if (!state.run) return state;
    const board = [...state.run.board];
    const slot = board.findIndex((hero) => hero === null);
    if (slot >= 0) board[slot] = createHero(heroId, tier);
    return { run: { ...state.run, board, phase: "MERGING", message: `DEBUG：生成 T${tier} ${HEROES[heroId].name}。` } };
  }),
  debugJumpWave: (wave) => set((state) => {
    if (!state.run) return state;
    const fresh = createRun(state.run.selectedHeroes, state.run.leaderId);
    let run = { ...fresh, wave: Math.max(1, Math.min(10, wave)), combat: { ...fresh.combat, castleHp: state.run.combat.castleHp } };
    run = { ...run, phase: "SELECTING_DICE", message: `DEBUG：已跳到第 ${run.wave} 波。` };
    return { run };
  }),
  debugCastleHp: (amount) => set((state) => state.run ? { run: { ...state.run, combat: { ...state.run.combat, castleHp: Math.max(1, Math.min(20, state.run.combat.castleHp + amount)) } } } : state),
}));
