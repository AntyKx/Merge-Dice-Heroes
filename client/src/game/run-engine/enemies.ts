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
};
