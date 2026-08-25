import { describe, expect, it } from "vitest";
import type { EnemyInstance, HeroInstance } from "./types";
import { resolveEffect } from "./rules/combat";
import { HERO_DEFINITIONS, HERO_EFFECT_REGISTRY } from "./heroes";

function makeHero(heroId: keyof typeof HERO_DEFINITIONS, tier: 1 | 2 | 3): HeroInstance {
  return {
    instanceId: `${heroId}-${tier}`,
    heroId: heroId as HeroInstance["heroId"],
    tier,
    hp: 100,
    maxHp: 100,
    cell: { zone: 1, row: "front" },
    status: "active",
    buffs: [],
    skill: { attackCountSinceWaveStart: 0, cooldownRemainingSeconds: 0, initialOffsetSeconds: 0 },
  };
}

function makeEnemy(instanceId: string, pathProgress: number): EnemyInstance {
  return { instanceId, defId: "slime", hp: 30, maxHp: 30, occupiedRoutes: [1], pathProgress };
}

describe("HERO_DEFINITIONS covers all 10 selectable heroes", () => {
  it("十個英雄都有完整定義（Basic Attack + Auto Skill + Trait）", () => {
    const expectedIds = ["knight", "deathKnight", "fighter", "assassin", "fireMage", "frostQueen", "ranger", "engineer", "priest", "bard"];
    expectedIds.forEach((id) => {
      const definition = HERO_DEFINITIONS[id as keyof typeof HERO_DEFINITIONS];
      expect(definition, `missing HeroDefinition for ${id}`).toBeDefined();
      expect(definition!.autoSkill.effectId in HERO_EFFECT_REGISTRY).toBe(true);
      expect(definition!.trait.effectId in HERO_EFFECT_REGISTRY).toBe(true);
      expect(definition!.tiers[1]).toBeDefined();
      expect(definition!.tiers[2]).toBeDefined();
      expect(definition!.tiers[3]).toBeDefined();
    });
  });
});

describe("role archetypes smoke test (one per role from 九)", () => {
  it("Tank（Knight）：Block 命中時獲得護盾，數值隨 Tier 提升", () => {
    const t1 = makeHero("knight", 1);
    const t3 = makeHero("knight", 3);
    const definition = HERO_DEFINITIONS.knight!;
    const context = { self: t1, selfDefinition: definition, enemyTargetPool: [], allySupportPool: [], random: () => 0.5 };
    const resultT1 = resolveEffect(HERO_EFFECT_REGISTRY, definition.autoSkill.effectId, context);
    const resultT3 = resolveEffect(HERO_EFFECT_REGISTRY, definition.autoSkill.effectId, { ...context, self: t3 });
    expect(resultT1.shieldToAllies?.[0].amount).toBeGreaterThan(0);
    expect(resultT3.shieldToAllies?.[0].amount).toBeGreaterThan(resultT1.shieldToAllies![0].amount);
  });

  it("AoE（Fire Mage）：T1 單體，T2+ 有濺射多個目標", () => {
    const definition = HERO_DEFINITIONS.fireMage!;
    const enemies = [makeEnemy("e1", 0.9), makeEnemy("e2", 0.8), makeEnemy("e3", 0.7)];
    const t1Context = { self: makeHero("fireMage", 1), selfDefinition: definition, enemyTargetPool: enemies, allySupportPool: [], random: () => 0.5 };
    const t2Context = { ...t1Context, self: makeHero("fireMage", 2) };
    const t1Result = resolveEffect(HERO_EFFECT_REGISTRY, definition.autoSkill.effectId, t1Context);
    const t2Result = resolveEffect(HERO_EFFECT_REGISTRY, definition.autoSkill.effectId, t2Context);
    expect(t1Result.damageToEnemies).toHaveLength(1);
    expect(t2Result.damageToEnemies!.length).toBeGreaterThan(1);
  });

  it("Support（Priest）：治療血量比例最低的盟友，T2 治療兩人", () => {
    const definition = HERO_DEFINITIONS.priest!;
    const allies = [
      { instanceId: "a", hp: 90, maxHp: 100 },
      { instanceId: "b", hp: 20, maxHp: 100 },
      { instanceId: "c", hp: 50, maxHp: 100 },
    ];
    const t1Context = { self: makeHero("priest", 1), selfDefinition: definition, enemyTargetPool: [], allySupportPool: allies, random: () => 0.5 };
    const t2Context = { ...t1Context, self: makeHero("priest", 2) };
    const t1Result = resolveEffect(HERO_EFFECT_REGISTRY, definition.autoSkill.effectId, t1Context);
    const t2Result = resolveEffect(HERO_EFFECT_REGISTRY, definition.autoSkill.effectId, t2Context);
    expect(t1Result.healToAllies).toEqual([{ instanceId: "b", amount: expect.any(Number) }]);
    expect(t2Result.healToAllies!.map((entry) => entry.instanceId).sort()).toEqual(["b", "c"]);
  });

  it("Mobile DPS（Assassin）：優先鎖定血量比例最低的目標，棋盤位置不變", () => {
    const definition = HERO_DEFINITIONS.assassin!;
    const enemies = [makeEnemy("healthy", 0.5), { ...makeEnemy("wounded", 0.5), hp: 5, maxHp: 30 }];
    const context = { self: makeHero("assassin", 1), selfDefinition: definition, enemyTargetPool: enemies, allySupportPool: [], random: () => 0.5 };
    const result = resolveEffect(HERO_EFFECT_REGISTRY, definition.autoSkill.effectId, context);
    expect(result.damageToEnemies?.[0].instanceId).toBe("wounded");
    expect(HERO_DEFINITIONS.assassin!.blockRule.baseCapacity).toBe(0);
  });
});
