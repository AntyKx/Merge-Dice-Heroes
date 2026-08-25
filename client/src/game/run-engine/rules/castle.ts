/**
 * Castle / Run-failure rules (Phase 5), per 玩法核心.txt 十九.
 *
 * CastleDamage is intentionally independent from enemy Width (a Width 2 elite is
 * NOT automatically CastleDamage 2) -- callers look up the damage value from
 * EnemyDefinition.castleDamage themselves and pass it in here.
 *
 * "全英雄倒地不直接 Game Over" falls out naturally: nothing in this module reads
 * hero/board state at all. isRunFailure() is the ONLY failure condition -- Castle
 * HP <= 0. Enemies keep advancing toward the castle regardless of board state
 * elsewhere in the Run Engine.
 */
import type { CastleState } from "../types";

export function applyCastleDamage(castle: CastleState, damage: number): CastleState {
  return { ...castle, hp: Math.max(0, castle.hp - damage) };
}

export function isRunFailure(castle: CastleState): boolean {
  return castle.hp <= 0;
}
