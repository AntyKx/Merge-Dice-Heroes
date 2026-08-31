/**
 * Run Engine orchestrator (Phase 9b) -- composes every pure rule module from
 * Phases 2-8 into the actual playable Wave lifecycle described in 玩法核心.txt
 * 二十五: WAVE_PREVIEW -> DICE_DECISION -> DICE_RESOLVE -> PREPARATION ->
 * FORMATION_CONFIRM -> COMBAT_RUNNING -> COMBAT_END -> POST_WAVE -> next Wave.
 *
 * This module is allowed to import every rules/* file plus the Hero/Enemy/Wave/
 * Leader Config -- it's deliberately the one place all of Phases 2-8 come
 * together. It still never imports store.ts/persistence.ts directly (see
 * metaAdapter.ts): createRun() takes a MetaProgressionAdapter, same as before.
 *
 * Mirrors the naming/shape of the existing game/engine/run.ts + combat.ts where
 * it made sense (createRun, toggleLock, resolveDice-equivalent, message field)
 * per 玩法核心.txt 一's "請依現有程式風格整合".
 */
import type { ChapterId, HeroId } from "../types";
import type {
  BoardCell,
  BoardState,
  CastleState,
  DiceComboKind,
  EnemyInstance,
  EquipmentLoadout,
  HeroDefinition,
  HeroInstance,
  HeroTier,
  RouteState,
  RunState,
  WaveDefinition,
} from "./types";
import { boardCellKey } from "./types";
import { RUN_ENGINE_CONFIG } from "./config";
import { ENEMY_DEFINITIONS } from "./enemies";
import { HERO_DEFINITIONS, HERO_EFFECT_REGISTRY } from "./heroes";
import { WAVES_BY_CHAPTER } from "./waves";
import { LEADER_BURST_REGISTRY, LEADER_PASSIVE_REGISTRY, buildLeaderState } from "./leaders";
import type { GlobalEffectContext, RunModifiersDelta } from "./leaders";
import type { MetaProgressionAdapter } from "./metaAdapter";
import { applyLevelScaling } from "./metaAdapter";
import { SIGNATURE_WEAPONS } from "./signatureWeapons";
import {
  getEquipmentAttackSpeedMultiplier,
  getEquipmentBossDamageMultiplier,
  getEquipmentCastleBonus,
  getEquipmentChainLightningProcChance,
  getEquipmentCritChance,
  getEquipmentCritDamageFactor,
  getEquipmentDamageMultiplier,
  getEquipmentDamageReductionPct,
  getEquipmentExtraRerolls,
  getEquipmentFateEnergyMaxBonus,
  getEquipmentFreeMergeChance,
  getEquipmentHpMultiplier,
  getEquipmentComboUpgradeChance,
  getEquipmentProtectedDieCount,
  getEquipmentRecoveryPctBonus,
  getEquipmentRepositionBonus,
  getEquipmentSummonCostReduction,
  getEquipmentTankBlockCapacityBonus,
  getEquipmentWaveStartShieldPct,
} from "./rules/equipment";
import { applySignatureWeapon } from "./rules/signatureWeapon";
import { getEligibleComboEffects, randomDie, rerollUnlocked, toggleDiceLock as toggleDiceLockRule } from "./rules/dice";
import { canMerge, resolveMerge } from "./rules/merge";
import {
  addToPending,
  emptyCellKeys,
  isPendingResolved,
  movePendingToBoard,
  placeOnBoard,
  routeNewSummon,
} from "./rules/pending";
import { canAfford, canBuyExtraReposition, gainEnergy, recycleRewardFor, spendEnergy } from "./rules/energy";
import { advanceAutoSkill, resetSkillRuntime } from "./rules/skill";
import { getBasicAttackDamage, getEffectiveAttackInterval, getTierStatMultiplier, resolveEffect, rollCritMultiplier } from "./rules/combat";
import type { CombatEffectContext, CombatEffectResult } from "./rules/combat";
import { generateTalentChoices, applyTalentChoice } from "./rules/talent";
import { generateBlessingChoices, applyBlessingChoice } from "./rules/blessing";
import { markBurstReady, consumeBurst, isBurstReadyToFire } from "./rules/leader";
import { applyCastleDamage, isRunFailure } from "./rules/castle";
import { createEnemyInstance, flattenSpawnSchedule, getDueSpawns, partitionReachedCastle, updateEnemyMovement } from "./rules/wave";
import { allOccupiedCells } from "./rules/board";
import { getEnemyTargetPool, getSupportTargets, pickRangedAttackTarget } from "./rules/targeting";
import { getBlockZones, getEffectiveBlockCapacity, computeBlockAssignments } from "./rules/block";
import type { BlockProvider, BlockTarget } from "./rules/block";
import { removeExpiredStatusEffects, totalMagnitudeCapped, upsertStatusEffect } from "./rules/status";
import { TALENT_POOL } from "./talents";
import { BLESSING_POOL } from "./blessings";

// ---------------------------------------------------------------------------
// Hero/Enemy instance creation
// ---------------------------------------------------------------------------

let heroInstanceSequence = 0;

function effectiveHeroDefinition(heroId: HeroId, adapter: MetaProgressionAdapter): HeroDefinition {
  const base = HERO_DEFINITIONS[heroId];
  if (!base) throw new Error(`Unknown HeroId for run-engine: ${heroId}`);
  const snapshot = adapter.getHeroSnapshot(heroId);
  const { baseAttack, baseHp } = applyLevelScaling(base, snapshot);
  const withSignature = applySignatureWeapon(base, snapshot.signatureWeaponUnlocked, SIGNATURE_WEAPONS[heroId]);
  return { ...withSignature, baseAttack, baseHp };
}

/** The one place every in-run lookup should go for "this hero's current
 * definition" -- falls back to the raw roster entry only defensively (should
 * never actually miss, since createRun populates run.effectiveHeroes for
 * every selectedHeroes entry up front). Reading HERO_DEFINITIONS directly
 * anywhere else silently drops both permanent Level scaling and Signature
 * Weapon patches for everything except a freshly-summoned hero's maxHp. */
function getHeroDefinition(run: RunState, heroId: HeroId): HeroDefinition | undefined {
  return run.effectiveHeroes[heroId] ?? HERO_DEFINITIONS[heroId];
}

function createHeroInstance(heroId: HeroId, tier: HeroTier, adapter: MetaProgressionAdapter, equipment: EquipmentLoadout): HeroInstance {
  heroInstanceSequence += 1;
  const definition = effectiveHeroDefinition(heroId, adapter);
  const maxHp = definition.baseHp * getTierStatMultiplier(definition, tier) * getEquipmentHpMultiplier(equipment);
  const instanceId = `${heroId}-${heroInstanceSequence}`;
  return {
    instanceId,
    heroId,
    tier,
    hp: maxHp,
    maxHp,
    shield: 0,
    cell: null,
    status: "active",
    buffs: [],
    skill: resetSkillRuntime(instanceId, definition.autoSkill.trigger),
    attackCooldownRemainingSeconds: 0,
  };
}

