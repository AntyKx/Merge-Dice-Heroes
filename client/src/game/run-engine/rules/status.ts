/**
 * Status/Buff stacking rules (Phase 6), per 玩法核心.txt 十三、疊加規則.
 *
 * - Direct damage: always stacks normally (not handled here, it's plain arithmetic
 *   at the damage-calculation call site).
 * - Same id + same source: does NOT sum -- takes the higher magnitude, or refreshes
 *   duration (same thing, expressed as "apply and let addStatusEffect replace").
 * - Different sources: may stack, but up to a Cap (applyStatusCap).
 * - Control (Slow/Freeze) needs a Cap and/or internal cooldown so a Boss can never
 *   be perma-locked -- controlCap()/hasControlImmunity() below.
 */
import type { ActiveStatusEffect } from "../types";

/** Adds/refreshes a status effect on a hero. Same id+source replaces the existing
 * entry (never sums) -- callers pass the LARGER of old/new magnitude in if "take
 * highest" is the desired semantic; this function's job is only the identity rule,
 * not the comparison itself, so different effect kinds (buff vs debuff) can each
 * decide "highest wins" vs "always refresh" at the call site if they ever need to
 * differ. */
export function upsertStatusEffect(buffs: ActiveStatusEffect[], next: ActiveStatusEffect): ActiveStatusEffect[] {
  const existingIndex = buffs.findIndex((buff) => buff.id === next.id && buff.source === next.source);
  if (existingIndex === -1) return [...buffs, next];
  const copy = [...buffs];
  copy[existingIndex] = next;
  return copy;
}

export function removeExpiredStatusEffects(buffs: ActiveStatusEffect[], nowMs: number): ActiveStatusEffect[] {
  return buffs.filter((buff) => buff.expiresAtMs === undefined || buff.expiresAtMs > nowMs);
}

/** Different-source stacks of the same status id are capped at `cap` total combined
 * magnitude -- used for e.g. Shield Cap, Slow Cap. */
export function totalMagnitudeCapped(buffs: ActiveStatusEffect[], id: string, cap: number): number {
  const total = buffs.filter((buff) => buff.id === id).reduce((sum, buff) => sum + buff.magnitude, 0);
  return Math.min(total, cap);
}

export interface ControlCooldownState {
  /** HeroInstance/EnemyInstance id -> timestamp (ms) before which new Control
   * effects (Slow/Freeze) cannot be (re)applied to that target. */
  immuneUntilMs: Partial<Record<string, number>>;
}

export function hasControlImmunity(state: ControlCooldownState, targetId: string, nowMs: number): boolean {
  const until = state.immuneUntilMs[targetId];
  return until !== undefined && until > nowMs;
}

/** Grants a short internal-cooldown immunity window after a Control effect (e.g.
 * Freeze) expires or is applied, per 十三's "Freeze Immunity / Internal Cooldown" --
 * prevents a Boss (or anything) from being perma-locked by stacked Control. */
export function grantControlImmunity(state: ControlCooldownState, targetId: string, untilMs: number): ControlCooldownState {
  return { immuneUntilMs: { ...state.immuneUntilMs, [targetId]: untilMs } };
}
