/**
 * Hero Signature Weapon hook (Phase 8), per 玩法核心.txt 三十六.
 *
 * Separate from Team Equipment. A hero is 100% functionally complete without a
 * Signature Weapon (三十六: "沒有專武，角色仍然 100% 功能完整") -- applySignature-
 * Weapon() below only ever PATCHES an already-complete HeroDefinition, never
 * fills in something required. Acquisition (fragments/exchange/events) is meta/
 * economy content and stays out of scope this round; MetaProgressionAdapter's
 * HeroMetaSnapshot.signatureWeaponUnlocked already exists as the (currently
 * always-false) hook point from Phase 2 -- this is where it finally gets
 * consumed. First unlock grants the FULL effect immediately (三十六: "不要求再
 * 抽 5 把才完整"), so there's no partial/leveled state to model here at all.
 */
import type { HeroDefinition } from "../types";

export interface SignatureWeaponDefinition {
  id: string;
  heroId: HeroDefinition["id"];
  /** Only the fields actually being overridden are set -- everything else keeps
   * the hero's normal (专武-less) behavior, per 三十六's "不要做沒有專武 XXX 就
   * 不能 YYY" constraint applying in reverse too: a Signature Weapon should only
   * ADD, never be a prerequisite disguised as a patch. */
  patch: {
    autoSkillEffectId?: string;
    traitEffectId?: string;
    extraCoverageZoneSpan?: number;
    extraRangeAlongRoute?: number;
  };
}

export function applySignatureWeapon(definition: HeroDefinition, unlocked: boolean, signatureWeapon: SignatureWeaponDefinition | undefined): HeroDefinition {
  if (!unlocked || !signatureWeapon || signatureWeapon.heroId !== definition.id) return definition;
  const { patch } = signatureWeapon;
  return {
    ...definition,
    autoSkill: patch.autoSkillEffectId ? { ...definition.autoSkill, effectId: patch.autoSkillEffectId } : definition.autoSkill,
    trait: patch.traitEffectId ? { ...definition.trait, effectId: patch.traitEffectId } : definition.trait,
    coverage: patch.extraCoverageZoneSpan ? { ...definition.coverage, maxZoneSpan: definition.coverage.maxZoneSpan + patch.extraCoverageZoneSpan } : definition.coverage,
    rangeAlongRoute: patch.extraRangeAlongRoute ? Math.min(1, definition.rangeAlongRoute + patch.extraRangeAlongRoute) : definition.rangeAlongRoute,
  };
}
