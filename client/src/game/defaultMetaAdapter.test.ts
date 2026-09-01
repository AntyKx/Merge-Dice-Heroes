import { describe, expect, it } from "vitest";
import { createDefaultMetaAdapter } from "./defaultMetaAdapter";
import { defaultProgress } from "./persistence";
import type { PlayerProgress } from "./types";

function progressWithEquipped(equipped: PlayerProgress["equipped"]): PlayerProgress {
  return { ...defaultProgress, equipped, equipmentLevels: { ...defaultProgress.equipmentLevels, vengeanceGauntlets: 1 } };
}

describe("createDefaultMetaAdapter -- role-leaning equipment resolution", () => {
  it("隊伍含有對應職業時套用 roleBonus.bonus", () => {
    const adapter = createDefaultMetaAdapter(progressWithEquipped({ weapon: "vengeanceGauntlets" }));
    const loadout = adapter.getEquipmentLoadout(["knight", "ranger", "priest"]); // knight = tank
    expect(loadout.attackMultiplier).toBeCloseTo(0.2);
  });

  it("隊伍沒有對應職業時改套用 roleBonus.fallback", () => {
    const adapter = createDefaultMetaAdapter(progressWithEquipped({ weapon: "vengeanceGauntlets" }));
    const loadout = adapter.getEquipmentLoadout(["ranger", "priest", "bard"]); // 無 tank
    expect(loadout.attackMultiplier).toBeCloseTo(0.05);
  });

  it("升級等級會讓 roleBonus 額外 +10%/級", () => {
    const progress = { ...progressWithEquipped({ weapon: "vengeanceGauntlets" }), equipmentLevels: { ...defaultProgress.equipmentLevels, vengeanceGauntlets: 3 } };
    const adapter = createDefaultMetaAdapter(progress);
    const loadout = adapter.getEquipmentLoadout(["knight"]);
    expect(loadout.attackMultiplier).toBeCloseTo(0.2 * 1.2);
  });

  it("一般共用裝備完全不受隊伍組成影響", () => {
    const adapter = createDefaultMetaAdapter(progressWithEquipped({ weapon: "ironedgeBlade" }));
    const withTank = adapter.getEquipmentLoadout(["knight"]);
    const withoutTank = adapter.getEquipmentLoadout(["ranger"]);
    expect(withTank.attackMultiplier).toBeCloseTo(withoutTank.attackMultiplier);
    expect(withTank.attackMultiplier).toBeCloseTo(0.05);
  });

  it("getHeroSnapshot 目前回傳 signatureWeaponUnlocked: true（尚無取得經濟，先全數開放）", () => {
    const adapter = createDefaultMetaAdapter(defaultProgress);
    expect(adapter.getHeroSnapshot("knight").signatureWeaponUnlocked).toBe(true);
  });
});
