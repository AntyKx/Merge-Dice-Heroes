/**
 * Wave Config (Phase 9), per 玩法核心.txt 六/二十/二十一/二十二/二十三.
 *
 * A 10-Wave standard campaign (三十九's config for wave-length is elsewhere;
 * this is just the concrete Wave list), carried over from the existing
 * game/config.ts WAVES' enemy composition but expressed with Route/Width/
 * SpawnBatch instead of a single flat enemy count list. Active Routes
 * deliberately vary (not always the same subset) per 六's "兩路不代表永遠是
 * Route1+Route4".
 */
import type { RouteId, RoutePressure, WaveDefinition } from "./types";

interface EnemyCount {
  enemyId: string;
  count: number;
  /** Only needed for Width>=2 enemies -- which Routes each single instance
   * occupies. Width 1 entries just round-robin across activeRoutes. */
  routesOverride?: RouteId[];
}

function buildWave(waveNumber: number, activeRoutes: RouteId[], routePressure: Partial<Record<RouteId, RoutePressure>>, enemyCounts: EnemyCount[], bossEncounter?: WaveDefinition["bossEncounter"]): WaveDefinition {
  const entries: WaveDefinition["batches"][number]["entries"] = [];
  let index = 0;
  enemyCounts.forEach(({ enemyId, count, routesOverride }) => {
    for (let i = 0; i < count; i += 1) {
      const routes = routesOverride ?? [activeRoutes[index % activeRoutes.length]];
      entries.push({ enemyId, gapSeconds: index * 0.6, routes });
      index += 1;
    }
  });
  return { waveNumber, activeRoutes, routePressure, batches: [{ delaySeconds: 0, entries }], bossEncounter };
}

export const WAVE_DEFINITIONS: WaveDefinition[] = [
  buildWave(1, [2], { 2: "low" }, [{ enemyId: "slime", count: 5 }]),
  buildWave(2, [1, 3], { 1: "low", 3: "medium" }, [{ enemyId: "slime", count: 4 }, { enemyId: "wolf", count: 3 }]),
  buildWave(3, [2, 3], { 2: "medium", 3: "medium" }, [{ enemyId: "slime", count: 5 }, { enemyId: "wolf", count: 4 }]),
  buildWave(4, [2, 3], { 2: "high", 3: "high" }, [{ enemyId: "eliteGiant", count: 1, routesOverride: [2, 3] }, { enemyId: "shieldSoldier", count: 3 }]),
  buildWave(5, [1, 2, 3], { 1: "medium", 2: "medium", 3: "medium" }, [{ enemyId: "shieldSoldier", count: 4 }, { enemyId: "goblinArcher", count: 3 }]),
  buildWave(6, [1, 2, 4], { 1: "medium", 2: "high", 4: "medium" }, [{ enemyId: "bomber", count: 4 }, { enemyId: "shaman", count: 2 }, { enemyId: "wolf", count: 4 }]),
  buildWave(7, [1, 2, 3], { 1: "medium", 2: "high", 3: "medium" }, [{ enemyId: "slime", count: 5 }, { enemyId: "goblinArcher", count: 4 }, { enemyId: "shieldSoldier", count: 3 }]),
  buildWave(8, [1, 3, 4], { 1: "high", 3: "high", 4: "medium" }, [{ enemyId: "bomber", count: 5 }, { enemyId: "wolf", count: 5 }, { enemyId: "shaman", count: 2 }]),
  buildWave(9, [1, 2, 3, 4], { 1: "high", 2: "high", 3: "high", 4: "high" }, [{ enemyId: "eliteGiant", count: 1, routesOverride: [2, 3] }, { enemyId: "goblinArcher", count: 4 }, { enemyId: "shieldSoldier", count: 4 }]),
  buildWave(10, [1, 2, 3, 4], { 1: "high", 2: "high", 3: "high", 4: "high" },
    [{ enemyId: "wolf", count: 4 }, { enemyId: "bomber", count: 3 }],
    { bossEnemyId: "boss", phases: [
      { id: "phase1", hpFractionTrigger: 1, skillIds: [] },
      { id: "phase2", hpFractionTrigger: 0.5, skillIds: ["boss.tileLockSlam"], tileLock: true, dangerZone: true, summons: { delaySeconds: 0, entries: [{ enemyId: "slime", gapSeconds: 0, routes: [1] }] } },
    ] }),
];

