import { describe, expect, it } from "vitest";
import { ENEMY_DEFINITIONS } from "./enemies";
import { WAVE_DEFINITIONS } from "./waves";

describe("WAVE_DEFINITIONS", () => {
  it("有 10 個標準 Wave，編號連續", () => {
    expect(WAVE_DEFINITIONS).toHaveLength(10);
    WAVE_DEFINITIONS.forEach((wave, index) => expect(wave.waveNumber).toBe(index + 1));
  });

  it("每個 Wave 引用的 enemyId 都存在於 ENEMY_DEFINITIONS", () => {
    WAVE_DEFINITIONS.forEach((wave) => {
      wave.batches.forEach((batch) => batch.entries.forEach((entry) => {
        expect(ENEMY_DEFINITIONS[entry.enemyId], `${entry.enemyId} missing from ENEMY_DEFINITIONS`).toBeDefined();
      }));
    });
  });

  it("兩路不是永遠固定同一組（六節要求）", () => {
    const routeSets = WAVE_DEFINITIONS.map((wave) => wave.activeRoutes.join(","));
    expect(new Set(routeSets).size).toBeGreaterThan(1);
  });

  it("第 10 波是 Boss，附帶 Encounter Script", () => {
    const finalWave = WAVE_DEFINITIONS[9];
    expect(finalWave.bossEncounter?.bossEnemyId).toBe("boss");
    expect(finalWave.bossEncounter?.phases.length).toBeGreaterThanOrEqual(2);
  });

  it("寬體敵人（Width>=2）的 Spawn 條目佔據多條 Route", () => {
    const eliteEntry = WAVE_DEFINITIONS[3].batches[0].entries.find((entry) => entry.enemyId === "eliteGiant");
    expect(eliteEntry?.routes).toEqual([2, 3]);
  });
});
