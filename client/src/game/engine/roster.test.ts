import { describe, expect, it } from "vitest";
import { HEROES } from "../config";
import { createRun, resolveDice } from "./run";

describe("expanded hero roster", () => {
  it("exposes all eleven playable professions", () => {
    expect(Object.keys(HEROES)).toHaveLength(11);
    expect(HEROES.assassin.name).toBe("暗影刺客");
    expect(HEROES.frostQueen.role).toBe("area");
  });

  it("resolves a new profession leader skill through a four-of-a-kind", () => {
    const run = createRun(["ranger", "engineer", "assassin"], "assassin", () => 0.25);
    const withTarget = {
      ...run,
      combat: {
        ...run.combat,
        enemies: [{ id: "slime-test", enemyId: "slime" as const, hp: 240, maxHp: 240, pathProgress: 0.7, cooldown: 0 }],
        pendingEnemies: [],
      },
      dice: { ...run.dice, values: [4, 4, 4, 4, 2] },
    };
    const resolved = resolveDice(withTarget, () => 0.25);
    expect(resolved.message).toContain("夜幕處決");
    expect(resolved.combat.enemies[0].hp).toBe(55);
  });
});
