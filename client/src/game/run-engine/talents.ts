/**
 * Starter Talent Pool (Phase 9), per 玩法核心.txt 三十/三十一.
 *
 * The doc explicitly says the first version doesn't need all 18-24 at once
 * ("第一版不需要一次做 50 個... 先做 18~24 個通用 Talent + 每英雄少量專屬 Talent
 * 即可") -- this is a small starter set (general Dice/Resource/Reposition/Combat
 * Talents plus one per-hero example) proving generateTalentChoices()/
 * applyTalentChoice() work end-to-end. Effect resolution (what talent.lv2/lv3
 * effectIds actually DO) is out of scope for this pass -- they're opaque ids,
 * same pattern as Hero Auto Skills, ready for a TalentEffectRegistry once real
 * content-balancing work starts.
 */
import type { TalentDefinition } from "./types";

export const TALENT_POOL: TalentDefinition[] = [
  { id: "extraReroll", category: "dice", levels: [{ level: 1, effectId: "extraReroll.lv1" }, { level: 2, effectId: "extraReroll.lv2" }, { level: 3, effectId: "extraReroll.lv3" }] },
  { id: "sixPower", category: "dice", levels: [{ level: 1, effectId: "sixPower.lv1" }, { level: 2, effectId: "sixPower.lv2" }, { level: 3, effectId: "sixPower.lv3" }] },
  { id: "mergeBurst", category: "merge", levels: [{ level: 1, effectId: "mergeBurst.lv1" }, { level: 2, effectId: "mergeBurst.lv2" }, { level: 3, effectId: "mergeBurst.lv3" }] },
  { id: "mergeShield", category: "merge", levels: [{ level: 1, effectId: "mergeShield.lv1" }, { level: 2, effectId: "mergeShield.lv2" }, { level: 3, effectId: "mergeShield.lv3" }] },
  { id: "tempoT1", category: "combat", levels: [{ level: 1, effectId: "tempoT1.lv1" }, { level: 2, effectId: "tempoT1.lv2" }, { level: 3, effectId: "tempoT1.lv3" }] },
  { id: "extraReposition", category: "reposition", levels: [{ level: 1, effectId: "extraReposition.lv1" }, { level: 2, effectId: "extraReposition.lv2" }, { level: 3, effectId: "extraReposition.lv3" }] },
  { id: "fireCraft", category: "heroSpecific", relatedHeroIds: ["fireMage"], levels: [{ level: 1, effectId: "fireCraft.lv1" }, { level: 2, effectId: "fireCraft.lv2" }, { level: 3, effectId: "fireCraft.lv3" }] },
  { id: "shieldWall", category: "heroSpecific", relatedHeroIds: ["knight", "deathKnight"], levels: [{ level: 1, effectId: "shieldWall.lv1" }, { level: 2, effectId: "shieldWall.lv2" }, { level: 3, effectId: "shieldWall.lv3" }] },
];
