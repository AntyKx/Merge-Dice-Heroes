/**
 * Dice rules (Phase 3). Pure functions only -- no RunState mutation here.
 *
 * Core difference from the old game/rules/dice.ts: evaluateDice() there picked a
 * single "best" combo. Per 玩法核心.txt 二十八、多 Combo 選擇, the same final dice
 * hand can be eligible for several combos at once and the player picks which effect
 * to take -- getEligibleComboEffects() returns ALL of them, never just the highest.
 */
import type { DiceComboDefinition, DiceComboKind } from "../types";

function countFaces(values: number[]): number[] {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.values()).sort((a, b) => b - a);
}

function hasStraight(values: number[], length: 4 | 5): boolean {
  const unique = Array.from(new Set(values)).sort((a, b) => a - b);
  if (length === 5) {
    return unique.length === 5 && (unique.every((face, index) => face === index + 1) || unique.every((face, index) => face === index + 2));
  }
  return [1, 2, 3].some((start) => [start, start + 1, start + 2, start + 3].every((face) => unique.includes(face)));
}

/** All DiceComboKinds the given final 5-value hand qualifies for, highest-value
 * kind first. A hand always qualifies for at least NONE. */
export function evaluateDiceHand(values: number[]): DiceComboKind[] {
  if (values.length !== 5 || values.some((value) => value < 1 || value > 6)) {
    throw new Error("骰子必須由五個 1–6 的點數構成。");
  }
  const counts = countFaces(values);
  const kinds: DiceComboKind[] = [];
  if (counts[0] === 5) kinds.push("FIVE_KIND");
  if (counts[0] >= 4) kinds.push("FOUR_KIND");
  if (counts[0] === 3 && counts[1] === 2) kinds.push("FULL_HOUSE");
  if (hasStraight(values, 5)) kinds.push("LARGE_STRAIGHT");
  if (hasStraight(values, 4)) kinds.push("SMALL_STRAIGHT");
  if (counts[0] >= 3) kinds.push("THREE_KIND");
  // Deliberately exact (not >=): a Full House's (3,2) or a Four/Five Kind's top
  // count must NOT also read as Two Pair -- matches the worked examples in
  // 玩法核心.txt 二十八 ("2 2 2 5 5" is FULL_HOUSE/THREE_KIND/PAIR, never TWO_PAIR).
  if (counts[0] === 2 && counts[1] === 2) kinds.push("TWO_PAIR");
  if (counts[0] >= 2) kinds.push("PAIR");
  kinds.push("NONE");
  return kinds;
}

function comboEffectFor(kind: DiceComboKind): DiceComboDefinition["effect"] {
  switch (kind) {
    case "NONE": return { kind: "gainFateEnergy", amount: 1 };
    case "PAIR": return { kind: "summonRandom", count: 1 };
    case "TWO_PAIR": return { kind: "summonRandom", count: 2 };
    case "THREE_KIND": return { kind: "summonChosen", count: 1 };
    case "SMALL_STRAIGHT": return { kind: "combatBuff", attackSpeedPct: 0.15 };
    case "LARGE_STRAIGHT": return { kind: "combatBuff", attackSpeedPct: 0.2, damagePct: 0.1 };
    case "FULL_HOUSE": return { kind: "freeMergeWithTwo" };
    case "FOUR_KIND": return { kind: "leaderBurstReady" };
    case "FIVE_KIND": return { kind: "jackpotTierUp" };
  }
}

/** Every combo the final hand is eligible for, paired with its effect, in the same
 * highest-first order as evaluateDiceHand(). The caller (Preparation UI) lets the
 * player pick exactly one; nothing here decides "the" winner. */
export function getEligibleComboEffects(values: number[]): DiceComboDefinition[] {
  return evaluateDiceHand(values).map((kind) => ({ kind, effect: comboEffectFor(kind) }));
}

export function randomDie(random: () => number): number {
  return Math.max(1, Math.min(6, Math.floor(random() * 6) + 1));
}

/** Rerolls only the unlocked dice; locked values are untouched. There is no undo
 * primitive anywhere in this module -- per 二十六, once a reroll happens it cannot
 * be rolled back, so callers must not keep the pre-reroll values around as state. */
export function rerollUnlocked(values: number[], locked: boolean[], random: () => number): number[] {
  return values.map((value, index) => (locked[index] ? value : randomDie(random)));
}

export function toggleDiceLock(locked: boolean[], index: number): boolean[] {
  if (index < 0 || index >= locked.length) return locked;
  const next = [...locked];
  next[index] = !next[index];
  return next;
}
