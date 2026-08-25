/**
 * Auto Skill trigger evaluation (Phase 6), per 玩法核心.txt 十四.
 *
 * Only three trigger kinds exist: attackCount, interval, and condition. Skill
 * progress resets every Wave (never carries a "3/4 attacks" or "0.4s left on CD"
 * across Waves). Same-hero multi-instance desync uses a small deterministic
 * initialOffsetSeconds derived from instanceId, not randomness, so tests stay
 * reproducible.
 */
import type { AutoSkillRuntimeState, AutoSkillTrigger } from "../types";

const MAX_INITIAL_OFFSET_SECONDS = 0.35;

/** Deterministic small offset in [0, MAX_INITIAL_OFFSET_SECONDS) from instanceId,
 * so three copies of the same hero don't fire interval skills in perfect unison. */
export function deterministicInitialOffset(instanceId: string): number {
  let hash = 0;
  for (let index = 0; index < instanceId.length; index += 1) hash = (hash * 31 + instanceId.charCodeAt(index)) >>> 0;
  return (hash % 1000) / 1000 * MAX_INITIAL_OFFSET_SECONDS;
}

/** `trigger` is needed here (not just in advanceAutoSkill) so an "interval" skill's
 * very first cycle can be seeded at trigger.seconds + a small per-instance offset --
 * otherwise every hero would be ready to fire the instant a Wave's combat starts.
 * attackCount/condition triggers ignore cooldownRemainingSeconds entirely, so the
 * offset there only exists for inspection/debugging. */
export function resetSkillRuntime(instanceId: string, trigger: AutoSkillTrigger): AutoSkillRuntimeState {
  const initialOffsetSeconds = deterministicInitialOffset(instanceId);
  const cooldownRemainingSeconds = trigger.kind === "interval" ? trigger.seconds + initialOffsetSeconds : 0;
  return { attackCountSinceWaveStart: 0, cooldownRemainingSeconds, initialOffsetSeconds };
}

/** Call once per hero per combat tick. `justAttacked` should be true on the exact
 * tick a Basic Attack landed (for attackCount triggers); `conditionMet` is supplied
 * by the caller for "condition" triggers (context the engine can't judge generically,
 * e.g. "a high-value target just appeared"). Returns the updated runtime state and
 * whether the skill fires THIS tick -- firing always resets progress back to 0 /
 * trigger.seconds so the next cycle starts clean. */
export function advanceAutoSkill(state: AutoSkillRuntimeState, trigger: AutoSkillTrigger, delta: number, justAttacked: boolean, conditionMet = false): { state: AutoSkillRuntimeState; triggered: boolean } {
  if (trigger.kind === "attackCount") {
    if (!justAttacked) return { state, triggered: false };
    const attackCountSinceWaveStart = state.attackCountSinceWaveStart + 1;
    const triggered = attackCountSinceWaveStart % trigger.every === 0;
    return { state: { ...state, attackCountSinceWaveStart }, triggered };
  }
  if (trigger.kind === "interval") {
    const remaining = state.cooldownRemainingSeconds - delta;
    if (remaining > 0) return { state: { ...state, cooldownRemainingSeconds: remaining }, triggered: false };
    // Carry over the (negative) overshoot so long frame steps don't lose fractional
    // progress -- the initial desync offset only ever affected the first cycle,
    // baked in by resetSkillRuntime(); every cycle after that is a plain trigger.seconds.
    return { state: { ...state, cooldownRemainingSeconds: trigger.seconds + remaining }, triggered: true };
  }
  // condition trigger: engine has no opinion on the condition itself.
  return { state, triggered: conditionMet };
}
