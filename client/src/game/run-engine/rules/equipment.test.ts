import { describe, expect, it } from "vitest";
import { getEquipmentCastleBonus, getEquipmentDamageMultiplier, getEquipmentExtraRerolls } from "./equipment";

describe("equipment loadout application", () => {
  const loadout = { attackMultiplier: 0.08, castleBonus: 3, extraRerolls: 1 };

  it("攻擊倍率是 1 + attackMultiplier", () => expect(getEquipmentDamageMultiplier(loadout)).toBeCloseTo(1.08));
  it("城堡加成直接讀出", () => expect(getEquipmentCastleBonus(loadout)).toBe(3));
  it("額外重骰次數直接讀出", () => expect(getEquipmentExtraRerolls(loadout)).toBe(1));

  it("沒有裝備時（全 0）不影響任何數值", () => {
    const empty = { attackMultiplier: 0, castleBonus: 0, extraRerolls: 0 };
    expect(getEquipmentDamageMultiplier(empty)).toBe(1);
    expect(getEquipmentCastleBonus(empty)).toBe(0);
    expect(getEquipmentExtraRerolls(empty)).toBe(0);
  });
});