// ---------------------------------------------------------------------------
// Run creation
// ---------------------------------------------------------------------------

export interface CreateRunParams {
  selectedHeroes: HeroId[];
  leaderHeroId: HeroId;
  adapter: MetaProgressionAdapter;
  /** Which campaign chapter's Wave list this Run plays through. Defaults to the
   * original ("courtyard") chapter so every existing call site/test keeps
   * working unchanged. */
  chapterId?: ChapterId;
  /** Dungeon Trial: which Wave of `chapterId` to start at (default 1, i.e. the
   * normal campaign start). */
  startWave?: number;
  /** Dungeon Trial enemy modifier -- see RunState.enemyRule's doc comment. */
  enemyRule?: { hpMultiplier: number; speedMultiplier: number };
}

export function createRun({ selectedHeroes, leaderHeroId, adapter, chapterId = "courtyard", startWave = 1, enemyRule }: CreateRunParams): RunState {
  const equipment = adapter.getEquipmentLoadout(selectedHeroes);
  const leader = buildLeaderState(leaderHeroId);
  const effectiveHeroes = Object.fromEntries(
    selectedHeroes.filter((heroId) => HERO_DEFINITIONS[heroId]).map((heroId) => [heroId, effectiveHeroDefinition(heroId, adapter)]),
  ) as Partial<Record<HeroId, HeroDefinition>>;
  const maxRerolls = RUN_ENGINE_CONFIG.diceRerollsPerWave + getEquipmentExtraRerolls(equipment);
  const baseCastleHp = 20 + getEquipmentCastleBonus(equipment) + (leaderPassiveDelta(leader).castleBonus ?? 0);
  return {
    runId: `run-${Date.now()}`,
    phase: "WAVE_PREVIEW",
    wave: startWave,
    chapterId,
    enemyRule,
    selectedHeroes,
    effectiveHeroes,
    leader,
    board: { cells: {} },
    pending: { heroes: [] },
    dice: { values: [1, 1, 1, 1, 1], locked: [true, true, true, true, true], rerollsLeft: maxRerolls, maxRerolls, isRolling: false, protectedIndices: [] },
    fateEnergy: { current: 0, max: RUN_ENGINE_CONFIG.fateEnergy.max + getEquipmentFateEnergyMaxBonus(equipment) },
    reposition: { usedThisWave: 0, baseAllowance: RUN_ENGINE_CONFIG.repositionBaseAllowancePerWave + getEquipmentRepositionBonus(equipment), carriesOverBetweenWaves: RUN_ENGINE_CONFIG.repositionCarriesOverBetweenWaves, extraPurchasesThisWave: 0 },
    castle: { hp: baseCastleHp, maxHp: baseCastleHp },
    talents: [],
    blessings: [],
    equipment,
    comboHistory: [],
    pendingComboChoices: [],
    initialFreeRandomSummonAvailable: true,
    pendingHeroChoice: false,
    pendingFreeMerge: false,
    pendingJackpotTierUp: false,
    waveCombatBuff: { attackSpeedMultiplier: 1, damageMultiplier: 1 },
    talentChoices: [],
    blessingChoices: [],
    message: "命運的劇幕即將拉開。",
  };
}

/** Leader Passive is always on for the whole Run (see leaders.ts's doc comment) --
 * resolved once via the same opaque-effectId-through-a-registry pattern as
 * everything else, never hard-coded per hero here. */
function leaderPassiveDelta(leader: RunState["leader"]): RunModifiersDelta {
  return LEADER_PASSIVE_REGISTRY[leader.passive.effectId]?.() ?? {};
}

export function getWaveDefinition(chapterId: ChapterId, wave: number): WaveDefinition | undefined {
  return WAVES_BY_CHAPTER[chapterId][wave - 1];
}

// ---------------------------------------------------------------------------
// Wave Preview -> Dice
// ---------------------------------------------------------------------------

export function acknowledgeWavePreview(run: RunState, random: () => number = Math.random): RunState {
  if (run.phase !== "WAVE_PREVIEW") return run;
  const values = Array.from({ length: 5 }, () => randomDie(random));
  // 命運雙子骰 (twinFateDice): protect the top N highest-value dice from this
  // first roll from ever being selected for reroll -- fixed at this roll, not
  // recomputed after a later reroll (binds to your opening fate, not whatever
  // happens to be highest at any given moment).
  const protectedCount = Math.min(values.length, getEquipmentProtectedDieCount(run.equipment));
  const protectedIndices = protectedCount > 0
    ? values.map((_value, index) => index).sort((a, b) => values[b] - values[a]).slice(0, protectedCount)
    : [];
  return { ...run, phase: "DICE_DECISION", dice: { ...run.dice, values, locked: [true, true, true, true, true], protectedIndices }, message: "第一次擲骰免費。點選想重骰的骰子，或直接確認命運。" };
}

/** Despite the name (kept for the underlying rule fn / RunState field, which
 * predate this UI flip), a die's `locked` flag reads as "kept" -- the UI
 * click target is "select this die to reroll", i.e. it toggles the die INTO
 * the reroll set by clearing `locked`. See rerollDice below. A protected
 * index (twinFateDice) simply can't be toggled either direction. */
export function toggleDiceLock(run: RunState, index: number): RunState {
  if (run.phase !== "DICE_DECISION" || run.dice.protectedIndices.includes(index)) return run;
  return { ...run, dice: { ...run.dice, locked: toggleDiceLockRule(run.dice.locked, index) } };
}

/** Only rerolls the dice the player selected (locked === false); every other
 * die keeps its value. All dice reset to locked (kept/unselected) afterwards
 * so the next reroll round starts from a clean "nothing selected" slate. */
export function rerollDice(run: RunState, random: () => number = Math.random): RunState {
  if (run.phase !== "DICE_DECISION" || run.dice.rerollsLeft <= 0 || run.dice.locked.every(Boolean)) return run;
  const values = rerollUnlocked(run.dice.values, run.dice.locked, random);
  return { ...run, dice: { ...run.dice, values, locked: [true, true, true, true, true], rerollsLeft: run.dice.rerollsLeft - 1 }, message: "骰子已重骰——這個動作無法復原。" };
}

/** "Confirm Fate" per 二十六 -- locks in the final hand and surfaces every
 * eligible Combo (二十八) for the player to pick from next. */
export function confirmFate(run: RunState): RunState {
  if (run.phase !== "DICE_DECISION") return run;
  const pendingComboChoices = getEligibleComboEffects(run.dice.values);
  return { ...run, phase: "DICE_RESOLVE", pendingComboChoices, message: "命運已定。選擇一項效果。" };
}

