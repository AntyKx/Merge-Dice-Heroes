/**
 * Starter Blessing (Core Blessing) Pool (Phase 9), per 玩法核心.txt 三十二.
 *
 * Same "small starter set, not the full content pass" scope decision as
 * talents.ts -- proves generateBlessingChoices()/applyBlessingChoice() end-to-end.
 * Effect resolution (what a ruleChange.effectId actually rewrites) is out of
 * scope here, same opaque-id-through-a-future-registry pattern as everything else.
 */
import type { BlessingDefinition } from "./types";

export const BLESSING_POOL: BlessingDefinition[] = [
  { id: "twoMergeAlways", ruleChange: { effectId: "blessing.twoMergeAlways" } },
  { id: "wideBoard", ruleChange: { effectId: "blessing.wideBoard" } },
  { id: "energyOverflow", ruleChange: { effectId: "blessing.energyOverflow" } },
  { id: "castleFortify", ruleChange: { effectId: "blessing.castleFortify" } },
  { id: "fireStorm", ruleChange: { effectId: "blessing.fireStorm" }, relatedHeroIds: ["fireMage"] },
  { id: "guardianOath", ruleChange: { effectId: "blessing.guardianOath" }, relatedHeroIds: ["knight", "deathKnight"] },
];
