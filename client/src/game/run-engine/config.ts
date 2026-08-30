/**
 * Run Engine tunable Config (架構重構 Phase 2).
 *
 * Everything here is explicitly a TENTATIVE balance value per 玩法核心.txt 三十九
 * ("目前先不要鎖死的數值") -- nothing in rules/*.ts should hard-code a number that
 * belongs here. Rule kinds/behaviors (e.g. "Merge is always 3-of-a-kind up to T3")
 * are considered decided and therefore live in types.ts / the rule functions
 * themselves, not this file.
 */
import type { FateEnergyCostTable, HeroTier } from "./types";

export const RUN_ENGINE_CONFIG = {
  /** T1/T2/T3 stat multiplier -- 十一、Tier 設計原則 states these are illustrative only. */
  tierStatMultiplier: { 1: 1.0, 2: 1.6, 3: 2.4 } satisfies Record<HeroTier, number>,

  pendingZoneCapacity: 2,

  repositionBaseAllowancePerWave: 2,
  repositionCarriesOverBetweenWaves: false,

  fateEnergy: {
    max: 10,
    recycleReward: { 1: 1, 2: 3, 3: 7 },
    randomSummonCost: 3,
    specifiedSummonCost: 6,
    extraRepositionCost: 2,
    extraRepositionPurchaseLimitPerWave: 1,
  } satisfies FateEnergyCostTable & { max: number },

  diceRerollsPerWave: 2,

  /** Downed-hero recovery, per 十八、Hero Death. */
  heroRecovery: {
    survivorLostHpRestorePct: 0.3,
    downedReviveMaxHpPct: 0.4,
  },

  /** CastleDamage is independent from enemy Width -- 十九. */
  castleDamageByEnemyClass: {
    normal: 1,
    heavy: 2,
    largeBeast: 3,
    siegeMin: 3,
    siegeMax: 5,
  },

  waveLength: {
    standard: 10,
    chapterFinal: 15,
    longDungeon: 20,
  },

  /** How much the permanent Hero Level (meta layer) scales a hero's Run-entry base
   * stats -- consumed only by metaAdapter.ts's applyLevelScaling(), never read
   * directly by combat rules. */
  heroLevelScaling: {
    attackPctPerLevel: 0.02,
    hpPctPerLevel: 0.02,
  },

  /** Reward-offer cadence: a Talent choice every Nth Wave clear, a Core Blessing
   * choice every Nth Wave clear (both checked against the just-cleared run.wave). */
  talentWaveInterval: 2,
  blessingWaveInterval: 5,

  /** How far along a Route (0-1, same units as HeroDefinition.rangeAlongRoute) an
   * EnemyDefinition.tags-"ranged" enemy must have travelled before it starts
   * striking a hero directly, bypassing Block entirely (orchestrator.ts's Combat
   * tick step 5.5) -- represents it closing to its own effective shooting range,
   * not "reaching the castle". Deliberately smaller than a melee tank's own
   * ~0.72-0.75 Block-engage threshold (1 - knight/deathKnight's rangeAlongRoute)
   * so ranged enemies start threatening the back row well before a front-line
   * tank would ever be forced to fight them. */
  rangedEnemyEngageRangeAlongRoute: 0.45,
} as const;
