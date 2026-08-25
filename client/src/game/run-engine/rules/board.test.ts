import { describe, expect, it } from "vitest";
import type { BoardState, EnemyInstance, HeroInstance } from "../types";
import { boardCellKey } from "../types";
import { adjacentZones, allOccupiedCells, cellsInRow, cellsInZone, zonesWithinSpan } from "./board";

function makeHero(instanceId: string): HeroInstance {
  return {
    instanceId,
    heroId: "knight",
    tier: 1,
    hp: 100,
    maxHp: 100,
    cell: null,
    status: "active",
    buffs: [],
    skill: { attackCountSinceWaveStart: 0, cooldownRemainingSeconds: 0, initialOffsetSeconds: 0 },
  };
}

describe("zone adjacency", () => {
  it("adjacentZones 只回傳相鄰一格", () => {
    expect(adjacentZones(1)).toEqual([2]);
    expect(adjacentZones(2).sort()).toEqual([1, 3]);
    expect(adjacentZones(4)).toEqual([3]);
  });

  it("zonesWithinSpan(zone,1) 只有自己", () => {
    expect(zonesWithinSpan(2, 1)).toEqual([2]);
  });

  it("zonesWithinSpan(zone,2) 含自己與相鄰", () => {
    expect(zonesWithinSpan(2, 2).sort()).toEqual([1, 2, 3]);
  });
});

describe("board queries", () => {
  const keyA = boardCellKey({ zone: 1, row: "front" });
  const keyB = boardCellKey({ zone: 1, row: "midFront" });
  const keyC = boardCellKey({ zone: 2, row: "front" });
  const board: BoardState = { cells: { [keyA]: makeHero("a"), [keyB]: makeHero("b"), [keyC]: makeHero("c") } };

  it("cellsInZone 只回傳該防區", () => {
    expect(cellsInZone(board, 1).map((entry) => entry.hero.instanceId).sort()).toEqual(["a", "b"]);
  });

  it("cellsInRow 只回傳該排", () => {
    expect(cellsInRow(board, "front").map((entry) => entry.hero.instanceId).sort()).toEqual(["a", "c"]);
  });

  it("allOccupiedCells 回傳全部三格", () => {
    expect(allOccupiedCells(board)).toHaveLength(3);
  });
});

describe("怪物永遠不會走進 4x4 棋盤 (compile-time guarantee)", () => {
  it("BoardState.cells 的型別只接受 HeroInstance，EnemyInstance 無法賦值", () => {
    const board: BoardState = { cells: {} };
    const key = boardCellKey({ zone: 1, row: "front" });
    const enemy: EnemyInstance = { instanceId: "e1", defId: "slime", hp: 10, maxHp: 10, occupiedRoutes: [1], pathProgress: 0 };
    // @ts-expect-error EnemyInstance is not a HeroInstance -- this MUST fail to typecheck.
    board.cells[key] = enemy;
    expect(true).toBe(true);
  });
});
