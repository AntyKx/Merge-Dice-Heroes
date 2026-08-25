/**
 * Merge rules (Phase 3), adapted from the existing game/rules/merge.ts to the new
 * BoardState/HeroInstance shapes. Tier logic itself is unchanged and already matched
 * 玩法核心.txt exactly: T1+T1+T1 -> T2, T2+T2+T2 -> T3, T3 is MAX (never T4).
 *
 * FULL_HOUSE's "2-of-a-kind merge" (二十七) is now a base dice-combo effect rather
 * than talent-gated, so resolveMerge() takes an explicit requiredCount (2 or 3)
 * instead of assuming 3.
 *
 * Building the upgraded HeroInstance's stats needs HeroDefinition data, which
 * belongs to Phase 6 (Hero Auto Combat) -- resolveMerge() takes a `buildUpgraded`
 * callback so this module stays fully hero-agnostic and testable today.
 */
import type { BoardState, HeroInstance, HeroTier } from "../types";
import { boardCellKey } from "../types";

type CellKey = ReturnType<typeof boardCellKey>;

export function getCell(board: BoardState, cellKey: CellKey): HeroInstance | undefined {
  return board.cells[cellKey];
}

/** All board cell keys holding a hero that matches `target`'s heroId+tier (used to
 * highlight valid merge candidates for a selection UI). */
export function getMergeCandidates(board: BoardState, targetCellKey: CellKey): CellKey[] {
  const target = board.cells[targetCellKey];
  if (!target || target.tier === 3) return [];
  return (Object.keys(board.cells) as CellKey[]).filter((key) => {
    const hero = board.cells[key];
    return hero && hero.heroId === target.heroId && hero.tier === target.tier;
  });
}

export function canMerge(board: BoardState, cellKeys: CellKey[], requiredCount: 2 | 3 = 3): boolean {
  if (cellKeys.length !== requiredCount || new Set(cellKeys).size !== requiredCount) return false;
  const heroes = cellKeys.map((key) => board.cells[key]);
  if (heroes.some((hero) => !hero)) return false;
  const [first] = heroes as HeroInstance[];
  if (first.tier === 3) return false;
  return heroes.every((hero) => hero?.heroId === first.heroId && hero.tier === first.tier);
}

export function resolveMerge(
  board: BoardState,
  cellKeys: CellKey[],
  targetCellKey: CellKey,
  buildUpgraded: (source: HeroInstance, nextTier: HeroTier) => HeroInstance,
  requiredCount: 2 | 3 = 3,
): BoardState {
  if (!canMerge(board, cellKeys, requiredCount) || !cellKeys.includes(targetCellKey)) return board;
  const source = board.cells[targetCellKey] as HeroInstance;
  const nextTier = (source.tier + 1) as HeroTier;
  const cells = { ...board.cells };
  cellKeys.forEach((key) => { delete cells[key]; });
  cells[targetCellKey] = buildUpgraded(source, nextTier);
  return { cells };
}