// ---------------------------------------------------------------------------
// Summon (shared by Dice-combo effects, THREE_KIND choice, and Fate Energy spend)
// ---------------------------------------------------------------------------

/** If the board has room, the rule (十六) is a free player CHOICE of cell -- this
 * MVP auto-places at the first empty cell as a reasonable default; a UI can
 * instead call routeNewSummon()/placeOnBoard() itself to offer a real picker
 * without needing any change here. */
/** True unless the Pending Zone is already at capacity with no board room --
 * callers that are about to spend a limited resource (Fate Energy, the
 * one-time free summon, a THREE_KIND choice) must check this BEFORE spending,
 * per 十六's "禁止直接吃掉英雄...應暫停召喚結算" -- a blocked summon must
 * never silently consume the resource for nothing. */
function canSummonNow(run: RunState): boolean {
  return routeNewSummon(run.board, run.pending, RUN_ENGINE_CONFIG.pendingZoneCapacity) !== "blockedPendingFull";
}

function resolveSummon(run: RunState, heroId: HeroId, tier: HeroTier, adapter: MetaProgressionAdapter): RunState {
  const instance = createHeroInstance(heroId, tier, adapter, run.equipment);
  const routing = routeNewSummon(run.board, run.pending, RUN_ENGINE_CONFIG.pendingZoneCapacity);
  if (routing === "blockedPendingFull") return { ...run, message: "待命區已滿，請先安置或處理待命英雄，才能繼續召喚。" };
  if (routing === "addToPending") return { ...run, pending: addToPending(run.pending, instance, RUN_ENGINE_CONFIG.pendingZoneCapacity), message: `${heroId} 進入待命區。` };
  const cellKey = emptyCellKeys(run.board)[0];
  return { ...run, board: placeOnBoard(run.board, cellKey, instance), message: `${heroId} 加入舞台！` };
}

function summonRandomFromRoster(run: RunState, adapter: MetaProgressionAdapter, random: () => number): RunState {
  const heroId = run.selectedHeroes[Math.floor(random() * run.selectedHeroes.length)];
  return resolveSummon(run, heroId, 1, adapter);
}

// ---------------------------------------------------------------------------
// Choose a Combo effect (二十七/二十八 -- never auto-picks "the highest")
// ---------------------------------------------------------------------------

/** Highest-value-first, matching rules/dice.ts's evaluateDiceHand push order --
 * used only to find "the next kind up" for 賭徒的算計 (gamblersReckoning)
 * below, never to invent a ranking of its own. */
const COMBO_PRIORITY: DiceComboKind[] = ["FIVE_KIND", "FOUR_KIND", "FULL_HOUSE", "LARGE_STRAIGHT", "SMALL_STRAIGHT", "THREE_KIND", "TWO_PAIR", "PAIR", "NONE"];

export function chooseComboEffect(run: RunState, kind: DiceComboKind, adapter: MetaProgressionAdapter, random: () => number = Math.random): RunState {
  if (run.phase !== "DICE_RESOLVE") return run;
  let choice = run.pendingComboChoices.find((entry) => entry.kind === kind);
  if (!choice) return run;
  // 賭徒的算計 (gamblersReckoning): a chance to resolve as one tier higher --
  // only among kinds this EXACT dice hand already legitimately qualifies for
  // (still present in pendingComboChoices), never a kind the hand can't back.
  let resolvedKind = kind;
  if (kind !== "NONE") {
    const comboUpgradeChance = getEquipmentComboUpgradeChance(run.equipment);
    if (comboUpgradeChance > 0 && random() < comboUpgradeChance) {
      const currentIndex = COMBO_PRIORITY.indexOf(kind);
      const upgradedKind = COMBO_PRIORITY.slice(0, currentIndex).reverse().find((candidate) => run.pendingComboChoices.some((entry) => entry.kind === candidate));
      if (upgradedKind) {
        choice = run.pendingComboChoices.find((entry) => entry.kind === upgradedKind)!;
        resolvedKind = upgradedKind;
      }
    }
  }
  let next: RunState = {
    ...run,
    phase: "PREPARATION",
    pendingComboChoices: [],
    comboHistory: [...run.comboHistory, { kind: resolvedKind, wave: run.wave }],
    message: resolvedKind !== kind ? `賭徒的算計發動！骰型結算提升為：${resolvedKind}。` : `骰型成立：${resolvedKind}。`,
  };
  const { effect } = choice;
  if (effect.kind === "gainFateEnergy") next = { ...next, fateEnergy: gainEnergy(next.fateEnergy, effect.amount) };
  else if (effect.kind === "summonRandom") for (let i = 0; i < effect.count; i += 1) next = summonRandomFromRoster(next, adapter, random);
  else if (effect.kind === "summonChosen") next = { ...next, pendingHeroChoice: true, message: "三條成立！請指定要召喚的英雄。" };
  else if (effect.kind === "combatBuff") {
    next = {
      ...next,
      waveCombatBuff: {
        attackSpeedMultiplier: next.waveCombatBuff.attackSpeedMultiplier * (1 + (effect.attackSpeedPct ?? 0)),
        damageMultiplier: next.waveCombatBuff.damageMultiplier * (1 + (effect.damagePct ?? 0)),
      },
    };
  } else if (effect.kind === "freeMergeWithTwo") next = { ...next, pendingFreeMerge: true, message: "葫蘆成立！下一次合成可用 2 名同英雄同階英雄。" };
  else if (effect.kind === "leaderBurstReady") next = { ...next, leader: markBurstReady(next.leader), message: "四條成立！隊長爆發已就緒。" };
  else if (effect.kind === "jackpotTierUp") next = { ...next, leader: markBurstReady(next.leader), pendingJackpotTierUp: true, message: "五條！選擇棋盤上一名 T1/T2 英雄直接升階，並獲得隊長爆發。" };
  return next;
}

export function chooseSummonHero(run: RunState, heroId: HeroId, adapter: MetaProgressionAdapter): RunState {
  if (run.phase !== "PREPARATION" || !run.pendingHeroChoice || !run.selectedHeroes.includes(heroId)) return run;
  if (!canSummonNow(run)) return { ...run, message: "待命區已滿，請先安置或處理待命英雄，才能繼續召喚。" };
  return { ...resolveSummon(run, heroId, 1, adapter), pendingHeroChoice: false };
}

export function chooseJackpotTierUpTarget(run: RunState, cellKey: ReturnType<typeof boardCellKey>): RunState {
  if (run.phase !== "PREPARATION" || !run.pendingJackpotTierUp) return run;
  const hero = run.board.cells[cellKey];
  if (!hero || hero.tier === 3) return run;
  const nextTier = (hero.tier + 1) as HeroTier;
  const definition = getHeroDefinition(run, hero.heroId);
  const maxHp = definition ? definition.baseHp * getTierStatMultiplier(definition, nextTier) * getEquipmentHpMultiplier(run.equipment) : hero.maxHp;
  return {
    ...run,
    board: { cells: { ...run.board.cells, [cellKey]: { ...hero, tier: nextTier, maxHp, hp: maxHp } } },
    pendingJackpotTierUp: false,
    message: `傑克帕！${hero.heroId} 升階至 T${nextTier}。`,
  };
}

