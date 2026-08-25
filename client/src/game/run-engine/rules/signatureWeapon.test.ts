import { describe, expect, it } from "vitest";
import type { HeroDefinition } from "../types";
import { applySignatureWeapon } from "./signatureWeapon";

const baseDefinition: HeroDefinition = {
  id: "fireMage",
  role: "ranged",
  baseAttack: 16,
  baseHp: 56,
  attackInterval: 1.35,
  rangeAlongRoute: 0.62,
  coverage: { kind: "rangedSelective", maxZoneSpan: 1 },
  blockRule: { baseCapacity: 0, rowCapacityMultiplier: {}, zoneSpan: 0 },
  tiers: { 1: { behavior: {} }, 2: { behavior: {} }, 3: { behavior: {} } },
  autoSkill: { id: "flameBurst", trigger: { kind: "attackCount", every: 4 }, effectId: "fireMage.flameBurst" },
  trait: { id: "ignite", effectId: "fireMage.ignite" },
};

const signatureWeapon = {
  id: "emberStaff",
  heroId: "fireMage" as const,
  patch: { autoSkillEffectId: "fireMage.flameBurst.signature", extraCoverageZoneSpan: 1 },
};

describe("applySignatureWeapon", () => {
  it("未解鎖時完全不影響 HeroDefinition，角色仍 100% 完整", () => {
    expect(applySignatureWeapon(baseDefinition, false, signatureWeapon)).toBe(baseDefinition);
  });

  it("沒有專武資料時也不影響", () => {
    expect(applySignatureWeapon(baseDefinition, true, undefined)).toBe(baseDefinition);
  });

  it("解鎖後只覆蓋 patch 內指定的欄位，其餘維持原樣", () => {
    const patched = applySignatureWeapon(baseDefinition, true, signatureWeapon);
    expect(patched.autoSkill.effectId).toBe("fireMage.flameBurst.signature");
    expect(patched.coverage.maxZoneSpan).toBe(2);
    expect(patched.trait).toBe(baseDefinition.trait);
    expect(patched.baseAttack).toBe(baseDefinition.baseAttack);
  });

  it("不同英雄的專武不會誤套用", () => {
    const otherHeroWeapon = { ...signatureWeapon, heroId: "knight" as const };
    expect(applySignatureWeapon(baseDefinition, true, otherHeroWeapon)).toBe(baseDefinition);
  });
});
