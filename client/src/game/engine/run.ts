import { DICE_COMBINATIONS, HEROES, TALENTS, WAVES } from "../config";
import { makeCombatState, getRunModifiers } from "./combat";
import { evaluateDice, randomDie, rollUnlockedDice, toggleDiceLock } from "../rules/dice";
import { createHero, firstEmptySlot, getMergeCandidates, mergeHeroes, summonOnBoard } from "../rules/merge";
import type { DiceCombinationKind, HeroId, HeroInstance, RunState, TalentDefinition } from "../types";

const emptyBoard = () => Array<HeroInstance | null>(16).fill(null);

function generateDice(random: () => number) { return Array.from({ length: 5 }, () => randomDie(random)); }

export function createRun(selectedHeroes: HeroId[], leaderId: HeroId, random: () => number = Math.random): RunState {
  return {
    phase: "SELECTING_DICE",
    wave: 1,
    selectedHeroes,
    leaderId,
    board: emptyBoard(),
    dice: { values: generateDice(random), locked: [false, false, false, false, false], rerollsLeft: 2, maxRerolls: 2, noComboStreak: 0, isRolling: false },
    summonEnergy: 1,
    recycleEnergy: 0,
    activeTalents: [],
    combat: makeCombatState(1),
    pendingHeroChoice: false,
    pendingFreeMerge: false,
    usedTwoMerge: false,
    talentChoices: [],
    message: "第一幕開演。保留想要的骰子，或直接結算。",
    runId: Date.now(),
  };
}

function summon(run: RunState, heroId: HeroId): RunState {
  if (run.combat.lockedTile !== undefined && firstEmptySlot(run.board) === run.combat.lockedTile) {
    return { ...run, recycleEnergy: run.recycleEnergy + 1, message: "命運震封了這個座位，獲得 1 點重整能量。" };
  }
  const result = summonOnBoard(run.board, createHero(heroId));
  return result.recycled
    ? { ...run, recycleEnergy: run.recycleEnergy + 1, message: "棋盤已滿，召喚轉為 1 點重整能量。" }
    : { ...run, board: result.board, message: `${HEROES[heroId].name} 加入舞台！` };
}

function summonRandom(run: RunState, random: () => number): RunState {
  return summon(run, run.selectedHeroes[Math.floor(random() * run.selectedHeroes.length)]);
}

function applyLeaderSkill(run: RunState): RunState {
  const board = run.board.map((hero) => hero ? { ...hero } : null);
  const combat = { ...run.combat, enemies: run.combat.enemies.map((enemy) => ({ ...enemy })), damageEvents: [] };
  if (run.leaderId === "knight") {
    board.forEach((hero) => { if (hero) hero.shield += 35; });
    return { ...run, board, combat, message: "隊長技：鋼壁連結！全體獲得護盾。" };
  }
  if (run.leaderId === "fireMage") {
    combat.enemies.forEach((enemy) => { enemy.hp -= 95; });
    return { ...run, combat, message: "隊長技：隕火墜落！" };
  }
  if (run.leaderId === "archer") {
    const targets = [...combat.enemies].sort((a, b) => b.pathProgress - a.pathProgress).slice(0, 3);
    targets.forEach((enemy) => { enemy.hp -= 78; });
    return { ...run, combat, message: "隊長技：翠羽齊射！" };
  }
  if (run.leaderId === "ranger") {
    [...combat.enemies].sort((a, b) => b.pathProgress - a.pathProgress).slice(0, 2).forEach((enemy) => { enemy.hp -= 118; });
    return { ...run, combat, message: "隊長技：林影獵殺！" };
  }
  if (run.leaderId === "engineer") {
    combat.enemies.forEach((enemy) => { enemy.hp -= 58; });
    return { ...run, combat, message: "隊長技：齒輪超載！" };
  }
  if (run.leaderId === "deathKnight") {
    board.forEach((hero) => { if (hero) hero.shield += 24; });
    [...combat.enemies].sort((a, b) => b.pathProgress - a.pathProgress).slice(0, 2).forEach((enemy) => { enemy.hp -= 66; });
    return { ...run, board, combat, message: "隊長技：冥衛誓約！前線受創並獲得護盾。" };
  }
  if (run.leaderId === "bard") {
    board.forEach((hero) => { if (hero) { hero.hp = Math.min(hero.maxHp, hero.hp + 25); hero.speedBuff = Math.max(hero.speedBuff, 0.26); } });
    return { ...run, board, combat, message: "隊長技：潮音合鳴！全隊治療並加速。" };
  }
  if (run.leaderId === "fighter") {
    [...combat.enemies].sort((a, b) => b.pathProgress - a.pathProgress).slice(0, 3).forEach((enemy) => { enemy.hp -= 92; });
    return { ...run, combat, message: "隊長技：裂地重拳！" };
  }
  if (run.leaderId === "frostQueen") {
    combat.enemies.forEach((enemy) => { enemy.hp -= 76; });
    return { ...run, combat, message: "隊長技：霜華領域！" };
  }
  if (run.leaderId === "assassin") {
    const target = [...combat.enemies].sort((a, b) => b.pathProgress - a.pathProgress)[0];
    if (target) target.hp -= 185;
    return { ...run, combat, message: "隊長技：夜幕處決！" };
  }
  board.forEach((hero) => { if (hero) { hero.hp = Math.min(hero.maxHp, hero.hp + 42); hero.speedBuff = Math.max(hero.speedBuff, 0.28); } });
  return { ...run, board, combat, message: "隊長技：晨曦祝禱！全隊治療並加速。" };
}