// ---------------------------------------------------------------------------
// Preparation: Fate Energy spend, Merge, Pending resolution, Reposition, Recycle
// ---------------------------------------------------------------------------

export function spendEnergyForRandomSummon(run: RunState, adapter: MetaProgressionAdapter, random: () => number = Math.random): RunState {
  if (run.phase !== "PREPARATION") return run;
  if (!canSummonNow(run)) return { ...run, message: "待命區已滿，請先安置或處理待命英雄，才能繼續召喚。" };
  if (run.initialFreeRandomSummonAvailable) {
    const summoned = summonRandomFromRoster(run, adapter, random);
    return { ...summoned, initialFreeRandomSummonAvailable: false, message: "開局免費隨機召喚完成！" };
  }
  // 徵兵令 (conscriptionOrder): flat Fate Energy discount, floored at 0.
  const cost = Math.max(0, RUN_ENGINE_CONFIG.fateEnergy.randomSummonCost - getEquipmentSummonCostReduction(run.equipment));
  if (!canAfford(run.fateEnergy, cost)) return run;
  const spent = { ...run, fateEnergy: spendEnergy(run.fateEnergy, cost) };
  return summonRandomFromRoster(spent, adapter, random);
}

export function spendEnergyForChosenSummon(run: RunState, heroId: HeroId, adapter: MetaProgressionAdapter): RunState {
  const cost = Math.max(0, RUN_ENGINE_CONFIG.fateEnergy.specifiedSummonCost - getEquipmentSummonCostReduction(run.equipment));
  if (run.phase !== "PREPARATION" || !run.selectedHeroes.includes(heroId) || !canAfford(run.fateEnergy, cost)) return run;
  if (!canSummonNow(run)) return { ...run, message: "待命區已滿，請先安置或處理待命英雄，才能繼續召喚。" };
  const spent = { ...run, fateEnergy: spendEnergy(run.fateEnergy, cost) };
  return resolveSummon(spent, heroId, 1, adapter);
}

export function mergeSelection(run: RunState, cellKeys: ReturnType<typeof boardCellKey>[], targetCellKey: ReturnType<typeof boardCellKey>, random: () => number = Math.random): RunState {
  if (run.phase !== "PREPARATION") return run;
  const requiredCount = run.pendingFreeMerge && cellKeys.length === 2 ? 2 : 3;
  if (!canMerge(run.board, cellKeys, requiredCount)) return run;
  const board = resolveMerge(run.board, cellKeys, targetCellKey, (source, nextTier) => {
    const definition = getHeroDefinition(run, source.heroId);
    const maxHp = definition ? definition.baseHp * getTierStatMultiplier(definition, nextTier) * getEquipmentHpMultiplier(run.equipment) : source.maxHp;
    return { ...source, tier: nextTier, maxHp, hp: maxHp };
  }, requiredCount);
  if (board === run.board) return run;
  const wasFreeMerge = requiredCount === 2;
  // 熔合催化劑 (fusionCatalyst): a normal 3-hero Merge has a chance to grant a
  // follow-up free 2-hero Merge -- reuses pendingFreeMerge exactly as Full
  // House already does, so the board UI needs zero changes to support it.
  const grantsFollowUpFreeMerge = !wasFreeMerge && random() < getEquipmentFreeMergeChance(run.equipment);
  return {
    ...run,
    board,
    pendingFreeMerge: wasFreeMerge ? false : grantsFollowUpFreeMerge,
    message: grantsFollowUpFreeMerge ? "升階成功！熔合催化劑發動，下次合成只需 2 名！" : "升階成功！",
  };
}

/** Lets the player give up an unused Full House / 熔合催化劑 free 2-Merge instead
 * of hunting for a matching pair -- without this, a player whose board has no
 * 2-of-a-kind (or even 3-of-a-kind) match anywhere could never satisfy
 * pendingFreeMerge, and confirmFormation's gate would leave "確認陣型，開戰"
 * disabled with no way to recover for that Wave. */
export function declineFreeMerge(run: RunState): RunState {
  if (run.phase !== "PREPARATION" || !run.pendingFreeMerge) return run;
  return { ...run, pendingFreeMerge: false, message: "已放棄本次免費合成。" };
}

export function placePendingHero(run: RunState, instanceId: string, cellKey: ReturnType<typeof boardCellKey>): RunState {
  if (run.phase !== "PREPARATION") return run;
  const { pending, board } = movePendingToBoard(run.pending, run.board, instanceId, cellKey);
  return { ...run, pending, board };
}

/** Recycling a board hero for Fate Energy (二十九) -- distinct from the Pending
 * Zone's own resolution, this always removes from the BOARD, never Pending. */
export function recycleBoardHero(run: RunState, cellKey: ReturnType<typeof boardCellKey>): RunState {
  if (run.phase !== "PREPARATION") return run;
  const hero = run.board.cells[cellKey];
  if (!hero) return run;
  const reward = recycleRewardFor(hero.tier, RUN_ENGINE_CONFIG.fateEnergy);
  const cells = { ...run.board.cells };
  delete cells[cellKey];
  return { ...run, board: { cells }, fateEnergy: gainEnergy(run.fateEnergy, reward), message: `重整完成，獲得 ${reward} 點命運能量。` };
}

/** Any board hero moving to any empty cell, or swapping with another board hero,
 * costs 1 Reposition -- 十七's "任何英雄移動到任何空格=1次，交換兩名英雄=1次". */
export function repositionHero(run: RunState, fromCellKey: ReturnType<typeof boardCellKey>, toCellKey: ReturnType<typeof boardCellKey>): RunState {
  if (run.phase !== "PREPARATION" || fromCellKey === toCellKey) return run;
  const remainingAllowance = run.reposition.baseAllowance - run.reposition.usedThisWave;
  if (remainingAllowance <= 0) return { ...run, message: "本波調度次數已用完。" };
  const from = run.board.cells[fromCellKey];
  if (!from) return run;
  const to = run.board.cells[toCellKey];
  const cells = { ...run.board.cells };
  if (to) cells[fromCellKey] = to;
  else delete cells[fromCellKey];
  cells[toCellKey] = from;
  return { ...run, board: { cells }, reposition: { ...run.reposition, usedThisWave: run.reposition.usedThisWave + 1 } };
}

