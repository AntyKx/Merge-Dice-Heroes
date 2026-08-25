import { describe, expect, it } from "vitest";
import type { BoardState, HeroInstance, PendingZoneState } from "../types";
import { boardCellKey } from "../types";
import { addToPending, emptyCellKeys, hasEmptyCell, isPendingResolved, movePendingToBoard, placeOnBoard, routeNewSummon } from "./pending";

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

function fullBoard(): BoardState {
  const cells: BoardState["cells"] = {};
  ([1, 2, 3, 4] as const).forEach((zone) => (["front", "midFront", "midBack", "back"] as const).forEach((row) => {
    cells[boardCellKey({ zone, row })] = makeHero(`${zone}-${row}`);
  }));
  return { cells };
}

const emptyBoard: BoardState = { cells: {} };
const CAPACITY = 2;

describe("board / pending routing", () => {
  it("棋盤有空位時直接選格，不消耗 Pending", () => {
    expect(hasEmptyCell(emptyBoard)).toBe(true);
    expect(emptyCellKeys(emptyBoard)).toHaveLength(16);
    expect(routeNewSummon(emptyBoard, { heroes: [] }, CAPACITY)).toBe("chooseBoardCell");
  });

  it("棋盤已滿、Pending 未滿 -> 進 Pending", () => {
    expect(routeNewSummon(fullBoard(), { heroes: [] }, CAPACITY)).toBe("addToPending");
  });

  it("棋盤已滿、Pending 已達上限 -> 阻擋，不可再召喚", () => {
    const pending: PendingZoneState = { heroes: [makeHero("p1"), makeHero("p2")] };
    expect(routeNewSummon(fullBoard(), pending, CAPACITY)).toBe("blockedPendingFull");
  });

  it("addToPending 在已達上限時不吞掉英雄", () => {
    const pending: PendingZoneState = { heroes: [makeHero("p1"), makeHero("p2")] };
    const next = addToPending(pending, makeHero("p3"), CAPACITY);
    expect(next.heroes).toHaveLength(2);
    expect(next).toBe(pending);
  });

  it("movePendingToBoard 從 Pending 移到棋盤空格", () => {
    const pending: PendingZoneState = { heroes: [makeHero("p1")] };
    const key = boardCellKey({ zone: 1, row: "front" });
    const { pending: nextPending, board } = movePendingToBoard(pending, emptyBoard, "p1", key);
    expect(isPendingResolved(nextPending)).toBe(true);
    expect(board.cells[key]?.instanceId).toBe("p1");
  });

  it("戰鬥開始前 Pending 必須清空", () => {
    expect(isPendingResolved({ heroes: [] })).toBe(true);
    expect(isPendingResolved({ heroes: [makeHero("p1")] })).toBe(false);
  });

  it("placeOnBoard 不覆蓋已佔用格子", () => {
    const key = boardCellKey({ zone: 1, row: "front" });
    const occupied: BoardState = { cells: { [key]: makeHero("existing") } };
    const result = placeOnBoard(occupied, key, makeHero("new"));
    expect(result).toBe(occupied);
  });
});
