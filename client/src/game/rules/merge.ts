import { HEROES } from "../config";
import type { HeroId, HeroInstance, HeroTier } from "../types";

let heroSequence = 0;

export function createHero(heroId: HeroId, tier: HeroTier = 1): HeroInstance {
  const definition = HEROES[heroId];
  const tierMultiplier = 1 + (tier - 1) * 0.72;
  const maxHp = Math.round(definition.maxHp * tierMultiplier);
  heroSequence += 1;
  return { id: `${heroId}-${heroSequence}`, heroId, tier, hp: maxHp, maxHp, cooldown: 0, attackCount: 0, shield: 0, speedBuff: 0, attackBuff: 0 };
}

export function firstEmptySlot(board: Array<HeroInstance | null>): number {
  return board.findIndex((hero) => hero === null);
}

export function summonOnBoard(board: Array<HeroInstance | null>, hero: HeroInstance): { board: Array<HeroInstance | null>; recycled: boolean } {
  const slot = firstEmptySlot(board);
  if (slot < 0) return { board, recycled: true };
  const nextBoard = [...board];
  nextBoard[slot] = hero;
  return { board: nextBoard, recycled: false };
}

export function getMergeCandidates(board: Array<HeroInstance | null>, targetIndex: number): number[] {
  const target = board[targetIndex];
  if (!target || target.tier === 3) return [];
  const matching = board.flatMap((hero, index) => (hero && hero.heroId === target.heroId && hero.tier === target.tier ? [index] : []));
  return matching.length >= 3 ? matching : [];
}

export function canMergeSelection(board: Array<HeroInstance | null>, indexes: number[]): boolean {
  if (indexes.length !== 3 || new Set(indexes).size !== 3) return false;
  const heroes = indexes.map((index) => board[index]);
  if (heroes.some((hero) => !hero)) return false;
  const [first] = heroes as HeroInstance[];
  return first.tier < 3 && heroes.every((hero) => hero?.heroId === first.heroId && hero.tier === first.tier);
}

export function mergeHeroes(board: Array<HeroInstance | null>, indexes: number[], targetIndex: number): Array<HeroInstance | null> {
  if (!canMergeSelection(board, indexes) || !indexes.includes(targetIndex)) return board;
  const target = board[targetIndex] as HeroInstance;
  const nextBoard = [...board];
  indexes.forEach((index) => { nextBoard[index] = null; });
  nextBoard[targetIndex] = createHero(target.heroId, (target.tier + 1) as HeroTier);
  return nextBoard;
}

export function removeFirstTierOne(board: Array<HeroInstance | null>): Array<HeroInstance | null> {
  const index = board.findIndex((hero) => hero?.tier === 1);
  if (index < 0) return board;
  const next = [...board];
  next[index] = null;
  return next;
}

