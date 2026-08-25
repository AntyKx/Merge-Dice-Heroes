import { describe, expect, it } from "vitest";
import type { BlessingDefinition } from "../types";
import { applyBlessingChoice, generateBlessingChoices, hasBlessing } from "./blessing";

function makeBlessing(id: string, relatedHeroIds?: BlessingDefinition["relatedHeroIds"]): BlessingDefinition {
  return { id, ruleChange: { effectId: `${id}.effect` }, relatedHeroIds };
}

describe("blessing ownership", () => {
  it("Blessing 沒有等級，選過就直接完整持有", () => {
    const owned = applyBlessingChoice([], "double-fate");
    expect(hasBlessing(owned, "double-fate")).toBe(true);
  });

  it("已持有的 Blessing 再次套用不會重複", () => {
    const owned = applyBlessingChoice(["double-fate"], "double-fate");
    expect(owned).toEqual(["double-fate"]);
  });
});

describe("generateBlessingChoices", () => {
  it("已持有的 Blessing 不會再出現在候選中", () => {
    const pool = [makeBlessing("a"), makeBlessing("b"), makeBlessing("c"), makeBlessing("d")];
    const choices = generateBlessingChoices(pool, ["a"], [], "knight", () => 0);
    expect(choices.map((b) => b.id)).not.toContain("a");
  });

  it("有相關候選時，至少保證一個與目前 Build 相關", () => {
    const pool = [makeBlessing("unrelated-1"), makeBlessing("unrelated-2"), makeBlessing("related", ["fireMage"])];
    const choices = generateBlessingChoices(pool, [], ["fireMage"], "knight", () => 0);
    expect(choices.map((b) => b.id)).toContain("related");
  });

  it("最多回傳 3 個候選", () => {
    const pool = [makeBlessing("a"), makeBlessing("b"), makeBlessing("c"), makeBlessing("d"), makeBlessing("e")];
    const choices = generateBlessingChoices(pool, [], [], "knight", () => 0.5);
    expect(choices).toHaveLength(3);
  });
});
