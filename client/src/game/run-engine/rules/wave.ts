/**
 * Wave / Spawn / Route movement rules (Phase 5), per 玩法核心.txt 六、二十.
 *
 * Enemies live entirely in RouteState -- creating/moving/removing an EnemyInstance
 * here never touches BoardState (see board.ts's compile-time guarantee test).
 */
import type { EnemyDefinition, EnemyInstance, RouteState, ScheduledSpawn, SpawnBatch, WaveRuntimeState } from "../types";

/** Flattens a WaveDefinition's batches into one time-sorted spawn queue, computing
 * each entry's absolute due time as batch.delaySeconds + entry.gapSeconds. Called
 * once when a Wave starts. */
export function flattenSpawnSchedule(batches: SpawnBatch[]): ScheduledSpawn[] {
  const schedule: ScheduledSpawn[] = [];
  batches.forEach((batch) => {
    batch.entries.forEach((entry) => {
      schedule.push({ dueAtSeconds: batch.delaySeconds + entry.gapSeconds, enemyId: entry.enemyId, routes: entry.routes });
    });
  });
  return schedule.sort((a, b) => a.dueAtSeconds - b.dueAtSeconds);
}

/** Which queued spawns are now due, given the current elapsedSeconds. Advances the
 * cursor (spawnedCount) rather than mutating/shrinking the queue, so this stays a
 * pure, trivially-testable function of (queue, cursor, now). */
export function getDueSpawns(waveRuntime: WaveRuntimeState): { dueSpawns: ScheduledSpawn[]; nextSpawnedCount: number } {
  const dueSpawns: ScheduledSpawn[] = [];
  let cursor = waveRuntime.spawnedCount;
  while (cursor < waveRuntime.spawnQueue.length && waveRuntime.spawnQueue[cursor].dueAtSeconds <= waveRuntime.elapsedSeconds) {
    dueSpawns.push(waveRuntime.spawnQueue[cursor]);
    cursor += 1;
  }
  return { dueSpawns, nextSpawnedCount: cursor };
}

export function createEnemyInstance(definition: EnemyDefinition, routes: ScheduledSpawn["routes"], instanceId: string): EnemyInstance {
  return { instanceId, defId: definition.id, hp: definition.baseHp, maxHp: definition.baseHp, occupiedRoutes: routes, pathProgress: 0, debuffs: [], attackCooldownRemainingSeconds: 0, rangedAttackCooldownRemainingSeconds: 0 };
}

/** Advances only the UNBLOCKED enemies on a Route -- blocked ones are stationary
 * while they fight their blocker (八、Block/Intercept). `getSpeed` stays a callback
 * (not a field read off EnemyInstance) so this module never needs EnemyDefinition
 * lookups baked in, matching the merge.ts/block.ts dependency-injection pattern. */
export function updateEnemyMovement(route: RouteState, delta: number, blockedInstanceIds: ReadonlySet<string>, getSpeed: (enemy: EnemyInstance) => number): RouteState {
  if (!route.active) return route;
  return {
    ...route,
    enemies: route.enemies.map((enemy) => (blockedInstanceIds.has(enemy.instanceId) ? enemy : { ...enemy, pathProgress: enemy.pathProgress + getSpeed(enemy) * delta })),
  };
}

/** Splits a Route's enemies into those that reached the castle end (pathProgress
 * >= 1) and those still on the Route. Reached enemies never get a BoardCell --
 * per 十九、Castle/Failure they deal CastleDamage and leave immediately. */
export function partitionReachedCastle(route: RouteState): { reached: EnemyInstance[]; remaining: RouteState } {
  const reached = route.enemies.filter((enemy) => enemy.pathProgress >= 1);
  if (!reached.length) return { reached: [], remaining: route };
  return { reached, remaining: { ...route, enemies: route.enemies.filter((enemy) => enemy.pathProgress < 1) } };
}
