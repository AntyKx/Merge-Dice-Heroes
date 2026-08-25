/**
 * Leader rules (Phase 7), per 玩法核心.txt 三十三.
 *
 * Passive is always active for the whole Run regardless of whether that heroId is
 * currently summoned -- LeaderState.passive never needs a "is this hero on the
 * board" check anywhere, it's simply looked up once per Run. Burst has no separate
 * energy bar and no manual combat button: it's set ready by FOUR_KIND/FIVE_KIND
 * dice (see rules/dice.ts's leaderBurstReady effect) and fires automatically --
 * WHEN exactly (immediately at Combat Start for a buff/shield, or on first-batch-
 * arrival for an attack skill) is an orchestrator (Phase 9) timing decision, not
 * something this module tracks; this module only manages the ready/route-choice/
 * consumed state machine.
 */
import type { LeaderState, RouteId } from "../types";

export function markBurstReady(leader: LeaderState): LeaderState {
  return { ...leader, burstReady: true };
}

export function needsRouteChoice(leader: LeaderState): boolean {
  return leader.burstReady && leader.burst.requiresRouteChoice && leader.chosenBurstRoute === undefined;
}

export function chooseBurstRoute(leader: LeaderState, routeId: RouteId): LeaderState {
  if (!leader.burst.requiresRouteChoice) return leader;
  return { ...leader, chosenBurstRoute: routeId };
}

/** True once the Burst has everything it needs to actually fire (ready, and a
 * Route chosen if the Burst kind requires one). */
export function isBurstReadyToFire(leader: LeaderState): boolean {
  return leader.burstReady && (!leader.burst.requiresRouteChoice || leader.chosenBurstRoute !== undefined);
}

/** Called once the Burst has actually fired -- resets ready/route state. Only one
 * Burst ever exists per Run regardless of how many Instances of the Leader's hero
 * are on the board (三十三: "場上就算有 4 個 Leader Hero Instance，也只存在一套
 * Leader Passive，Burst 也只觸發一次") -- this falls out for free since LeaderState
 * is a single object on RunState, never per-HeroInstance. */
export function consumeBurst(leader: LeaderState): LeaderState {
  return { ...leader, burstReady: false, chosenBurstRoute: undefined };
}
