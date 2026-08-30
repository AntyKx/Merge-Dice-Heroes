import { describe, expect, it } from "vitest";
import type { HeroDefinition } from "../types";
import { getBasicAttackDamage, getEffectiveAttackInterval, resolveEffect, rollCritMultiplier } from "./combat";

const definition: Partial<HeroDefinition> = {
  baseAttack: 10,
  attackInterval: 1,
  tiers: {
    1: { behavior: {} },
    2: { behavior: {} },
    3: { behavior: {} },
  },
};

describe("getBasicAttackDamage", () => {
  it("依 Config 的 Tier 倍率縮放（1.0 / 1.6 / 2.4）", () => {
    expect(getBasicAttackDamage(definition as HeroDefinition, 1)).toBe(10);
    expect(getBasicAttackDamage(definition as HeroDefinition, 2)).toBeCloseTo(16);
    expect(getBasicAttackDamage(definition as HeroDefinition, 3)).toBeCloseTo(24);
  });

  it("外部倍率（Talent/Blessing/裝備彙總）另外相乘", () => {
    expect(getBasicAttackDamage(definition as HeroDefinition, 1, 1.5)).toBeCloseTo(15);
  });

  it("個別英雄可用 statMultiplierOverride 覆蓋全域 Tier 倍率", () => {
    const overridden: Partial<HeroDefinition> = { ...definition, tiers: { ...definition.tiers, 2: { statMultiplierOverride: 2, behavior: {} } } } as Partial<HeroDefinition>;
    expect(getBasicAttackDamage(overridden as HeroDefinition, 2)).toBe(20);
  });
});

describe("getEffectiveAttackInterval", () => {
  it("攻速倍率越高，間隔越短", () => {
    expect(getEffectiveAttackInterval(definition as HeroDefinition, 1)).toBe(1);
    expect(getEffectiveAttackInterval(definition as HeroDefinition, 2)).toBe(0.5);
  });
});

describe("rollCritMultiplier", () => {
  it("骰值低於暴擊率時回傳暴擊倍率", () => {
    expect(rollCritMultiplier(0.5, 1.5, () => 0.3)).toBe(1.5);
  });

  it("骰值不低於暴擊率時回傳 1（未暴擊）", () => {
    expect(rollCritMultiplier(0.5, 1.5, () => 0.5)).toBe(1);
    expect(rollCritMultiplier(0.5, 1.5, () => 0.9)).toBe(1);
  });

  it("暴擊率為 0 時永不暴擊", () => {
    expect(rollCritMultiplier(0, 2, () => 0)).toBe(1);
  });
});

describe("resolveEffect", () => {
  it("未知 effectId 回傳空結果而非拋錯", () => {
    expect(resolveEffect({}, "does-not-exist", {} as never)).toEqual({});
  });

  it("找到 resolver 時呼叫並回傳其結果", () => {
    const registry = { "test-effect": () => ({ damageToEnemies: [{ instanceId: "e1", amount: 5 }] }) };
    expect(resolveEffect(registry, "test-effect", {} as never)).toEqual({ damageToEnemies: [{ instanceId: "e1", amount: 5 }] });
  });
});