export function buyExtraReposition(run: RunState): RunState {
  if (run.phase !== "PREPARATION" || !canBuyExtraReposition(run.fateEnergy, run.reposition.extraPurchasesThisWave, RUN_ENGINE_CONFIG.fateEnergy)) return run;
  return {
    ...run,
    fateEnergy: spendEnergy(run.fateEnergy, RUN_ENGINE_CONFIG.fateEnergy.extraRepositionCost),
    reposition: { ...run.reposition, baseAllowance: run.reposition.baseAllowance + 1, extraPurchasesThisWave: run.reposition.extraPurchasesThisWave + 1 },
  };
}

/** Preparation -> Combat gate: Pending must be fully resolved (十六), and any
 * pending choice from a Dice Combo must already be handled. */
export function confirmFormation(run: RunState): RunState {
  if (run.phase !== "PREPARATION" || !isPendingResolved(run.pending) || run.pendingHeroChoice || run.pendingFreeMerge || run.pendingJackpotTierUp) return run;
  const waveDefinition = getWaveDefinition(run.chapterId, run.wave);
  if (!waveDefinition) return run;
  const routes: RouteState[] = ([1, 2, 3, 4] as const).map((routeId) => ({ routeId, active: waveDefinition.activeRoutes.includes(routeId), enemies: [] }));
  const spawnQueue = flattenSpawnSchedule(waveDefinition.batches);
  // 王室徽甲 (royalWardplate): every board hero starts the Wave's combat with a
  // Shield worth a fraction of the Castle's max HP.
  const waveStartShieldPct = getEquipmentWaveStartShieldPct(run.equipment);
  const board = waveStartShieldPct > 0
    ? { cells: Object.fromEntries(Object.entries(run.board.cells).map(([key, hero]) => [key, hero ? { ...hero, shield: hero.shield + run.castle.maxHp * waveStartShieldPct } : hero])) as BoardState["cells"] }
    : run.board;
  return {
    ...run,
    board,
    phase: "COMBAT_RUNNING",
    waveRuntime: { waveNumber: run.wave, routes, spawnQueue, spawnedCount: 0, elapsedSeconds: 0 },
    message: `第 ${run.wave} 波開戰！`,
  };
}

// ---------------------------------------------------------------------------
// Combat tick -- applying a CombatEffectResult back onto board/routes
// ---------------------------------------------------------------------------

type CellKey = ReturnType<typeof boardCellKey>;

function findHeroCellKey(board: BoardState, instanceId: string): CellKey | undefined {
  return (Object.keys(board.cells) as CellKey[]).find((key) => board.cells[key]?.instanceId === instanceId);
}

function updateHero(board: BoardState, instanceId: string, updater: (hero: HeroInstance) => HeroInstance): BoardState {
  const cellKey = findHeroCellKey(board, instanceId);
  if (!cellKey) return board;
  const hero = board.cells[cellKey];
  if (!hero) return board;
  return { cells: { ...board.cells, [cellKey]: updater(hero) } };
}

/** Damage-to-hero specifically (not part of CombatEffectResult -- that's only for
 * hero-sourced effects landing on enemies/allies) consumes Shield before HP, same
 * absorption order as the old game/engine/combat.ts. `reductionPct` (迷霧斗篷 etc,
 * already clamped by getEquipmentDamageReductionPct) is applied before either. */
function damageHero(board: BoardState, instanceId: string, amount: number, reductionPct = 0): BoardState {
  const reduced = amount * (1 - reductionPct);
  return updateHero(board, instanceId, (hero) => {
    const absorbed = Math.min(hero.shield, reduced);
    const hp = Math.max(0, hero.hp - (reduced - absorbed));
    return { ...hero, shield: hero.shield - absorbed, hp, status: hp <= 0 ? "downed" : hero.status };
  });
}

function damageRoutes(routes: RouteState[], instanceId: string, amount: number): RouteState[] {
  return routes.map((route) => ({ ...route, enemies: route.enemies.map((enemy) => (enemy.instanceId === instanceId ? { ...enemy, hp: enemy.hp - amount } : enemy)) }));
}

function debuffRoutes(routes: RouteState[], instanceId: string, statusId: string, magnitude: number, durationMs: number | undefined, source: string): RouteState[] {
  return routes.map((route) => ({
    ...route,
    enemies: route.enemies.map((enemy) => (enemy.instanceId === instanceId
      ? { ...enemy, debuffs: upsertStatusEffect(enemy.debuffs, { id: statusId, source, magnitude, expiresAtMs: durationMs !== undefined ? Date.now() + durationMs : undefined }) }
      : enemy)),
  }));
}

/** Applies every field of a CombatEffectResult (Hero Auto Skill/Trait, or Leader
 * Burst) onto the current board+routes. `sourceInstanceId` tags applied buffs/
 * debuffs so upsertStatusEffect's same-id+same-source replace rule (十三) works. */
function applyCombatEffectResult(board: BoardState, routes: RouteState[], result: CombatEffectResult, sourceInstanceId: string): { board: BoardState; routes: RouteState[] } {
  let nextBoard = board;
  let nextRoutes = routes;
  (result.damageToEnemies ?? []).forEach(({ instanceId, amount }) => { nextRoutes = damageRoutes(nextRoutes, instanceId, amount); });
  (result.healToAllies ?? []).forEach(({ instanceId, amount }) => { nextBoard = updateHero(nextBoard, instanceId, (hero) => ({ ...hero, hp: Math.min(hero.maxHp, hero.hp + amount) })); });
  (result.shieldToAllies ?? []).forEach(({ instanceId, amount }) => { nextBoard = updateHero(nextBoard, instanceId, (hero) => ({ ...hero, shield: hero.shield + amount })); });
  (result.buffToAllies ?? []).forEach(({ instanceId, statusId, magnitude, durationMs }) => {
    nextBoard = updateHero(nextBoard, instanceId, (hero) => ({ ...hero, buffs: upsertStatusEffect(hero.buffs, { id: statusId, source: sourceInstanceId, magnitude, expiresAtMs: durationMs !== undefined ? Date.now() + durationMs : undefined }) }));
  });
  (result.debuffToEnemies ?? []).forEach(({ instanceId, statusId, magnitude, durationMs }) => { nextRoutes = debuffRoutes(nextRoutes, instanceId, statusId, magnitude, durationMs, sourceInstanceId); });
  return { board: nextBoard, routes: nextRoutes };
}

/** Slow's effective speed multiplier, floored at 0.2x so a Boss/anything can never
 * be fully frozen in place by stacked Slow alone (十三's Control Cap spirit --
 * genuine Freeze/immobilize is a distinct, not-yet-modeled status). Cap of 0.6
 * total magnitude is a tentative Config-worthy value, not from the doc verbatim. */
function enemySpeedMultiplier(enemy: EnemyInstance): number {
  return Math.max(0.2, 1 - totalMagnitudeCapped(enemy.debuffs, "slow", 0.6));
}

/** attackSpeed buff magnitude is a fractional bonus (0.26 = +26%), capped at +100%
 * total from stacked sources -- mirrors enemySpeedMultiplier's Cap approach. */
