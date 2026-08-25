import { describe, expect, it } from "vitest";
import type { BoardState, HeroInstance, HeroTier } from "../types";
import { boardCellKey } from "../types";
import { canMerge, getCell, getMergeCandidates, resolveMerge } from "./merge";

function makeHero(heroId: string, tier: HeroTier, instanceId = `${heroId}-${tier}-${Math.random()}`): HeroInstance {
  return {
    instanceId,
    heroId: heroId as HeroInstance["heroId"],
    tier,
    hp: 100,
    maxHp: 100,
    cell: null,
    status: "active",
    buffs: [],
    skill: { attackCountSinceWaveStart: 0, cooldownRemainingSeconds: 0, initialOffsetSeconds: 0 },
  };
}

const A = boardCellKey({ zone: 1, row: "front" });
const B = boardCellKey({ zone: 2, row: "front" });
const C = boardCellKey({ zone: 3, row: "front" });

function boardWith(entries: Record<string, HeroInstance>): BoardState {
  return { cells: entries };
}

const buildUpgraded = (source: HeroInstance, nextTier: HeroTier): HeroInstance => ({ ...source, tier: nextTier, hp: 100 * nextTier, maxHp: 100 * nextTier });

describe("canMerge / resolveMerge", () => {
  it("T1 x3 同英雄同階 -> T2", () => {
    const board = boardWith({ [A]: makeHero("knight", 1), [B]: makeHero("knight", 1), [C]: makeHero("knight", 1) });
    expect(canMerge(board, [A, B, C])).toBe(true);
    const merged = resolveMerge(board, [A, B, C], A, buildUpgraded);
    expect(getCell(merged, A)?.tier).toBe(2);
    expect(getCell(merged, B)).toBeUndefined();
    expect(getCell(merged, C)).toBeUndefined();
  });

  it("T2 x3 -> T3", () => {
    const board = boardWith({ [A]: makeHero("knight", 2), [B]: makeHero("knight", 2), [C]: makeHero("knight", 2) });
    const merged = resolveMerge(board, [A, B, C], A, buildUpgraded);
    expect(getCell(merged, A)?.tier).toBe(3);
  });

  it("T3 無法再升級", () => {
    const board = boardWith({ [A]: makeHero("knight", 3), [B]: makeHero("knight", 3), [C]: makeHero("knight", 3) });
    expect(canMerge(board, [A, B, C])).toBe(false);
    expect(resolveMerge(board, [A, B, C], A, buildUpgraded)).toBe(board);
  });

  it("不同英雄不能合成", () => {
    const board = boardWith({ [A]: makeHero("knight", 1), [B]: makeHero("fireMage", 1), [C]: makeHero("knight", 1) });
    expect(canMerge(board, [A, B, C])).toBe(false);
  });

  it("Full House：2 個同英雄同階即可合成", () => {
    const board = boardWith({ [A]: makeHero("knight", 1), [B]: makeHero("knight", 1) });
    expect(canMerge(board, [A, B], 2)).toBe(true);
    expect(canMerge(board, [A, B], 3)).toBe(false);
    const merged = resolveMerge(board, [A, B], A, buildUpgraded, 2);
    expect(getCell(merged, A)?.tier).toBe(2);
    expect(getCell(merged, B)).toBeUndefined();
  });

  it("getMergeCandidates 找出所有同英雄同階格子", () => {
    const board = boardWith({ [A]: makeHero("knight", 1), [B]: makeHero("knight", 1), [C]: makeHero("fireMage", 1) });
    expect(getMergeCandidates(board, A).sort()).toEqual([A, B].sort());
  });
});
