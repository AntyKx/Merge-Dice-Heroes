import { describe, expect, it } from "vitest";
import { HERO_DEFINITIONS } from "./heroes";
import { buildLeaderState, LEADER_BURST_REGISTRY, LEADER_PASSIVE_REGISTRY } from "./leaders";

describe("Leader definitions cover all 10 selectable heroes", () => {
  it("每個可選英雄都能組出完整 LeaderState，且 Passive/Burst effectId 都有對應 resolver", () => {
    (Object.keys(HERO_DEFINITIONS) as Array<keyof typeof HERO_DEFINITIONS>).forEach((heroId) => {
      const leader = buildLeaderState(heroId);
      expect(leader.burstReady).toBe(false);
      expect(leader.passive.effectId in LEADER_PASSIVE_REGISTRY).toBe(true);
      expect(leader.burst.effectId in LEADER_BURST_REGISTRY).toBe(true);
    });
  });
});

describe("Leader Burst resolvers act on the whole battlefield, not per-coverage", () => {
  it("騎士 Burst 為全體英雄上護盾", () => {
    const context = { allyPool: [{ instanceId: "a", hp: 50, maxHp: 100 }, { instanceId: "b", hp: 80, maxHp: 100 }], enemyPool: [], random: () => 0.5 };
    const result = LEADER_BURST_REGISTRY["knight.burst"](context);
    expect(result.shieldToAllies?.map((entry) => entry.instanceId).sort()).toEqual(["a", "b"]);
  });

  it("刺客 Burst 只鎖定最靠近城堡的單一目標", () => {
    const context = {
      allyPool: [],
      enemyPool: [
        { instanceId: "far", defId: "slime", hp: 10, maxHp: 10, occupiedRoutes: [1 as const], pathProgress: 0.3, debuffs: [] },
        { instanceId: "near", defId: "slime", hp: 10, maxHp: 10, occupiedRoutes: [1 as const], pathProgress: 0.9, debuffs: [] },
      ],
      random: () => 0.5,
    };
    const result = LEADER_BURST_REGISTRY["assassin.burst"](context);
    expect(result.damageToEnemies).toEqual([{ instanceId: "near", amount: 185 }]);
  });
});