function heroSpeedMultiplier(hero: HeroInstance): number {
  return 1 + totalMagnitudeCapped(hero.buffs, "attackSpeed", 1);
}

// ---------------------------------------------------------------------------
// Combat tick -- the per-frame Wave loop (Spawn -> Block -> Move -> Castle ->
// Blocked-enemy-counterattack -> Ranged-enemy-direct-strike -> Hero Basic Attack
// + Auto Skill + Trait -> cleanup -> Leader Burst firing -> failure/clear
// detection), per 玩法核心.txt 七/八/九/十/十四/十九/二十/三十三.
//
// Explicitly OUT of scope for this pass (documented, not silently skipped):
// Boss phase-trigger scripting (BossEncounterDefinition.phases), "explodes on
// death"-style special enemy behaviors, Battlefield Events, and any Control
// effect beyond the Slow-style speed multiplier above (no hard Freeze/Stun yet).
// ---------------------------------------------------------------------------

export function advanceCombat(run: RunState, delta: number, random: () => number = Math.random): RunState {
  if (run.phase !== "COMBAT_RUNNING" || !run.waveRuntime) return run;

  let board = run.board;
  let castle = run.castle;
  let leader = run.leader;
  let waveRuntime = { ...run.waveRuntime, elapsedSeconds: run.waveRuntime.elapsedSeconds + delta };
  let routes = waveRuntime.routes;

  // 1. Spawn due enemies (only onto their home Route -- occupiedRoutes already
  // covers the width, we just need one Route array to hold the instance).
  const { dueSpawns, nextSpawnedCount } = getDueSpawns(waveRuntime);
  dueSpawns.forEach((spawn) => {
    const definition = ENEMY_DEFINITIONS[spawn.enemyId];
    if (!definition) return;
    const enemy = createEnemyInstance(definition, spawn.routes, `${spawn.enemyId}-${Math.floor(random() * 1e9)}`, run.enemyRule?.hpMultiplier ?? 1);
    const homeRoute = spawn.routes[0];
    routes = routes.map((route) => (route.routeId === homeRoute ? { ...route, enemies: [...route.enemies, enemy] } : route));
  });
  waveRuntime = { ...waveRuntime, spawnedCount: nextSpawnedCount };

  // 2. Block assignment, recomputed fresh every tick (see block.ts's doc comment).
  const blockProviders: BlockProvider[] = allOccupiedCells(board)
    .filter(({ hero }) => hero.status === "active")
    .flatMap(({ cell, hero }) => {
      const definition = getHeroDefinition(run, hero.heroId);
      if (!definition) return [];
      const blockRule = { ...definition.blockRule, ...definition.tiers[hero.tier].behavior.blockRule };
      const baseCapacity = getEffectiveBlockCapacity(cell, blockRule);
      if (baseCapacity <= 0) return [];
      // 前線軍旗 (vanguardBanner): only tops up a tank ALREADY block-capable by
      // position -- it doesn't conjure capacity for a tank parked somewhere
      // that gets none, e.g. the back row.
      const capacity = baseCapacity + (definition.role === "tank" ? getEquipmentTankBlockCapacityBonus(run.equipment) : 0);
      // Gate Block engagement by the SAME "how far along the Route can this hero
      // reach" concept as its own attacks (九), so a melee tank can't be dragged
      // into fighting -- and taking counterattack damage from -- an enemy that
      // only just spawned and merely shares its DefenseZone (previously, Block
      // assignment only checked zone membership, never distance, which is why a
      // tank could get hit by monsters still far up the lane -- see 玩法核心.txt 八).
      const engageMinPathProgress = 1 - definition.rangeAlongRoute;
      return [{ instanceId: hero.instanceId, zones: getBlockZones(cell, blockRule), capacity, engageMinPathProgress } satisfies BlockProvider];
    });
  const blockTargets: BlockTarget[] = routes.flatMap((route) => route.enemies).map((enemy) => ({
    instanceId: enemy.instanceId,
    occupiedZones: enemy.occupiedRoutes,
    blockCost: ENEMY_DEFINITIONS[enemy.defId]?.blockCost ?? 1,
    pathProgress: enemy.pathProgress,
  }));
  const previousAssignments = new Map(routes.flatMap((route) => route.enemies).flatMap((enemy) => (enemy.blockedBy ? [[enemy.instanceId, enemy.blockedBy] as const] : [])));
  const assignments = computeBlockAssignments(blockProviders, blockTargets, previousAssignments);
  routes = routes.map((route) => ({ ...route, enemies: route.enemies.map((enemy) => ({ ...enemy, blockedBy: assignments.get(enemy.instanceId) })) }));

  // 3. Movement -- only unblocked enemies advance, slowed by any Slow debuff and
  // scaled by the Dungeon Trial's speedMultiplier, if any (深域狩令 v1).
  const dungeonSpeedMultiplier = run.enemyRule?.speedMultiplier ?? 1;
  routes = routes.map((route) => updateEnemyMovement(route, delta, new Set(assignments.keys()), (enemy) => (ENEMY_DEFINITIONS[enemy.defId]?.speed ?? 0) * enemySpeedMultiplier(enemy) * dungeonSpeedMultiplier));

  // 4. Enemies reaching the castle deal CastleDamage and leave the Route.
  routes = routes.map((route) => {
    const { reached, remaining } = partitionReachedCastle(route);
    reached.forEach((enemy) => { castle = applyCastleDamage(castle, ENEMY_DEFINITIONS[enemy.defId]?.castleDamage ?? 1); });
    return remaining;
  });

  // 5. Blocked enemies fight their blocker (八's "被阻擋的怪物攻擊阻擋者").
  const damageReductionPct = getEquipmentDamageReductionPct(run.equipment);
  routes = routes.map((route) => ({
    ...route,
    enemies: route.enemies.map((enemy) => {
      if (!enemy.blockedBy) return enemy;
      const definition = ENEMY_DEFINITIONS[enemy.defId];
      if (!definition) return enemy;
      const cooldown = enemy.attackCooldownRemainingSeconds - delta;
      if (cooldown > 0) return { ...enemy, attackCooldownRemainingSeconds: cooldown };
      board = damageHero(board, enemy.blockedBy, definition.baseAttack, damageReductionPct);
      return { ...enemy, attackCooldownRemainingSeconds: definition.attackIntervalSeconds };
    }),
  }));

  // 6. "Ranged"-tagged enemies (enemies.ts tags) strike a hero directly once
  // close enough, completely independent of Block -- Block only ever stops an
  // enemy's forward movement (step 2/3), it was never the only thing gating who
  // an enemy can hit. This is what makes a ranged/back-row hero actually
  // threatened: it targets the BACK-most occupied row in a matching DefenseZone
  // (pickRangedAttackTarget), i.e. it shoots past whichever hero is Blocking it.
  // A dedicated cooldown field keeps this cadence independent from the Block
  // counterattack above, so a blocked-AND-ranged enemy still fires both.
  routes = routes.map((route) => ({
    ...route,
    enemies: route.enemies.map((enemy) => {
      const definition = ENEMY_DEFINITIONS[enemy.defId];
      if (!definition?.tags.includes("ranged")) return enemy;
      if (enemy.pathProgress < RUN_ENGINE_CONFIG.rangedEnemyEngageRangeAlongRoute) return enemy;
      const cooldown = enemy.rangedAttackCooldownRemainingSeconds - delta;
      if (cooldown > 0) return { ...enemy, rangedAttackCooldownRemainingSeconds: cooldown };
      const target = pickRangedAttackTarget(board, enemy.occupiedRoutes);
      if (!target) return { ...enemy, rangedAttackCooldownRemainingSeconds: 0 };
      board = damageHero(board, target.instanceId, definition.baseAttack, damageReductionPct);
      return { ...enemy, rangedAttackCooldownRemainingSeconds: definition.attackIntervalSeconds };
    }),
  }));

  // 7. Hero Basic Attack + Auto Skill trigger + Trait.
  const damageMultiplier = getEquipmentDamageMultiplier(run.equipment) * run.waveCombatBuff.damageMultiplier * (1 + (leaderPassiveDelta(leader).damageMultiplier ?? 0));
  const equipmentAttackSpeedMultiplier = getEquipmentAttackSpeedMultiplier(run.equipment);
  const critChance = getEquipmentCritChance(run.equipment);
  const critDamageFactor = getEquipmentCritDamageFactor(run.equipment);
  const bossDamageMultiplier = getEquipmentBossDamageMultiplier(run.equipment);
  const chainLightningProcChance = getEquipmentChainLightningProcChance(run.equipment);
  allOccupiedCells(board).forEach(({ cellKey, cell, hero }) => {
    if (hero.status !== "active") return;
    const definition = getHeroDefinition(run, hero.heroId);
    if (!definition) return;
    const current = board.cells[cellKey];
    if (!current) return;

    // A blocked enemy is engaged in melee with its blocker regardless of how far
    // along the Route it got before being blocked (it may have been blocked at
    // pathProgress 0) -- rangeAlongRoute alone would otherwise make a tank unable
    // to ever damage what it's currently blocking, since minPathProgress is
    // usually only satisfied near the castle end. Union those in explicitly and
    // give them attack priority (they're the whole reason Block exists).
    const rangePool = getEnemyTargetPool(cell, definition.coverage, definition.rangeAlongRoute, routes);
    const blockedByMe = routes.flatMap((route) => route.enemies).filter((enemy) => enemy.blockedBy === current.instanceId);
    const enemyTargetPool = [...blockedByMe, ...rangePool.filter((enemy) => enemy.blockedBy !== current.instanceId)];
    const allySupportPool = definition.supportRange
      ? getSupportTargets(cell, board, definition.supportRange).map(({ hero: ally }) => ({ instanceId: ally.instanceId, hp: ally.hp, maxHp: ally.maxHp }))
      : [];

    let attackCooldown = current.attackCooldownRemainingSeconds - delta;
    let justAttacked = false;
    if (definition.coverage.kind !== "auraOnly" && attackCooldown <= 0 && enemyTargetPool.length) {
      const target = blockedByMe[0] ?? [...enemyTargetPool].sort((a, b) => b.pathProgress - a.pathProgress)[0];
      const targetTags = ENEMY_DEFINITIONS[target.defId]?.tags ?? [];
      const isPriorityTarget = targetTags.includes("elite") || targetTags.includes("boss");
      const critFactor = rollCritMultiplier(critChance, critDamageFactor, random);
      const targetDamageMultiplier = damageMultiplier * (isPriorityTarget ? bossDamageMultiplier : 1) * critFactor;
      const damage = getBasicAttackDamage(definition, current.tier, targetDamageMultiplier);
      routes = damageRoutes(routes, target.instanceId, damage);
      // 連鎖雷光杖 (chainlightRod): the landed attack also arcs to a second
      // target already in this hero's own pool, for half damage -- never
      // invents a target outside what this hero could already reach.
      if (chainLightningProcChance > 0 && random() < chainLightningProcChance) {
        const secondary = enemyTargetPool.find((enemy) => enemy.instanceId !== target.instanceId);
        if (secondary) routes = damageRoutes(routes, secondary.instanceId, damage * 0.5);
      }
      attackCooldown = getEffectiveAttackInterval(definition, run.waveCombatBuff.attackSpeedMultiplier * heroSpeedMultiplier(current) * equipmentAttackSpeedMultiplier);
      justAttacked = true;
    }
    attackCooldown = Math.max(0, attackCooldown);

    const skillState = advanceAutoSkill(current.skill, definition.autoSkill.trigger, delta, justAttacked, false);
    if (skillState.triggered) {
      const context: CombatEffectContext = { self: current, selfDefinition: definition, enemyTargetPool, allySupportPool, random };
      const applied = applyCombatEffectResult(board, routes, resolveEffect(HERO_EFFECT_REGISTRY, definition.autoSkill.effectId, context), current.instanceId);
      board = applied.board; routes = applied.routes;
    }
    if (justAttacked) {
      // MVP simplification: TraitDefinition (types.ts) carries no discrete trigger
      // field of its own -- resolving it alongside a landed Basic Attack gives it a
      // bounded, non-every-tick cadence without inventing new state. A dedicated
      // Trait trigger model is a reasonable follow-up once real content-balancing
      // starts (see talents.ts's similar scope note).
      const traitContext: CombatEffectContext = { self: board.cells[cellKey] ?? current, selfDefinition: definition, enemyTargetPool, allySupportPool, random };
      const applied = applyCombatEffectResult(board, routes, resolveEffect(HERO_EFFECT_REGISTRY, definition.trait.effectId, traitContext), current.instanceId);
      board = applied.board; routes = applied.routes;
    }

    const afterEffects = board.cells[cellKey];
    if (afterEffects) board = { cells: { ...board.cells, [cellKey]: { ...afterEffects, attackCooldownRemainingSeconds: attackCooldown, skill: skillState.state } } };
  });

  // 8. Cleanup -- remove dead enemies, drop expired buffs/debuffs.
  const now = Date.now();
  routes = routes.map((route) => ({ ...route, enemies: route.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => ({ ...enemy, debuffs: removeExpiredStatusEffects(enemy.debuffs, now) })) }));
  board = { cells: Object.fromEntries(Object.entries(board.cells).map(([key, hero]) => [key, hero ? { ...hero, buffs: removeExpiredStatusEffects(hero.buffs, now) } : hero])) as BoardState["cells"] };

  // 9. Leader Burst firing -- buff/shield kind fires the instant it's ready;
  // attack-skill kind waits for the first enemy of the Wave to actually spawn
  // (三十三: buff/shield at Combat Start, attack-skill on first-batch-arrival).
  if (isBurstReadyToFire(leader) && (leader.burst.kind === "buffShield" || waveRuntime.spawnedCount > 0)) {
    const allyPool = allOccupiedCells(board).map(({ hero }) => ({ instanceId: hero.instanceId, hp: hero.hp, maxHp: hero.maxHp }));
    const globalContext: GlobalEffectContext = { allyPool, enemyPool: routes.flatMap((route) => route.enemies), random };
    const applied = applyCombatEffectResult(board, routes, LEADER_BURST_REGISTRY[leader.burst.effectId]?.(globalContext) ?? {}, `leader-${leader.heroId}`);
    board = applied.board; routes = applied.routes;
    leader = consumeBurst(leader);
  }

  waveRuntime = { ...waveRuntime, routes };
  const next: RunState = { ...run, board, castle, leader, waveRuntime };

  // 10. Failure takes priority over a same-tick clear.
  if (isRunFailure(castle)) return { ...next, phase: "RUN_LOSE", message: "城堡崩塌了……調整陣容，再試一次！" };

  const waveFullySpawned = waveRuntime.spawnedCount >= waveRuntime.spawnQueue.length;
  const noEnemiesLeft = routes.every((route) => route.enemies.length === 0);
  if (waveFullySpawned && noEnemiesLeft) return resolveWaveEnd({ ...next, phase: "COMBAT_END", message: "戰場安靜下來。" });

  return next;
}

