import { describe, expect, it } from "vitest";
import type { TalentDefinition } from "../types";
import { applyTalentChoice, generateTalentChoices, getTalentEffectId, getTalentLevel, isTalentMaxed } from "./talent";

function makeTalent(id: string, relatedHeroIds?: TalentDefinition["relatedHeroIds"]): TalentDefinition {
  return {
    id,
    category: "combat",
    levels: [{ level: 1, effectId: `${id}.lv1` }, { level: 2, effectId: `${id}.lv2` }, { level: 3, effectId: `${id}.lv3` }],
    relatedHeroIds,
  };
}

describe("talent level state", () => {
  it("applyTalentChoice 新增為 Lv1，再選一次升到 Lv2/Lv3", () => {
    let talents = applyTalentChoice([], "t1");
    expect(getTalentLevel(talents, "t1")).toBe(1);
    talents = applyTalentChoice(talents, "t1");
    expect(getTalentLevel(talents, "t1")).toBe(2);
    talents = applyTalentChoice(talents, "t1");
    expect(getTalentLevel(talents, "t1")).toBe(3);
    expect(isTalentMaxed(talents, "t1")).toBe(true);
  });

  it("已 MAX 的天賦再選不會超過 Lv3", () => {
    const maxed = [{ talentId: "t1", level: 3 as const }];
    expect(applyTalentChoice(maxed, "t1")).toEqual(maxed);
  });

  it("getTalentEffectId 依 Level 取對應 effectId（Lv2/Lv3 可以是不同 effect）", () => {
    const definition = makeTalent("t1");
    expect(getTalentEffectId(definition, 1)).toBe("t1.lv1");
    expect(getTalentEffectId(definition, 3)).toBe("t1.lv3");
  });
});

describe("generateTalentChoices", () => {
  it("已 MAX 的天賦不會再出現在候選中", () => {
    const pool = [makeTalent("t1"), makeTalent("t2")];
    const currentTalents = [{ talentId: "t1", level: 3 as const }];
    const choices = generateTalentChoices(pool, currentTalents, [], "knight", () => 0);
    expect(choices.map((t) => t.id)).not.toContain("t1");
  });

  it("三選一優先組成：已持有升級 / 同 Build 新天賦 / 不同方向新天賦", () => {
    const pool = [
      makeTalent("owned-upgrade"),
      makeTalent("related-new", ["fireMage"]),
      makeTalent("unrelated-new"),
    ];
    const currentTalents = [{ talentId: "owned-upgrade", level: 1 as const }];
    const choices = generateTalentChoices(pool, currentTalents, ["fireMage", "priest"], "knight", () => 0);
    expect(choices.map((t) => t.id).sort()).toEqual(["owned-upgrade", "related-new", "unrelated-new"]);
  });

  it("候選池不足三個分類時，會從剩餘候選補滿", () => {
    const pool = [makeTalent("only-one")];
    const choices = generateTalentChoices(pool, [], [], "knight", () => 0);
    expect(choices).toHaveLength(1);
  });

  it("候選池完全空時回傳空陣列", () => {
    expect(generateTalentChoices([], [], [], "knight", () => 0)).toEqual([]);
  });
});
