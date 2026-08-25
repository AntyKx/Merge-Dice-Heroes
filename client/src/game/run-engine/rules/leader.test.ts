import { describe, expect, it } from "vitest";
import type { LeaderState } from "../types";
import { chooseBurstRoute, consumeBurst, isBurstReadyToFire, markBurstReady, needsRouteChoice } from "./leader";

function makeLeader(requiresRouteChoice: boolean): LeaderState {
  return {
    heroId: "fireMage",
    passive: { id: "p", effectId: "p.effect" },
    burst: { id: "b", kind: "attackSkill", effectId: "b.effect", requiresRouteChoice },
    burstReady: false,
  };
}

describe("Leader Burst state machine", () => {
  it("骰出四條/五條後標記 Ready，不需要額外能量條", () => {
    const leader = markBurstReady(makeLeader(false));
    expect(leader.burstReady).toBe(true);
    expect(isBurstReadyToFire(leader)).toBe(true);
  });

  it("需要選 Route 的 Burst，選擇前不算 Ready to Fire", () => {
    const leader = markBurstReady(makeLeader(true));
    expect(needsRouteChoice(leader)).toBe(true);
    expect(isBurstReadyToFire(leader)).toBe(false);
    const withRoute = chooseBurstRoute(leader, 2);
    expect(needsRouteChoice(withRoute)).toBe(false);
    expect(isBurstReadyToFire(withRoute)).toBe(true);
  });

  it("consumeBurst 重置 Ready 與 Route 選擇，且只存在一套（非 per-instance）", () => {
    const leader = chooseBurstRoute(markBurstReady(makeLeader(true)), 3);
    const consumed = consumeBurst(leader);
    expect(consumed.burstReady).toBe(false);
    expect(consumed.chosenBurstRoute).toBeUndefined();
  });

  it("不需要 Route 的 Burst，不受 chooseBurstRoute 影響", () => {
    const leader = makeLeader(false);
    expect(chooseBurstRoute(leader, 1)).toBe(leader);
  });
});
