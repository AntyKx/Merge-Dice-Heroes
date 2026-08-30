/**
 * Signature Weapon roster (素材/軍需官密卷's 英雄專武能力), one entry per hero,
 * consumed by orchestrator.ts's effectiveHeroDefinition via
 * rules/signatureWeapon.ts's applySignatureWeapon.
 *
 * Acquisition (fragments/exchange/events) is still explicitly out of scope, per
 * rules/signatureWeapon.ts's own doc comment -- there is no economy to gate
 * these behind yet, so defaultMetaAdapter.ts currently reports every hero's
 * signatureWeaponUnlocked as true so the abilities are actually observable in
 * play instead of shipping as inert data. Swap that flag to a real unlock check
 * once a Signature Weapon acquisition system exists; nothing here needs to
 * change when that happens.
 *
 * 4 of the 10 (fighter/assassin/ranger, plus none needing a new resolver) only
 * touch the patch's existing numeric fields (extraRangeAlongRoute/
 * extraCoverageZoneSpan) -- the other 6 point at a new effectId registered in
 * heroes.ts's HERO_EFFECT_REGISTRY, following the exact same resolver pattern
 * every hero's base autoSkill/trait already uses.
 */
import type { HeroId } from "../types";
import type { SignatureWeaponDefinition } from "./rules/signatureWeapon";

export const SIGNATURE_WEAPONS: Partial<Record<HeroId, SignatureWeaponDefinition>> = {
  knight: { id: "kingsguardEmblem", heroId: "knight", patch: { traitEffectId: "knight.kingsguardEmblem" } },
  deathKnight: { id: "soulrendFlourish", heroId: "deathKnight", patch: { autoSkillEffectId: "deathKnight.soulrendFlourish" } },
  fighter: { id: "breakersFist", heroId: "fighter", patch: { extraRangeAlongRoute: 0.15 } },
  assassin: { id: "thousandfoldStep", heroId: "assassin", patch: { extraCoverageZoneSpan: 1 } },
  fireMage: { id: "cinderheartCore", heroId: "fireMage", patch: { autoSkillEffectId: "fireMage.cinderheartCore" } },
  frostQueen: { id: "eternalFrostScepter", heroId: "frostQueen", patch: { traitEffectId: "frostQueen.eternalFrostScepter" } },
  ranger: { id: "galewindBow", heroId: "ranger", patch: { extraRangeAlongRoute: 0.1 } },
  engineer: { id: "overloadCore", heroId: "engineer", patch: { autoSkillEffectId: "engineer.overloadCore" } },
  priest: { id: "sunlightCrozier", heroId: "priest", patch: { traitEffectId: "priest.sunlightCrozier" } },
  bard: { id: "undyingVerse", heroId: "bard", patch: { traitEffectId: "bard.undyingVerse" } },
};
