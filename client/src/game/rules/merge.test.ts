import { describe, expect, it } from "vitest";
import { canMergeSelection, createHero, mergeHeroes, summonOnBoard } from "./merge";

describe("merge rules", () => {
  it("將三名 T1 合成 T2", () => {
    const board = [createHero("knight"), createHero("knight"), createHero("knight"), ...Array(13).fill(null)];
    const merged = mergeHeroes(board, [0, 1, 2], 1);
    expect(merged[1]?.tier).toBe(2);
    expect(merged.filter(Boolean)).toHaveLength(1);
  });

  it("將三名 T2 合成 T3", () => {
    const board = [createHero("archer", 2), createHero("archer", 2), createHero("archer", 2), ...Array(13).fill(null)];
    expect(mergeHeroes(board, [0, 1, 2], 0)[0]?.tier).toBe(3);
  });

  it("不允許不同職業或階級合成", () => {
    const board = [createHero("knight"), createHero("archer"), createHero("knight", 2), ...Array(13).fill(null)];
    expect(canMergeSelection(board, [0, 1, 2])).toBe(false);
  });

  it("棋盤滿時不吞掉召喚結果", () => {
    const board = Array.from({ length: 16 }, () => createHero("priest"));
    expect(summonOnBoard(board, createHero("priest")).recycled).toBe(true);
  });
});

