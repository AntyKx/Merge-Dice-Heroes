import { DICE_COMBINATIONS } from "../config";
import type { DiceCombination, DiceState } from "../types";

const countFaces = (values: number[]) => {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.values()).sort((a, b) => b - a);
};

export function evaluateDice(values: number[]): DiceCombination {
  if (values.length !== 5 || values.some((value) => value < 1 || value > 6)) {
    throw new Error("骰子必須由五個 1–6 的點數構成。");
  }

  const counts = countFaces(values);
  const unique = Array.from(new Set(values)).sort((a, b) => a - b);
  const hasSmallStraight = [1, 2, 3, 4].some((start) => [start, start + 1, start + 2, start + 3].every((face) => unique.includes(face)));
  const hasLargeStraight = unique.length === 5 && (unique.every((face, index) => face === index + 1) || unique.every((face, index) => face === index + 2));

  if (counts[0] === 5) return DICE_COMBINATIONS.FIVE_KIND;
  if (counts[0] === 4) return DICE_COMBINATIONS.FOUR_KIND;
  if (counts[0] === 3 && counts[1] === 2) return DICE_COMBINATIONS.FULL_HOUSE;
  if (hasLargeStraight) return DICE_COMBINATIONS.LARGE_STRAIGHT;
  if (hasSmallStraight) return DICE_COMBINATIONS.SMALL_STRAIGHT;
  if (counts[0] === 3) return DICE_COMBINATIONS.THREE_KIND;
  if (counts[0] === 2 && counts[1] === 2) return DICE_COMBINATIONS.TWO_PAIR;
  if (counts[0] === 2) return DICE_COMBINATIONS.PAIR;
  return DICE_COMBINATIONS.NONE;
}

export function randomDie(random: () => number): number {
  return Math.max(1, Math.min(6, Math.floor(random() * 6) + 1));
}

export function rollUnlockedDice(dice: DiceState, random: () => number, guaranteePair: boolean): DiceState {
  const values = dice.values.map((value, index) => (dice.locked[index] ? value : randomDie(random)));
  if (guaranteePair && evaluateDice(values).kind === "NONE") {
    const firstUnlocked = dice.locked.findIndex((locked) => !locked);
    const secondUnlocked = dice.locked.findIndex((locked, index) => !locked && index !== firstUnlocked);
    if (firstUnlocked >= 0 && secondUnlocked >= 0) values[secondUnlocked] = values[firstUnlocked];
  }
  return { ...dice, values, isRolling: false };
}

export function toggleDiceLock(dice: DiceState, index: number): DiceState {
  if (dice.isRolling || index < 0 || index >= dice.locked.length) return dice;
  const locked = [...dice.locked];
  locked[index] = !locked[index];
  return { ...dice, locked };
}
