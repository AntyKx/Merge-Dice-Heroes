/**
 * Enemy Config (Phase 9), per 玩法核心.txt 七、Width and the doc's own baseline
 * roster carried over from the existing game/config.ts ENEMIES (stats reused
 * as-is; width/blockCost/siege/castleDamage are new fields this design adds).
 */
import type { EnemyDefinition } from "./types";

export const ENEMY_DEFINITIONS: Record<string, EnemyDefinition> = {
  slime: { id: "slime", width: 1, blockCost: 1, castleDamage: 1, siege: false, tags: [], baseHp: 34, baseAttack: 7, attackIntervalSeconds: 1.2, speed: 0.04 },
  wolf: { id: "wolf", width: 1, blockCost: 1, castleDamage: 1, siege: false, tags: [], baseHp: 25, baseAttack: 6, attackIntervalSeconds: 0.85, speed: 0.077 },
  shieldSoldier: { id: "shieldSoldier", width: 1, blockCost: 1, castleDamage: 2, siege: false, tags: [], baseHp: 78, baseAttack: 9, attackIntervalSeconds: 1.3, speed: 0.032 },
  goblinArcher: { id: "goblinArcher", width: 1, blockCost: 1, castleDamage: 1, siege: false, tags: ["ranged"], baseHp: 45, baseAttack: 8, attackIntervalSeconds: 1.1, speed: 0.038 },
  shaman: { id: "shaman", width: 1, blockCost: 1, castleDamage: 1, siege: false, tags: ["healer"], baseHp: 55, baseAttack: 5, attackIntervalSeconds: 1.4, speed: 0.03 },
  bomber: { id: "bomber", width: 1, blockCost: 1, castleDamage: 2, siege: false, tags: [], baseHp: 42, baseAttack: 10, attackIntervalSeconds: 1.1, speed: 0.052 },
  eliteGiant: { id: "eliteGiant", width: 2, blockCost: 1, castleDamage: 3, siege: false, tags: ["elite"], baseHp: 320, baseAttack: 15, attackIntervalSeconds: 1.45, speed: 0.022 },
  boss: { id: "boss", width: 4, blockCost: 2, castleDamage: 6, siege: true, tags: ["boss", "elite"], baseHp: 720, baseAttack: 19, attackIntervalSeconds: 1.3, speed: 0.018 },

  // 第二章 城外戰線．霧谷前線 (遠征輿圖 v1) -- roster roughly +55~65% over Ch1's
  // baseline, per the design doc's difficulty curve.
  mistStalker: { id: "mistStalker", width: 1, blockCost: 1, castleDamage: 1, siege: false, tags: ["ranged"], baseHp: 62, baseAttack: 12, attackIntervalSeconds: 1.0, speed: 0.05 },
  mistbladeDuelist: { id: "mistbladeDuelist", width: 1, blockCost: 1, castleDamage: 1, siege: false, tags: [], baseHp: 58, baseAttack: 11, attackIntervalSeconds: 0.9, speed: 0.06 },
  ironwardenCommander: { id: "ironwardenCommander", width: 1, blockCost: 1, castleDamage: 2, siege: false, tags: [], baseHp: 135, baseAttack: 13, attackIntervalSeconds: 1.35, speed: 0.026 },
  frostShaman: { id: "frostShaman", width: 1, blockCost: 1, castleDamage: 1, siege: false, tags: ["healer"], baseHp: 70, baseAttack: 6, attackIntervalSeconds: 1.5, speed: 0.028 },
  frostBomber: { id: "frostBomber", width: 1, blockCost: 1, castleDamage: 2, siege: false, tags: [], baseHp: 68, baseAttack: 15, attackIntervalSeconds: 1.15, speed: 0.048 },
  glacialColossus: { id: "glacialColossus", width: 2, blockCost: 1, castleDamage: 4, siege: false, tags: ["elite"], baseHp: 480, baseAttack: 22, attackIntervalSeconds: 1.4, speed: 0.02 },
  fogSovereign: { id: "fogSovereign", width: 4, blockCost: 2, castleDamage: 7, siege: true, tags: ["boss", "elite"], baseHp: 1150, baseAttack: 27, attackIntervalSeconds: 1.25, speed: 0.017 },

  // 第三章 月影城垣．銀月守望 (遠征輿圖 v1) -- roster roughly +50~55% over Ch2's
  // baseline; first chapter to field a true `siege` regular enemy (siegeBombardier).
  nightowlSniper: { id: "nightowlSniper", width: 1, blockCost: 1, castleDamage: 2, siege: false, tags: ["ranged"], baseHp: 100, baseAttack: 20, attackIntervalSeconds: 1.05, speed: 0.045 },
  moonbladeRonin: { id: "moonbladeRonin", width: 1, blockCost: 1, castleDamage: 2, siege: false, tags: [], baseHp: 95, baseAttack: 18, attackIntervalSeconds: 0.85, speed: 0.065 },
  siegeBombardier: { id: "siegeBombardier", width: 1, blockCost: 1, castleDamage: 3, siege: true, tags: ["siege"], baseHp: 150, baseAttack: 24, attackIntervalSeconds: 1.2, speed: 0.03 },
  haloCleric: { id: "haloCleric", width: 1, blockCost: 1, castleDamage: 1, siege: false, tags: ["healer"], baseHp: 110, baseAttack: 8, attackIntervalSeconds: 1.5, speed: 0.026 },
  moonfallCatapult: { id: "moonfallCatapult", width: 1, blockCost: 1, castleDamage: 3, siege: false, tags: [], baseHp: 120, baseAttack: 26, attackIntervalSeconds: 1.25, speed: 0.04 },
  silverMoonEnforcer: { id: "silverMoonEnforcer", width: 2, blockCost: 1, castleDamage: 5, siege: false, tags: ["elite"], baseHp: 720, baseAttack: 32, attackIntervalSeconds: 1.35, speed: 0.019 },
  silverMoonArbiter: { id: "silverMoonArbiter", width: 4, blockCost: 2, castleDamage: 9, siege: true, tags: ["boss", "elite"], baseHp: 1800, baseAttack: 38, attackIntervalSeconds: 1.2, speed: 0.016 },
};
