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
import type { ChapterId } from "../types";
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

/**
 * Chapter 2: 城外戰線．霧谷前線 (遠征輿圖 v1). Same 10-Wave / Route-pacing rhythm
 * as Chapter 1 (deliberately reused, not reinvented) with an entirely new enemy
 * roster (~+55~65% stats, see enemies.ts) so the difficulty step comes from
 * "who" the player fights, not just bigger numbers on the same monsters.
 */
export const WAVES_BATTLEFIELD: WaveDefinition[] = [
  buildWave(1, [2], { 2: "low" }, [{ enemyId: "mistStalker", count: 5 }]),
  buildWave(2, [1, 3], { 1: "low", 3: "medium" }, [{ enemyId: "mistbladeDuelist", count: 4 }, { enemyId: "mistStalker", count: 3 }]),
  buildWave(3, [2, 3], { 2: "medium", 3: "medium" }, [{ enemyId: "ironwardenCommander", count: 3 }, { enemyId: "mistbladeDuelist", count: 4 }]),
  buildWave(4, [2, 3], { 2: "high", 3: "high" }, [{ enemyId: "glacialColossus", count: 1, routesOverride: [2, 3] }, { enemyId: "frostShaman", count: 2 }]),
  buildWave(5, [1, 2, 3], { 1: "medium", 2: "medium", 3: "medium" }, [{ enemyId: "ironwardenCommander", count: 4 }, { enemyId: "frostBomber", count: 3 }]),
  buildWave(6, [1, 2, 4], { 1: "medium", 2: "high", 4: "medium" }, [{ enemyId: "frostBomber", count: 4 }, { enemyId: "frostShaman", count: 3 }, { enemyId: "mistbladeDuelist", count: 4 }]),
  buildWave(7, [1, 2, 3], { 1: "medium", 2: "high", 3: "medium" }, [{ enemyId: "mistStalker", count: 5 }, { enemyId: "ironwardenCommander", count: 3 }, { enemyId: "frostShaman", count: 3 }]),
  buildWave(8, [1, 3, 4], { 1: "high", 3: "high", 4: "medium" }, [{ enemyId: "frostBomber", count: 5 }, { enemyId: "mistbladeDuelist", count: 5 }, { enemyId: "frostShaman", count: 2 }]),
  buildWave(9, [1, 2, 3, 4], { 1: "high", 2: "high", 3: "high", 4: "high" }, [{ enemyId: "glacialColossus", count: 1, routesOverride: [2, 3] }, { enemyId: "mistStalker", count: 4 }, { enemyId: "ironwardenCommander", count: 4 }]),
  buildWave(10, [1, 2, 3, 4], { 1: "high", 2: "high", 3: "high", 4: "high" },
    [{ enemyId: "mistbladeDuelist", count: 5 }, { enemyId: "frostBomber", count: 4 }],
    { bossEnemyId: "fogSovereign", phases: [
      { id: "phase1", hpFractionTrigger: 1, skillIds: [] },
      { id: "phase2", hpFractionTrigger: 0.5, skillIds: ["fogSovereign.mistCollapse"], tileLock: true, dangerZone: true, summons: { delaySeconds: 0, entries: [{ enemyId: "mistStalker", gapSeconds: 0, routes: [1] }, { enemyId: "mistStalker", gapSeconds: 0.6, routes: [4] }, { enemyId: "mistStalker", gapSeconds: 1.2, routes: [2] }] } },
    ] }),
];

/**
 * Chapter 3: 月影城垣．銀月守望 (遠征輿圖 v1). First chapter to field a true
 * `siege`-tagged regular enemy (siegeBombardier) and a 3-phase Boss (all prior
 * Bosses used 2).
 */
export const WAVES_MOONLIT: WaveDefinition[] = [
  buildWave(1, [3], { 3: "low" }, [{ enemyId: "nightowlSniper", count: 5 }]),
  buildWave(2, [2, 4], { 2: "low", 4: "medium" }, [{ enemyId: "moonbladeRonin", count: 4 }, { enemyId: "nightowlSniper", count: 3 }]),
  buildWave(3, [1, 3], { 1: "medium", 3: "medium" }, [{ enemyId: "siegeBombardier", count: 3 }, { enemyId: "moonbladeRonin", count: 4 }]),
  buildWave(4, [1, 3], { 1: "high", 3: "high" }, [{ enemyId: "silverMoonEnforcer", count: 1, routesOverride: [1, 3] }, { enemyId: "haloCleric", count: 2 }]),
  buildWave(5, [1, 2, 4], { 1: "medium", 2: "medium", 4: "medium" }, [{ enemyId: "siegeBombardier", count: 4 }, { enemyId: "moonfallCatapult", count: 3 }]),
  buildWave(6, [2, 3, 4], { 2: "medium", 3: "high", 4: "medium" }, [{ enemyId: "moonfallCatapult", count: 4 }, { enemyId: "haloCleric", count: 3 }, { enemyId: "moonbladeRonin", count: 4 }]),
  buildWave(7, [1, 2, 4], { 1: "medium", 2: "high", 4: "medium" }, [{ enemyId: "nightowlSniper", count: 5 }, { enemyId: "siegeBombardier", count: 3 }, { enemyId: "haloCleric", count: 3 }]),
  buildWave(8, [1, 2, 3], { 1: "high", 2: "high", 3: "high" }, [{ enemyId: "moonfallCatapult", count: 5 }, { enemyId: "moonbladeRonin", count: 5 }, { enemyId: "haloCleric", count: 2 }]),
  buildWave(9, [1, 2, 3, 4], { 1: "high", 2: "high", 3: "high", 4: "high" }, [{ enemyId: "silverMoonEnforcer", count: 1, routesOverride: [1, 3] }, { enemyId: "nightowlSniper", count: 4 }, { enemyId: "siegeBombardier", count: 4 }]),
  buildWave(10, [1, 2, 3, 4], { 1: "high", 2: "high", 3: "high", 4: "high" },
    [{ enemyId: "moonbladeRonin", count: 5 }, { enemyId: "moonfallCatapult", count: 4 }],
    { bossEnemyId: "silverMoonArbiter", phases: [
      { id: "phase1", hpFractionTrigger: 1, skillIds: [] },
      { id: "phase2", hpFractionTrigger: 0.6, skillIds: ["silverMoonArbiter.moonlock"], tileLock: true, summons: { delaySeconds: 0, entries: [{ enemyId: "silverMoonEnforcer", gapSeconds: 0, routes: [2, 3] }] } },
      { id: "phase3", hpFractionTrigger: 0.25, skillIds: ["silverMoonArbiter.lastVigil"], dangerZone: true, summons: { delaySeconds: 0, entries: [{ enemyId: "nightowlSniper", gapSeconds: 0, routes: [1] }, { enemyId: "nightowlSniper", gapSeconds: 0.6, routes: [4] }, { enemyId: "moonfallCatapult", gapSeconds: 1.2, routes: [2] }, { enemyId: "moonfallCatapult", gapSeconds: 1.8, routes: [3] }] } },
    ] }),
];

/** Every chapter's Wave list, keyed by ChapterId (types.ts). All three chapters
 * are 10 Waves each (matching RUN_ENGINE_CONFIG.waveLength.standard) so nothing
 * downstream needs to branch on per-chapter length. */
export const WAVES_BY_CHAPTER: Record<ChapterId, WaveDefinition[]> = {
  courtyard: WAVE_DEFINITIONS,
  battlefield: WAVES_BATTLEFIELD,
  moonlit: WAVES_MOONLIT,
};