function applyUltimate(run: RunState): RunState {
  const combat = { ...run.combat, enemies: run.combat.enemies.map((enemy) => ({ ...enemy, hp: enemy.hp - 188 })), damageEvents: [] };
  return { ...run, combat, message: "必殺：命運的劇幕落下！全場敵人遭受重創。" };
}

export function beginReroll(run: RunState): RunState {
  if (run.phase !== "SELECTING_DICE" || run.dice.rerollsLeft <= 0 || run.dice.isRolling) return run;
  return { ...run, phase: "ROLLING", dice: { ...run.dice, isRolling: true }, message: "骰子正在翻滾……" };
}

export function finishReroll(run: RunState, random: () => number = Math.random): RunState {
  if (run.phase !== "ROLLING") return run;
  const modifiers = getRunModifiers(run);
  const used = run.dice.maxRerolls - run.dice.rerollsLeft;
  const shouldSpend = !(modifiers.freeFirstReroll && used === 0);
  const safetyThreshold = run.activeTalents.some((talent) => talent.id === "pair-safety") ? 1 : 2;
  const dice = rollUnlockedDice({ ...run.dice, rerollsLeft: run.dice.rerollsLeft - (shouldSpend ? 1 : 0), isRolling: false }, random, run.dice.noComboStreak >= safetyThreshold);
  return { ...run, phase: "SELECTING_DICE", dice, message: shouldSpend ? "重骰完成。鎖住好運，或立即結算。" : "免費重骰完成！" };
}

export function toggleLock(run: RunState, index: number): RunState {
  if (run.phase !== "SELECTING_DICE") return run;
  return { ...run, dice: toggleDiceLock(run.dice, index) };
}