// ---------------------------------------------------------------------------
// Wave clear -> Reward -> next Wave / Run end
// ---------------------------------------------------------------------------

/** Hero recovery between Waves (十八): survivors restore a % of lost HP, downed
 * heroes revive at a % of max HP -- both reset to full Shield/no Buffs. Auto
 * Skill progress/cooldown is also reset here (十四: "不要把 3/4 Attack Counter
 * 剩餘 0.4 秒 CD 帶去下一 Wave -- 每個 Wave 開始重新計算"), via the same
 * resetSkillRuntime() createHeroInstance() itself uses for a fresh summon.
 * `recoveryPctBonus` (聖光凝露 etc) adds onto both recovery percentages, each
 * still capped at 100% of the relevant baseline (can't overheal past full/
 * can't revive above max). */
function recoverHeroesBetweenWaves(run: RunState): BoardState {
  const { heroRecovery } = RUN_ENGINE_CONFIG;
  const recoveryBonus = getEquipmentRecoveryPctBonus(run.equipment);
  const cells = Object.fromEntries(Object.entries(run.board.cells).map(([key, hero]) => {
    if (!hero) return [key, hero];
    const definition = getHeroDefinition(run, hero.heroId);
    const skill = definition ? resetSkillRuntime(hero.instanceId, definition.autoSkill.trigger) : hero.skill;
    if (hero.status === "downed") {
      const hp = Math.round(hero.maxHp * Math.min(1, heroRecovery.downedReviveMaxHpPct + recoveryBonus));
      return [key, { ...hero, hp, status: "active" as const, shield: 0, buffs: [], skill, attackCooldownRemainingSeconds: 0 }];
    }
    const lost = hero.maxHp - hero.hp;
    const hp = Math.min(hero.maxHp, hero.hp + Math.round(lost * Math.min(1, heroRecovery.survivorLostHpRestorePct + recoveryBonus)));
    return [key, { ...hero, hp, shield: 0, buffs: [], skill, attackCooldownRemainingSeconds: 0 }];
  }));
  return { cells: cells as BoardState["cells"] };
}

