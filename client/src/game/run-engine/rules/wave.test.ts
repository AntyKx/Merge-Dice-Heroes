import { describe, expect, it } from "vitest";
import type { EnemyDefinition, EnemyInstance, RouteState, SpawnBatch, WaveRuntimeState } from "../types";
import { createEnemyInstance, flattenSpawnSchedule, getDueSpawns, partitionReachedCastle, updateEnemyMovement } from "./wave";

describe("flattenSpawnSchedule", () => {
  it("依 delaySeconds + gapSeconds 排序整個 Wave 的出怪時間", () => {
    const batches: SpawnBatch[] = [
      { delaySeconds: 5, entries: [{ enemyId: "wolf", gapSeconds: 0, routes: [1] }] },
      { delaySeconds: 0, entries: [{ enemyId: "slime", gapSeconds: 0, routes: [1] }, { enemyId: "slime", gapSeconds: 0.5, routes: [2] }] },
    ];
    const schedule = flattenSpawnSchedule(batches);
    expect(schedule.map((entry) => entry.dueAtSeconds)).toEqual([0, 0.5, 5]);
    expect(schedule[0].enemyId).toBe("slime");
    expect(schedule[2].enemyId).toBe("wolf");
  });
});

describe("getDueSpawns", () => {
  const queue = flattenSpawnSchedule([{ delaySeconds: 0, entries: [{ enemyId: "a", gapSeconds: 0, routes: [1] }, { enemyId: "b", gapSeconds: 1, routes: [1] }, { enemyId: "c", gapSeconds: 2, routes: [1] }] }]);

  it("只回傳目前時間已到期、尚未出過的怪", () => {
    const runtime: WaveRuntimeState = { waveNumber: 1, routes: [], spawnQueue: queue, spawnedCount: 0, elapsedSeconds: 1.2 };
    const { dueSpawns, nextSpawnedCount } = getDueSpawns(runtime);
    expect(dueSpawns.map((entry) => entry.enemyId)).toEqual(["a", "b"]);
    expect(nextSpawnedCount).toBe(2);
  });

  it("cursor 之前的不會重複回傳", () => {
    const runtime: WaveRuntimeState = { waveNumber: 1, routes: [], spawnQueue: queue, spawnedCount: 2, elapsedSeconds: 5 };
    const { dueSpawns, nextSpawnedCount } = getDueSpawns(runtime);
    expect(dueSpawns.map((entry) => entry.enemyId)).toEqual(["c"]);
    expect(nextSpawnedCount).toBe(3);
  });
});

describe("createEnemyInstance", () => {
  it("寬體敵人以單一 Instance 佔據多條 Route", () => {
    const definition: EnemyDefinition = { id: "eliteGiant", width: 2, blockCost: 1, castleDamage: 3, siege: false, tags: ["elite"], baseHp: 320, baseAttack: 15, attackIntervalSeconds: 1.45, speed: 0.02 };
    const enemy = createEnemyInstance(definition, [2, 3], "e-1");
    expect(enemy.occupiedRoutes).toEqual([2, 3]);
    expect(enemy.hp).toBe(320);
  });
});

describe("updateEnemyMovement", () => {
  function makeEnemy(instanceId: string, pathProgress: number): EnemyInstance {
    return { instanceId, defId: "slime", hp: 10, maxHp: 10, occupiedRoutes: [1], pathProgress, debuffs: [] };
  }

  it("未被阻擋的敵人依速度前進", () => {
    const route: RouteState = { routeId: 1, active: true, enemies: [makeEnemy("e1", 0.5)] };
    const next = updateEnemyMovement(route, 2, new Set(), () => 0.1);
    expect(next.enemies[0].pathProgress).toBeCloseTo(0.7);
  });

  it("被阻擋的敵人停止前進", () => {
    const route: RouteState = { routeId: 1, active: true, enemies: [makeEnemy("e1", 0.5)] };
    const next = updateEnemyMovement(route, 2, new Set(["e1"]), () => 0.1);
    expect(next.enemies[0].pathProgress).toBe(0.5);
  });

  it("未啟用的 Route 不移動任何敵人", () => {
    const route: RouteState = { routeId: 1, active: false, enemies: [makeEnemy("e1", 0.5)] };
    const next = updateEnemyMovement(route, 2, new Set(), () => 0.1);
    expect(next).toBe(route);
  });
});

describe("partitionReachedCastle", () => {
  function makeEnemy(instanceId: string, pathProgress: number): EnemyInstance {
    return { instanceId, defId: "slime", hp: 10, maxHp: 10, occupiedRoutes: [1], pathProgress, debuffs: [] };
  }

  it("抵達終點的敵人被移出 Route，且永遠不會出現在棋盤（無 cell 概念）", () => {
    const route: RouteState = { routeId: 1, active: true, enemies: [makeEnemy("reached", 1.05), makeEnemy("onroute", 0.6)] };
    const { reached, remaining } = partitionReachedCastle(route);
    expect(reached.map((enemy) => enemy.instanceId)).toEqual(["reached"]);
    expect(remaining.enemies.map((enemy) => enemy.instanceId)).toEqual(["onroute"]);
  });

  it("沒有敵人抵達時原樣回傳", () => {
    const route: RouteState = { routeId: 1, active: true, enemies: [makeEnemy("onroute", 0.6)] };
    const result = partitionReachedCastle(route);
    expect(result.reached).toEqual([]);
    expect(result.remaining).toBe(route);
  });
});