export function resolveDice(run: RunState, random: () => number = Math.random): RunState {
  if (run.phase !== "SELECTING_DICE") return run;
  const combination = evaluateDice(run.dice.values);
  const noComboStreak = combination.kind === "NONE" ? run.dice.noComboStreak + 1 : 0;
  const nextDice = { ...run.dice, noComboStreak, locked: [false, false, false, false, false] };
  let next: RunState = { ...run, phase: "MERGING", dice: nextDice, lastCombination: combination, message: `骰型成立：${combination.label}。${combination.description}` };
  const summonMany = (amount: number) => { for (let count = 0; count < amount; count += 1) next = summonRandom(next, random); };
  if (combination.kind === "NONE") next = { ...next, summonEnergy: next.summonEnergy + 1 };
  if (combination.kind === "PAIR") {
    summonMany(1);
    if (random() < getRunModifiers(next).pairExtraSummonChance) summonMany(1);
  }
  if (combination.kind === "TWO_PAIR") summonMany(2);
  if (combination.kind === "THREE_KIND") next = { ...next, pendingHeroChoice: true, message: "三條成立！選擇一位英雄加入棋盤。" };
  if (combination.kind === "SMALL_STRAIGHT") {
    next = { ...next, board: next.board.map((hero) => hero ? { ...hero, speedBuff: Math.max(hero.speedBuff, 0.2) } : null) };
    if (getRunModifiers(next).smallStraightSummon) summonMany(1);
  }
  if (combination.kind === "LARGE_STRAIGHT") next = { ...next, board: next.board.map((hero) => hero ? { ...hero, speedBuff: Math.max(hero.speedBuff, 0.15), attackBuff: Math.max(hero.attackBuff, 0.25) } : null) };
  if (combination.kind === "FULL_HOUSE") next = { ...next, pendingFreeMerge: true, message: "葫蘆成立！選擇三位同職英雄，免費升階。" };
  if (combination.kind === "FOUR_KIND") next = applyLeaderSkill(next);
  if (combination.kind === "FIVE_KIND") next = applyUltimate(next);
  const sixStacks = next.activeTalents.find((talent) => talent.id === "six-power")?.stacks ?? 0;
  if (sixStacks > 0) {
    const boost = next.dice.values.filter((value) => value === 6).length * sixStacks * 0.05;
    if (boost) next = { ...next, board: next.board.map((hero) => hero ? { ...hero, attackBuff: hero.attackBuff + boost } : null) };
  }
  return next;
}

export function chooseHeroSummon(run: RunState, heroId: HeroId): RunState {
  if (run.phase !== "MERGING" || !run.pendingHeroChoice || !run.selectedHeroes.includes(heroId)) return run;
  return { ...summon(run, heroId), pendingHeroChoice: false };
}

export function mergeBoardSelection(run: RunState, indexes: number[], targetIndex: number): RunState {
  if (run.phase !== "MERGING") return run;
  const candidateCount = getMergeCandidates(run.board, targetIndex).length;
  const canUseTwo = !run.usedTwoMerge && run.activeTalents.some((talent) => talent.id === "quick-start") && indexes.length === 2 && candidateCount >= 3;
  const merged = canUseTwo
    ? (() => {
      const first = run.board[targetIndex];
      if (!first) return run.board;
      const board = [...run.board];
      indexes.forEach((index) => { board[index] = null; });
      board[targetIndex] = createHero(first.heroId, (first.tier + 1) as 2 | 3);
      return board;
    })()
    : mergeHeroes(run.board, indexes, targetIndex);
  if (merged === run.board) return run;
  const newHero = merged[targetIndex];
  const modifiers = getRunModifiers(run);
  const board = merged.map((hero) => hero ? { ...hero } : null);
  if (newHero && modifiers.mergeShield) newHero.shield += modifiers.mergeShield;
  let next: RunState = { ...run, board, pendingFreeMerge: false, usedTwoMerge: run.usedTwoMerge || canUseTwo, message: `升階成功！${HEROES[newHero!.heroId].name} 成為 T${newHero!.tier}。` };
  if (newHero?.tier === 2 && modifiers.mergeDamage) next = { ...next, combat: { ...next.combat, enemies: next.combat.enemies.map((enemy) => ({ ...enemy, hp: enemy.hp - modifiers.mergeDamage })) } };
  if (newHero?.tier === 3 && next.activeTalents.some((talent) => talent.id === "third-act")) next = summonRandom(next, Math.random);
  return next;
}

export function spendSummonEnergy(run: RunState, random: () => number = Math.random): RunState {
  if (run.phase !== "MERGING" || run.summonEnergy < 1) return run;
  return { ...summonRandom(run, random), summonEnergy: run.summonEnergy - 1 };
}

