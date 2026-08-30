import { describe, expect, it } from "vitest";
import {
  getEquipmentAttackSpeedMultiplier,
  getEquipmentBossDamageMultiplier,
  getEquipmentCastleBonus,
  getEquipmentChainLightningProcChance,
  getEquipmentComboUpgradeChance,
  getEquipmentCritChance,
  getEquipmentCritDamageFactor,
  getEquipmentDamageMultiplier,
  getEquipmentDamageReductionPct,
  getEquipmentExtraRerolls,
  getEquipmentFateEnergyMaxBonus,
  getEquipmentFreeMergeChance,
  getEquipmentHpMultiplier,
  getEquipmentProtectedDieCount,
  getEquipmentRecoveryPctBonus,
  getEquipmentRepositionBonus,
  getEquipmentSummonCostReduction,
  getEquipmentTankBlockCapacityBonus,
  getEquipmentWaveStartShieldPct,
} from "./equipment";
import type { EquipmentLoadout } from "../types";

const EMPTY_LOADOUT: EquipmentLoadout = {
  attackMultiplier: 0, castleBonus: 0, extraRerolls: 0, attackSpeedMultiplier: 0,
  critChance: 0, critDamageMultiplier: 0, bossDamageMultiplier: 0, hpMultiplier: 0,
  recoveryPctBonus: 0, shieldOnWaveStartPctCastleHp: 0, damageReductionPct: 0,
  tankBlockCapacityBonus: 0, repositionBonus: 0, fateEnergyMaxBonus: 0,
  summonCostReduction: 0, freeMergeChance: 0, comboUpgradeChance: 0,
  protectedDieCount: 0, chainLightningProcChance: 0,
};

describe("equipment loadout application", () => {
  const loadout: EquipmentLoadout = { ...EMPTY_LOADOUT, attackMultiplier: 0.08, castleBonus: 3, extraRerolls: 1 };

  it("攻擊倍率是 1 + attackMultiplier", () => expect(getEquipmentDamageMultiplier(loadout)).toBeCloseTo(1.08));
  it("城堡加成直接讀出", () => expect(getEquipmentCastleBonus(loadout)).toBe(3));
  it("額外重骰次數直接讀出", () => expect(getEquipmentExtraRerolls(loadout)).toBe(1));

  it("沒有裝備時（全 0）不影響任何數值", () => {
    expect(getEquipmentDamageMultiplier(EMPTY_LOADOUT)).toBe(1);
    expect(getEquipmentCastleBonus(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentExtraRerolls(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentAttackSpeedMultiplier(EMPTY_LOADOUT)).toBe(1);
    expect(getEquipmentCritChance(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentCritDamageFactor(EMPTY_LOADOUT)).toBe(1);
    expect(getEquipmentBossDamageMultiplier(EMPTY_LOADOUT)).toBe(1);
    expect(getEquipmentHpMultiplier(EMPTY_LOADOUT)).toBe(1);
    expect(getEquipmentRecoveryPctBonus(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentWaveStartShieldPct(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentDamageReductionPct(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentTankBlockCapacityBonus(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentRepositionBonus(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentFateEnergyMaxBonus(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentSummonCostReduction(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentFreeMergeChance(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentComboUpgradeChance(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentProtectedDieCount(EMPTY_LOADOUT)).toBe(0);
    expect(getEquipmentChainLightningProcChance(EMPTY_LOADOUT)).toBe(0);
  });

  it("攻速／暴擊傷害／Boss傷害／生命 都是 1 + 原始值", () => {
    const geared: EquipmentLoadout = { ...EMPTY_LOADOUT, attackSpeedMultiplier: 0.08, critDamageMultiplier: 0.5, bossDamageMultiplier: 0.25, hpMultiplier: 0.05 };
    expect(getEquipmentAttackSpeedMultiplier(geared)).toBeCloseTo(1.08);
    expect(getEquipmentCritDamageFactor(geared)).toBeCloseTo(1.5);
    expect(getEquipmentBossDamageMultiplier(geared)).toBeCloseTo(1.25);
    expect(getEquipmentHpMultiplier(geared)).toBeCloseTo(1.05);
  });

  it("減傷比例上限為 90%，且不會是負值", () => {
    expect(getEquipmentDamageReductionPct({ ...EMPTY_LOADOUT, damageReductionPct: 0.99 })).toBe(0.9);
    expect(getEquipmentDamageReductionPct({ ...EMPTY_LOADOUT, damageReductionPct: -0.2 })).toBe(0);
  });

  it("保護骰數會四捨五入且不小於 0", () => {
    expect(getEquipmentProtectedDieCount({ ...EMPTY_LOADOUT, protectedDieCount: 1.4 })).toBe(1);
    expect(getEquipmentProtectedDieCount({ ...EMPTY_LOADOUT, protectedDieCount: 1.6 })).toBe(2);
    expect(getEquipmentProtectedDieCount({ ...EMPTY_LOADOUT, protectedDieCount: -1 })).toBe(0);
  });
});
