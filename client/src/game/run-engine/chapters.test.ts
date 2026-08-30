import { describe, expect, it } from "vitest";
import { CHAPTER_IDS } from "../types";
import { ENEMY_DEFINITIONS } from "./enemies";
import { getWaveDefinition } from "./orchestrator";
import { WAVES_BATTLEFIELD, WAVES_BY_CHAPTER, WAVES_MOONLIT } from "./waves";

describe("WAVES_BY_CHAPTER (遠征輿圖 v1)", () => {
  it("涵蓋 CHAPTER_IDS 定義的每一章，且每章恰好 10 波、編號連續", () => {
    CHAPTER_IDS.forEach((chapterId) => {
      const waves = WAVES_BY_CHAPTER[chapterId];
      expect(waves, chapterId).toHaveLength(10);
      waves.forEach((wave, index) => expect(wave.waveNumber).toBe(index + 1));
    });
  });

  it("每一章、每個 Wave 引用的 enemyId 都存在於 ENEMY_DEFINITIONS", () => {
    CHAPTER_IDS.forEach((chapterId) => {
      WAVES_BY_CHAPTER[chapterId].forEach((wave) => {
        wave.batches.forEach((batch) => batch.entries.forEach((entry) => {
          expect(ENEMY_DEFINITIONS[entry.enemyId], `${chapterId}/${entry.enemyId} missing from ENEMY_DEFINITIONS`).toBeDefined();
        }));
        wave.bossEncounter?.phases.forEach((phase) => phase.summons?.entries.forEach((entry) => {
          expect(ENEMY_DEFINITIONS[entry.enemyId], `${chapterId}/${entry.enemyId} (boss summon) missing from ENEMY_DEFINITIONS`).toBeDefined();
        }));
      });
    });
  });

  it("每一章第 10 波都是 Boss，且沿用前一章的 Boss enemyId", () => {
    expect(WAVES_BATTLEFIELD[9].bossEncounter?.bossEnemyId).toBe("fogSovereign");
    expect(WAVES_MOONLIT[9].bossEncounter?.bossEnemyId).toBe("silverMoonArbiter");
  });

  it("難度曲線：每章 Boss HP 相對前一章遞增（沿用既有 Wave10 首領量表）", () => {
    const bossHp = (chapterId: (typeof CHAPTER_IDS)[number]) => {
      const bossId = WAVES_BY_CHAPTER[chapterId][9].bossEncounter!.bossEnemyId;
      return ENEMY_DEFINITIONS[bossId].baseHp;
    };
    const courtyard = bossHp("courtyard");
    const battlefield = bossHp("battlefield");
    const moonlit = bossHp("moonlit");
    expect(battlefield).toBeGreaterThan(courtyard);
    expect(moonlit).toBeGreaterThan(battlefield);
  });

  it("第三章首領（銀月裁決者）是全戰役第一個 3 階段 Boss", () => {
    expect(WAVES_MOONLIT[9].bossEncounter?.phases.length).toBe(3);
    expect(WAVES_BATTLEFIELD[9].bossEncounter?.phases.length).toBe(2);
  });

  it("第三章第 3 波首次出現 siege 標籤的一般敵人（破城重炮兵）", () => {
    expect(ENEMY_DEFINITIONS.siegeBombardier.siege).toBe(true);
    expect(ENEMY_DEFINITIONS.siegeBombardier.tags).toContain("siege");
    const wave3 = WAVES_MOONLIT[2];
    expect(wave3.batches[0].entries.some((entry) => entry.enemyId === "siegeBombardier")).toBe(true);
  });

  it("getWaveDefinition 依 chapterId 解析對應章節的波次", () => {
    expect(getWaveDefinition("battlefield", 1)?.batches[0].entries[0].enemyId).toBe("mistStalker");
    expect(getWaveDefinition("moonlit", 1)?.batches[0].entries[0].enemyId).toBe("nightowlSniper");
    expect(getWaveDefinition("courtyard", 1)?.batches[0].entries[0].enemyId).toBe("slime");
  });

  it("寬體 elite（Width>=2）的 Spawn 條目在每章都佔據多條 Route", () => {
    const battlefieldElite = WAVES_BATTLEFIELD[3].batches[0].entries.find((entry) => entry.enemyId === "glacialColossus");
    expect(battlefieldElite?.routes).toEqual([2, 3]);
    const moonlitElite = WAVES_MOONLIT[3].batches[0].entries.find((entry) => entry.enemyId === "silverMoonEnforcer");
    expect(moonlitElite?.routes).toEqual([1, 3]);
  });
});