export function recycleTierOne(run: RunState): RunState {
  if (run.phase !== "MERGING" || run.recycleEnergy < 3) return run;
  const index = run.board.findIndex((hero) => hero?.tier === 1);
  if (index < 0) return { ...run, message: "目前沒有可重整的 T1 英雄。" };
  const board = [...run.board];
  board[index] = null;
  return { ...run, board, recycleEnergy: run.recycleEnergy - 3, message: "重整完成，騰出一格舞台座位。" };
}

export function startCombat(run: RunState): RunState {
  if (run.phase !== "MERGING" || run.pendingHeroChoice || run.pendingFreeMerge) return run;
  return { ...run, phase: "COMBAT", message: `第 ${run.wave} 波開戰！英雄開始自動迎敵。` };
}

export function chooseTalent(run: RunState, talentId: string): RunState {
  if (run.phase !== "REWARD") return run;
  const choice = run.talentChoices.find((talent) => talent.id === talentId);
  if (!choice) return run;
  const current = run.activeTalents.find((talent) => talent.id === talentId);
  if (current && current.stacks >= choice.maxStacks) return { ...run, message: "這項天賦已經達到層數上限。" };
  const activeTalents = current ? run.activeTalents.map((talent) => talent.id === talentId ? { ...talent, stacks: talent.stacks + 1 } : talent) : [...run.activeTalents, { id: talentId, stacks: 1 }];
  return { ...run, activeTalents, phase: "WAVE_CLEAR", message: `獲得天賦：${choice.name}。` };
}

export function prepareTalents(run: RunState, random: () => number = Math.random): RunState {
  if (run.phase !== "REWARD") return run;
  const available = TALENTS.filter((talent) => (run.activeTalents.find((active) => active.id === talent.id)?.stacks ?? 0) < talent.maxStacks);
  const pool = [...available];
  const choices: TalentDefinition[] = [];
  while (choices.length < 3 && pool.length) choices.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return { ...run, talentChoices: choices };
}

export function nextWave(run: RunState, random: () => number = Math.random): RunState {
  if (run.phase !== "WAVE_CLEAR") return run;
  if (run.wave >= WAVES.length) return { ...run, phase: "VICTORY", message: "碎骰巨靈倒下了！你守住了整座劇場。" };
  const wave = run.wave + 1;
  const modifiers = getRunModifiers(run);
  return {
    ...run,
    phase: "SELECTING_DICE",
    wave,
    dice: { values: generateDice(random), locked: [false, false, false, false, false], rerollsLeft: 2 + modifiers.extraRerolls, maxRerolls: 2 + modifiers.extraRerolls, noComboStreak: run.dice.noComboStreak, isRolling: false },
    combat: { ...makeCombatState(wave), castleHp: run.combat.castleHp, castleMaxHp: run.combat.castleMaxHp },
    lastCombination: undefined,
    message: `第 ${wave} 波：${WAVES[wave - 1].title}。先用骰子布局。`,
  };
}

export function pauseRun(run: RunState): RunState {
  if (run.phase === "PAUSED") return { ...run, phase: run.phaseBeforePause ?? "SELECTING_DICE", phaseBeforePause: undefined };
  if (["VICTORY", "DEFEAT", "REWARD"].includes(run.phase)) return run;
  return { ...run, phaseBeforePause: run.phase, phase: "PAUSED" };
}

export function triggerDebugCombination(run: RunState, kind: DiceCombinationKind): RunState {
  const values: Record<DiceCombinationKind, number[]> = {
    NONE: [1, 2, 3, 5, 6], PAIR: [1, 1, 3, 4, 6], TWO_PAIR: [1, 1, 3, 3, 6], THREE_KIND: [2, 2, 2, 4, 6], SMALL_STRAIGHT: [1, 2, 3, 4, 6], LARGE_STRAIGHT: [1, 2, 3, 4, 5], FULL_HOUSE: [2, 2, 2, 5, 5], FOUR_KIND: [4, 4, 4, 4, 2], FIVE_KIND: [6, 6, 6, 6, 6],
  };
  return { ...run, phase: "SELECTING_DICE", dice: { ...run.dice, values: values[kind] }, lastCombination: DICE_COMBINATIONS[kind] };
}
