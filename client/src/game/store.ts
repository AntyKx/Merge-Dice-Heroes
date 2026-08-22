import { create } from "zustand";
import { emitAudio } from "./audio";
import { DICE_COMBINATIONS, HEROES } from "./config";
import { advanceCombat } from "./engine/combat";
import {
  beginReroll,
  chooseHeroSummon,
  chooseTalent,
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
import type { DiceCombinationKind, HeroId, PlayerProgress, RunState } from "./types";

export type GameScreen = "title" | "team" | "leader" | "game" | "guide" | "equipment" | "shop" | "daily" | "dungeon";

interface GameStore {
  screen: GameScreen;
  selectedHeroes: HeroId[];
  leaderId: HeroId;
  run?: RunState;
  progress: PlayerProgress;
  selectedBoardIndexes: number[];
  autoSpeed: 1 | 2 | 4;
  showDebug: boolean;
  openScreen: (screen: GameScreen) => void;
  toggleTeamHero: (heroId: HeroId) => void;
  chooseLeader: (heroId: HeroId) => void;
  startRun: () => void;
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
  const updated = {
    ...progress,
    wins: progress.wins + (next.phase === "VICTORY" ? 1 : 0),
    losses: progress.losses + (next.phase === "DEFEAT" ? 1 : 0),
    bestWave: Math.max(progress.bestWave, next.wave),
  };
  return persist(updated);
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "title",
  selectedHeroes: ["knight", "fireMage", "ranger"],
  leaderId: "knight",
  progress: loadedProgress,
  selectedBoardIndexes: [],
  autoSpeed: 1,
  showDebug: false,
  openScreen: (screen) => set({ screen, selectedBoardIndexes: [] }),
  toggleTeamHero: (heroId) => set((state) => {
    const selectedHeroes = state.selectedHeroes.includes(heroId)
      ? state.selectedHeroes.filter((id) => id !== heroId)
      : state.selectedHeroes.length < 3 ? [...state.selectedHeroes, heroId] : state.selectedHeroes;
    const leaderId = selectedHeroes.includes(state.leaderId) ? state.leaderId : selectedHeroes[0] ?? "knight";
    return { selectedHeroes, leaderId };
  }),
  chooseLeader: (leaderId) => set({ leaderId }),
  startRun: () => {
    const { selectedHeroes, leaderId } = get();
    if (selectedHeroes.length !== 3) return;
    set({ run: createRun(selectedHeroes, leaderId), screen: "game", selectedBoardIndexes: [] });
  },
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
    const { selectedHeroes, leaderId } = get();
    set({ run: createRun(selectedHeroes, leaderId), screen: "game", selectedBoardIndexes: [] });
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
    return { run, selectedBoardIndexes: [] };
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
    return { run, progress: maybeRecord(state.run, run, state.progress) };
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