/** Wave numbers that offer a Talent choice: every talentWaveInterval-th Wave clear. */
function isTalentWave(waveNumber: number): boolean {
  return waveNumber % RUN_ENGINE_CONFIG.talentWaveInterval === 0;
}

/** Wave numbers that offer a Core Blessing choice: every blessingWaveInterval-th
 * Wave clear. */
function isBlessingWave(waveNumber: number): boolean {
  return waveNumber % RUN_ENGINE_CONFIG.blessingWaveInterval === 0;
}

/** COMBAT_END -> REWARD_RESOLVE. */
export function resolveWaveEnd(run: RunState): RunState {
  if (run.phase !== "COMBAT_END") return run;
  const board = recoverHeroesBetweenWaves(run);
  const talentChoices = isTalentWave(run.wave) ? generateTalentChoices(TALENT_POOL, run.talents, run.selectedHeroes, run.leader.heroId) : [];
  const blessingChoices = isBlessingWave(run.wave) ? generateBlessingChoices(BLESSING_POOL, run.blessings, run.selectedHeroes, run.leader.heroId) : [];
  return { ...run, phase: "REWARD_RESOLVE", board, talentChoices, blessingChoices, message: "戰場安靜下來。選擇一項強化。" };
}

export function chooseTalentReward(run: RunState, talentId: string): RunState {
  if (run.phase !== "REWARD_RESOLVE") return run;
  if (!run.talentChoices.some((definition) => definition.id === talentId)) return run;
  return { ...run, talents: applyTalentChoice(run.talents, talentId), talentChoices: [], message: "強化已生效。" };
}

export function chooseBlessingReward(run: RunState, blessingId: string): RunState {
  if (run.phase !== "REWARD_RESOLVE") return run;
  if (!run.blessingChoices.some((definition) => definition.id === blessingId)) return run;
  return { ...run, blessings: applyBlessingChoice(run.blessings, blessingId), blessingChoices: [] };
}

/** REWARD_RESOLVE -> next WAVE_PREVIEW, or RUN_WIN once every defined Wave is
 * cleared. Only advances once both offer lists are empty/resolved so a reward
 * can never be silently skipped. */
export function advanceToNextWave(run: RunState): RunState {
  if (run.phase !== "REWARD_RESOLVE" || run.talentChoices.length || run.blessingChoices.length) return run;
  if (run.wave >= WAVES_BY_CHAPTER[run.chapterId].length) {
    return { ...run, phase: "RUN_WIN", message: "遠征勝利！" };
  }
  const nextWave = run.wave + 1;
  const maxRerolls = RUN_ENGINE_CONFIG.diceRerollsPerWave + getEquipmentExtraRerolls(run.equipment);
  return {
    ...run,
    phase: "WAVE_PREVIEW",
    wave: nextWave,
    waveRuntime: undefined,
    dice: { ...run.dice, rerollsLeft: maxRerolls, maxRerolls },
    reposition: { ...run.reposition, usedThisWave: run.reposition.carriesOverBetweenWaves ? run.reposition.usedThisWave : 0, extraPurchasesThisWave: 0 },
    message: `第 ${nextWave} 波即將到來。`,
  };
}

export function isRunOver(run: RunState): boolean {
  return run.phase === "RUN_WIN" || run.phase === "RUN_LOSE";
}

export type { BoardCell, BoardState, CastleState, EnemyInstance };
