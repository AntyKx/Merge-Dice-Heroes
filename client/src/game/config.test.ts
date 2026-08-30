import { describe, expect, it } from "vitest";
import { DUNGEONS, EMPTY_EQUIPMENT_BONUSES, EQUIPMENT, getEquipmentBonuses, mergeEquipmentBonuses } from "./config";
import { WAVES_BY_CHAPTER } from "./run-engine/waves";
import type { EquipmentId, EquipmentSlot } from "./types";

describe("mergeEquipmentBonuses", () => {
  it("把 partial 的每個欄位加到 total 上", () => {
    const total = mergeEquipmentBonuses(EMPTY_EQUIPMENT_BONUSES, { attackMultiplier: 0.1, castleBonus: 2 });
    expect(total.attackMultiplier).toBe(0.1);
    expect(total.castleBonus).toBe(2);
    expect(total.extraRerolls).toBe(0);
  });

  it("scale 會等比例縮放 partial 再加總（用於 upgradeBonus * (level-1)）", () => {
    const total = mergeEquipmentBonuses(EMPTY_EQUIPMENT_BONUSES, { attackMultiplier: 0.02 }, 4);
    expect(total.attackMultiplier).toBeCloseTo(0.08);
  });

  it("partial 為 undefined 時原樣回傳 total", () => {
    const total = mergeEquipmentBonuses(EMPTY_EQUIPMENT_BONUSES, undefined);
    expect(total).toEqual(EMPTY_EQUIPMENT_BONUSES);
  });

  it("值為 0 的欄位不會覆蓋既有累加（避免 0*scale 蓋掉前面已疊加的量）", () => {
    const withBase = mergeEquipmentBonuses(EMPTY_EQUIPMENT_BONUSES, { attackMultiplier: 0.05 });
    const total = mergeEquipmentBonuses(withBase, { attackMultiplier: 0 });
    expect(total.attackMultiplier).toBeCloseTo(0.05);
  });
});

describe("getEquipmentBonuses", () => {
  it("加總已裝備物品的 bonuses，並依等級疊加 upgradeBonus * (level-1)", () => {
    const equipped: Partial<Record<EquipmentSlot, EquipmentId>> = { weapon: "morningBlade" };
    const level1 = getEquipmentBonuses(equipped, { morningBlade: 1 });
    expect(level1.attackMultiplier).toBeCloseTo(0.08);
    const level3 = getEquipmentBonuses(equipped, { morningBlade: 3 });
    expect(level3.attackMultiplier).toBeCloseTo(0.08 + 0.025 * 2);
  });

  it("多個欄位的裝備各自的加成會加總", () => {
    const equipped: Partial<Record<EquipmentSlot, EquipmentId>> = { weapon: "morningBlade", armor: "watcherCloak", relic: "fateDiceBox" };
    const total = getEquipmentBonuses(equipped, { morningBlade: 1, watcherCloak: 1, fateDiceBox: 1 });
    expect(total.attackMultiplier).toBeCloseTo(0.08);
    expect(total.castleBonus).toBe(3);
    expect(total.extraRerolls).toBe(1);
  });

  it("職業傾向裝備（roleBonus）不計入這裡（改由 defaultMetaAdapter.ts 依隊伍組成解析）", () => {
    const equipped: Partial<Record<EquipmentSlot, EquipmentId>> = { weapon: "vengeanceGauntlets" };
    const total = getEquipmentBonuses(equipped, { vengeanceGauntlets: 1 });
    expect(total).toEqual(EMPTY_EQUIPMENT_BONUSES);
  });

  it("空欄位（未裝備）不會出錯，回傳全 0", () => {
    expect(getEquipmentBonuses({})).toEqual(EMPTY_EQUIPMENT_BONUSES);
  });
});

describe("EQUIPMENT roster", () => {
  it("每件職業傾向裝備的 roleBonus.role 都對應到一個實際存在的英雄職業", () => {
    const knownRoles = new Set(["tank", "melee", "assassin", "ranged", "support"]);
    Object.values(EQUIPMENT).forEach((item) => {
      if (item.roleBonus) expect(knownRoles.has(item.roleBonus.role)).toBe(true);
    });
  });

  it("id 與其在 Record 中的 key 一致", () => {
    (Object.keys(EQUIPMENT) as EquipmentId[]).forEach((id) => expect(EQUIPMENT[id].id).toBe(id));
  });
});

describe("DUNGEONS roster (深域狩令 v1)", () => {
  it("每道副本的 chapterId + startWave 都能在 WAVES_BY_CHAPTER 查到真實波次，不會讓 confirmFormation 靜默 no-op", () => {
    DUNGEONS.forEach((dungeon) => {
      const waves = WAVES_BY_CHAPTER[dungeon.chapterId];
      expect(waves, dungeon.id).toBeDefined();
      expect(dungeon.startWave, dungeon.id).toBeGreaterThanOrEqual(1);
      expect(dungeon.startWave, dungeon.id).toBeLessThanOrEqual(waves.length);
    });
  });

  it("每道副本的掉落只能是既有裝備裡的「遺物」（slot === relic），符合設計規則", () => {
    DUNGEONS.forEach((dungeon) => {
      const equipmentId = dungeon.reward.equipmentId;
      expect(equipmentId, dungeon.id).toBeDefined();
      expect(EQUIPMENT[equipmentId!], `${dungeon.id} -> ${equipmentId}`).toBeDefined();
      expect(EQUIPMENT[equipmentId!].slot, `${dungeon.id} -> ${equipmentId}`).toBe("relic");
    });
  });

  it("解鎖鏈是單一線性序列：只有第一道預設解鎖，其餘都要靠前一道通關", () => {
    expect(DUNGEONS[0].unlocked).toBe(true);
    DUNGEONS.slice(1).forEach((dungeon) => expect(dungeon.unlocked, dungeon.id).toBe(false));
  });

  it("id 與其在陣列中的內容一致，且沒有重複 id", () => {
    const ids = DUNGEONS.map((dungeon) => dungeon.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
