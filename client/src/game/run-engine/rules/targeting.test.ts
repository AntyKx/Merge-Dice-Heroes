import { describe, expect, it } from "vitest";
import type { BoardState, EnemyInstance, HeroInstance, RouteState } from "../types";
import { boardCellKey } from "../types";
import { getAttackCoverage, getEnemyTargetPool, getSupportTargets } from "./targeting";

function makeEnemy(instanceId: string, occupiedRoutes: EnemyInstance["occupiedRoutes"], pathProgress: number): EnemyInstance {
  return { instanceId, defId: "slime", hp: 10, maxHp: 10, occupiedRoutes, pathProgress };
}

function makeHero(instanceId: string): HeroInstance {
  return {
    instanceId,
    heroId: "priest",
    tier: 1,
    hp: 100,
    maxHp: 100,
    cell: null,
    status: "active",
    buffs: [],
    skill: { attackCountSinceWaveStart: 0, cooldownRemainingSeconds: 0, initialOffsetSeconds: 0 },
  };
}

describe("getAttackCoverage", () => {
  it("auraOnly 完全不覆蓋任何防區", () => {
    expect(getAttackCoverage({ zone: 2, row: "back" }, { kind: "auraOnly", maxZoneSpan: 4 })).toEqual([]);
  });
  it("ownZone 只覆蓋自己防區", () => {
    expect(getAttackCoverage({ zone: 2, row: "front" }, { kind: "ownZone", maxZoneSpan: 1 })).toEqual([2]);
  });
  it("rangedSelective 依 maxZoneSpan 覆蓋多個防區，但不是全域", () => {
    expect(getAttackCoverage({ zone: 2, row: "front" }, { kind: "rangedSelective", maxZoneSpan: 2 }).sort()).toEqual([1, 2, 3]);
  });
});

describe("getEnemyTargetPool", () => {
  const routes: RouteState[] = [
    { routeId: 1, active: true, enemies: [makeEnemy("e1", [1], 0.5)] },
    { routeId: 2, active: true, enemies: [makeEnemy("e2", [2, 3], 0.9)] },
    { routeId: 3, active: true, enemies: [] },
    { routeId: 4, active: false, enemies: [makeEnemy("e4", [4], 0.99)] },
  ];

  it("寬體 2 的敵人只要佔據的任一 Route 在覆蓋範圍內就可被鎖定", () => {
    const pool = getEnemyTargetPool({ zone: 3, row: "front" }, { kind: "ownZone", maxZoneSpan: 1 }, 1, routes);
    expect(pool.map((enemy) => enemy.instanceId)).toEqual(["e2"]);
  });

  it("超出 rangeAlongRoute 的敵人不會被鎖定", () => {
    const pool = getEnemyTargetPool({ zone: 1, row: "front" }, { kind: "ownZone", maxZoneSpan: 1 }, 0.2, routes);
    expect(pool).toEqual([]);
  });

  it("未啟用的 Route 不提供目標", () => {
    const pool = getEnemyTargetPool({ zone: 4, row: "front" }, { kind: "ownZone", maxZoneSpan: 1 }, 1, routes);
    expect(pool).toEqual([]);
  });

  it("auraOnly 英雄沒有任何敵方目標池", () => {
    const pool = getEnemyTargetPool({ zone: 2, row: "front" }, { kind: "auraOnly", maxZoneSpan: 4 }, 1, routes);
    expect(pool).toEqual([]);
  });
});

describe("getSupportTargets", () => {
  const board: BoardState = {
    cells: {
      [boardCellKey({ zone: 1, row: "front" })]: makeHero("self"),
      [boardCellKey({ zone: 2, row: "front" })]: makeHero("adjacent-zone"),
      [boardCellKey({ zone: 1, row: "midFront" })]: makeHero("adjacent-row"),
      [boardCellKey({ zone: 4, row: "back" })]: makeHero("far"),
    },
  };
  const self = { zone: 1 as const, row: "front" as const };

  it("adjacentCell 只涵蓋相鄰格，不含自己", () => {
    const targets = getSupportTargets(self, board, { kind: "adjacentCell" }).map((entry) => entry.hero.instanceId).sort();
    expect(targets).toEqual(["adjacent-row", "adjacent-zone"]);
  });

  it("sameRow 涵蓋同排任何防區", () => {
    const targets = getSupportTargets(self, board, { kind: "sameRow" }).map((entry) => entry.hero.instanceId);
    expect(targets).toEqual(["adjacent-zone"]);
  });

  it("auraAll 涵蓋全場（不含自己）", () => {
    const targets = getSupportTargets(self, board, { kind: "auraAll" }).map((entry) => entry.hero.instanceId).sort();
    expect(targets).toEqual(["adjacent-row", "adjacent-zone", "far"]);
  });
});
