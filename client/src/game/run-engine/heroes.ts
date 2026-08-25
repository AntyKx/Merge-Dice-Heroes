/**
 * Hero Config (Phase 6b), per 玩法核心.txt 十二、目前英雄 Tier 方向.
 *
 * Covers all 10 selectable heroes (Knight/DeathKnight/Fighter/Assassin/FireMage/
 * FrostQueen/Ranger/Engineer/Priest/Bard). Each hero gets exactly one Basic Attack
 * + one Auto Skill + one Trait, per 十四 ("不要每英雄一次做 Skill1/2/3/Ultimate/
 * PassiveA/B"). T2/T3 behavior changes are expressed as qualitative branches inside
 * the SAME resolver (checking self.tier) rather than a growing number of separate
 * effectIds, keeping the registry at exactly 20 entries (10 heroes x 2 slots).
 *
 * All numeric magnitudes below are tentative balance values (十一/三十九) and
 * belong in RUN_ENGINE_CONFIG in spirit -- they're inlined here for now since they
 * are genuinely hero-specific (unlike the shared tier multiplier), but should move
 * to a per-hero config block once real playtesting starts.
 */
import type { HeroDefinition } from "./types";
import type { HeroId } from "../types";
import type { CombatEffectContext, CombatEffectRegistry, CombatEffectResolver } from "./rules/combat";
import { getTierStatMultiplier } from "./rules/combat";

function lowestHpRatioAllies(context: CombatEffectContext, count: number) {
  return [...context.allySupportPool].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, count);
}

function priorityEnemyTargets(context: CombatEffectContext, count: number) {
  return [...context.enemyTargetPool].sort((a, b) => b.pathProgress - a.pathProgress).slice(0, count);
}

// ---------------------------------------------------------------------------
// Knight -- Tank. 十二【Knight】
// ---------------------------------------------------------------------------

const knightShieldOnBlock: CombatEffectResolver = (context) => {
  const magnitude = 15 * getTierStatMultiplier(context.selfDefinition, context.self.tier);
  return { shieldToAllies: [{ instanceId: context.self.instanceId, amount: magnitude }] };
};

const knightIronWill: CombatEffectResolver = (context) => {
  // T3 trait: guarding grants a small ongoing self-shield tick regardless of
  // whether a new enemy was just blocked (十二's "定位:保護隊友" baseline).
  const magnitude = context.self.tier === 3 ? 6 : 3;
  return { shieldToAllies: [{ instanceId: context.self.instanceId, amount: magnitude }] };
};

// ---------------------------------------------------------------------------
// Death Knight -- offensive front-liner. 十二【Death Knight】
// ---------------------------------------------------------------------------

const deathKnightShadowStrike: CombatEffectResolver = (context) => {
  // T1/T2: no bonus proc (still "攻防混合" via Basic Attack + lifesteal trait
  // alone). T3: killing a blocked enemy (condition trigger) unleashes a Shadow
  // Strike on the next-priority target.
  if (context.self.tier < 3) return {};
  const target = priorityEnemyTargets(context, 1)[0];
  if (!target) return {};
  const amount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier) * 0.8;
  return { damageToEnemies: [{ instanceId: target.instanceId, amount }] };
};

const deathKnightBloodpact: CombatEffectResolver = (context) => {
  // T1: no lifesteal yet. T2+: a portion of Basic Attack damage heals self on kill
  // -- approximated here as a small guaranteed self-heal tick (real "on kill" hook
  // needs the orchestrator to call this after a kill is confirmed, Phase 9).
  if (context.self.tier < 2) return {};
  const amount = context.self.maxHp * (context.self.tier === 3 ? 0.06 : 0.03);
  return { healToAllies: [{ instanceId: context.self.instanceId, amount }] };
};

// ---------------------------------------------------------------------------
// Fighter -- melee combo DPS. 十二【Fighter】
// ---------------------------------------------------------------------------

const fighterHeavyStrike: CombatEffectResolver = (context) => {
  const target = priorityEnemyTargets(context, 1)[0];
  if (!target) return {};
  const amount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier) * 1.4;
  return { damageToEnemies: [{ instanceId: target.instanceId, amount }] };
};

const fighterRhythmTrait: CombatEffectResolver = (context) => {
  // T3: combo completion sends a shockwave that also hits the adjacent Route's
  // nearest target ("可影響相鄰道路"). T1/T2 are Basic-Attack-only otherwise.
  if (context.self.tier < 3) return {};
  const targets = priorityEnemyTargets(context, 2);
  const amount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier) * 0.5;
  return { damageToEnemies: targets.map((target) => ({ instanceId: target.instanceId, amount })) };
};

// ---------------------------------------------------------------------------
// Assassin -- Block 0, mobile executioner. 十二【Assassin】
// ---------------------------------------------------------------------------

const assassinHuntDash: CombatEffectResolver = (context) => {
  // "突進其他防區" is expressed via wide coverage (see coverage.maxZoneSpan by
  // tier below), not an actual board move -- 棋盤位置不改變 (十二). This resolver
  // just picks the lowest-HP-ratio (highest priority execute) target in that
  // already-wide pool.
  const target = [...context.enemyTargetPool].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (!target) return {};
  const amount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier) * 1.6;
  return { damageToEnemies: [{ instanceId: target.instanceId, amount }] };
};

const assassinExecutionerTrait: CombatEffectResolver = (context) => {
  // T3: killing blow triggers a follow-up strike on the next-lowest-HP target.
  if (context.self.tier < 3) return {};
  const target = [...context.enemyTargetPool].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (!target) return {};
  const amount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier) * 0.7;
  return { damageToEnemies: [{ instanceId: target.instanceId, amount }] };
};

// ---------------------------------------------------------------------------
// Fire Mage -- AoE. 十二【Fire Mage】
// ---------------------------------------------------------------------------

const fireMageFlameBurst: CombatEffectResolver = (context) => {
  const primary = priorityEnemyTargets(context, 1)[0];
  if (!primary) return {};
  const baseAmount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier);
  if (context.self.tier === 1) return { damageToEnemies: [{ instanceId: primary.instanceId, amount: baseAmount }] };
  // T2+: small splash onto other nearby targets in the same pool.
  const splashTargets = priorityEnemyTargets(context, context.self.tier === 3 ? 3 : 2).filter((enemy) => enemy.instanceId !== primary.instanceId);
  return {
    damageToEnemies: [
      { instanceId: primary.instanceId, amount: baseAmount },
      ...splashTargets.map((target) => ({ instanceId: target.instanceId, amount: baseAmount * 0.5 })),
    ],
  };
};

const fireMageIgniteTrait: CombatEffectResolver = (context) => {
  // T3: burning + death-chain explosion, approximated as a DoT-style debuff on the
  // primary target (a real DoT tick belongs to the Phase 9 orchestrator's status
  // resolution loop; this only stamps the debuff).
  if (context.self.tier < 3) return {};
  const target = priorityEnemyTargets(context, 1)[0];
  if (!target) return {};
  return { debuffToEnemies: [{ instanceId: target.instanceId, statusId: "burning", magnitude: context.selfDefinition.baseAttack * 0.3, durationMs: 3000 }] };
};

// ---------------------------------------------------------------------------
// Frost Queen -- AoE control. 十二【Frost Queen】
// ---------------------------------------------------------------------------

const frostQueenChill: CombatEffectResolver = (context) => {
  const target = priorityEnemyTargets(context, 1)[0];
  if (!target) return {};
  const amount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier);
  return { damageToEnemies: [{ instanceId: target.instanceId, amount }], debuffToEnemies: [{ instanceId: target.instanceId, statusId: "slow", magnitude: 0.2, durationMs: 2000 }] };
};

const frostQueenFreezeTrait: CombatEffectResolver = (context) => {
  // T2: frost zone slows multiple targets. T3: accumulated cold can Freeze --
  // actual Slow Cap / Freeze Immunity bookkeeping is rules/status.ts's job at the
  // orchestrator level, this resolver only stamps the debuff.
  if (context.self.tier < 2) return {};
  const count = context.self.tier === 3 ? 4 : 2;
  return { debuffToEnemies: priorityEnemyTargets(context, count).map((target) => ({ instanceId: target.instanceId, statusId: "slow", magnitude: context.self.tier === 3 ? 0.4 : 0.25, durationMs: 2000 })) };
};

// ---------------------------------------------------------------------------
// Ranger -- long-range single target. 十二【Ranger】
// ---------------------------------------------------------------------------

const rangerSnipe: CombatEffectResolver = (context) => {
  const target = priorityEnemyTargets(context, 1)[0];
  if (!target) return {};
  const amount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier);
  return { damageToEnemies: [{ instanceId: target.instanceId, amount }] };
};

const rangerPierceTrait: CombatEffectResolver = (context) => {
  // T2: pierce (hits a second target behind). T3: bonus vs Elite/Boss/Width>=2.
  if (context.self.tier < 2) return {};
  const target = priorityEnemyTargets(context, 2)[1];
  if (!target) return {};
  const isPriorityClass = target.occupiedRoutes.length >= 2;
  const amount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier) * (context.self.tier === 3 && isPriorityClass ? 0.9 : 0.5);
  return { damageToEnemies: [{ instanceId: target.instanceId, amount }] };
};

// ---------------------------------------------------------------------------
// Engineer -- deployable AoE. 十二【Engineer】
// ---------------------------------------------------------------------------

const engineerBarrage: CombatEffectResolver = (context) => {
  const targets = priorityEnemyTargets(context, context.self.tier === 1 ? 1 : context.self.tier === 2 ? 2 : 3);
  if (!targets.length) return {};
  const amount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier) * (targets.length > 1 ? 0.7 : 1);
  return { damageToEnemies: targets.map((target) => ({ instanceId: target.instanceId, amount })) };
};

const engineerOverloadTrait: CombatEffectResolver = (context) => {
  // T2: leaves a lingering danger zone (approximated as a debuff on current
  // targets). T3: auto-adds an extra barrage shot -- handled by the caller
  // re-invoking engineerBarrage; this trait just adds the T3 marker debuff.
  if (context.self.tier < 2) return {};
  return { debuffToEnemies: priorityEnemyTargets(context, 1).map((target) => ({ instanceId: target.instanceId, statusId: "dangerZone", magnitude: 1, durationMs: 1500 })) };
};

// ---------------------------------------------------------------------------
// Priest -- single/dual heal. 十二【Priest】
// ---------------------------------------------------------------------------

const priestHeal: CombatEffectResolver = (context) => {
  const targets = lowestHpRatioAllies(context, context.self.tier >= 2 ? 2 : 1);
  if (!targets.length) return {};
  const amount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier) * 1.2;
  return { healToAllies: targets.map((target) => ({ instanceId: target.instanceId, amount })) };
};

const priestOverhealTrait: CombatEffectResolver = (context) => {
  // T3: Overheal converts to Shield instead of being wasted.
  if (context.self.tier < 3) return {};
  const target = lowestHpRatioAllies(context, 1)[0];
  if (!target) return {};
  const overheal = Math.max(0, target.hp - target.maxHp);
  if (overheal <= 0) return {};
  return { shieldToAllies: [{ instanceId: target.instanceId, amount: overheal }] };
};

// ---------------------------------------------------------------------------
// Bard -- attack-speed support. 十二【Bard】
// ---------------------------------------------------------------------------

const bardCadence: CombatEffectResolver = (context) => {
  const targets = context.self.tier >= 2 ? context.allySupportPool : lowestHpRatioAllies(context, 1);
  if (!targets.length) return {};
  return { buffToAllies: targets.map((target) => ({ instanceId: target.instanceId, statusId: "attackSpeed", magnitude: context.self.tier === 3 ? 0.25 : 0.15, durationMs: 2000 })) };
};

const bardResonanceTrait: CombatEffectResolver = (context) => {
  // T3: full-battlefield song plus an extra resonance heal pulse.
  if (context.self.tier < 3) return {};
  const targets = lowestHpRatioAllies(context, 2);
  if (!targets.length) return {};
  const amount = context.selfDefinition.baseAttack * getTierStatMultiplier(context.selfDefinition, context.self.tier);
  return { healToAllies: targets.map((target) => ({ instanceId: target.instanceId, amount })) };
};

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

const ROW_MULTIPLIER_TANK = { front: 1, midFront: 0.5 } as const;

export const HERO_DEFINITIONS: Partial<Record<HeroId, HeroDefinition>> = {
  knight: {
    id: "knight", role: "tank", baseAttack: 7, baseHp: 112, attackInterval: 1.05, rangeAlongRoute: 0.25,
    coverage: { kind: "ownZone", maxZoneSpan: 1 },
    blockRule: { baseCapacity: 1, rowCapacityMultiplier: ROW_MULTIPLIER_TANK, zoneSpan: 1 },
    tiers: {
      1: { behavior: {} },
      2: { behavior: { blockRule: { baseCapacity: 2 } } },
      3: { behavior: { blockRule: { zoneSpan: 2 } } },
    },
    autoSkill: { id: "shieldOnBlock", trigger: { kind: "condition", conditionId: "blockedNewEnemy" }, effectId: "knight.shieldOnBlock" },
    trait: { id: "ironWill", effectId: "knight.ironWill" },
  },
  deathKnight: {
    id: "deathKnight", role: "tank", baseAttack: 12, baseHp: 128, attackInterval: 1.15, rangeAlongRoute: 0.28,
    coverage: { kind: "ownZone", maxZoneSpan: 1 },
    blockRule: { baseCapacity: 1, rowCapacityMultiplier: ROW_MULTIPLIER_TANK, zoneSpan: 1 },
    tiers: { 1: { behavior: {} }, 2: { behavior: {} }, 3: { behavior: {} } },
    autoSkill: { id: "shadowStrike", trigger: { kind: "condition", conditionId: "killedBlockedEnemy" }, effectId: "deathKnight.shadowStrike" },
    trait: { id: "bloodpact", effectId: "deathKnight.bloodpact" },
  },
  fighter: {
    id: "fighter", role: "melee", baseAttack: 17, baseHp: 92, attackInterval: 0.84, rangeAlongRoute: 0.3,
    coverage: { kind: "ownZonePlusAdjacent", maxZoneSpan: 1 },
    blockRule: { baseCapacity: 0, rowCapacityMultiplier: {}, zoneSpan: 1 },
    tiers: { 1: { behavior: {} }, 2: { behavior: {} }, 3: { behavior: {} } },
    autoSkill: { id: "heavyStrike", trigger: { kind: "attackCount", every: 4 }, effectId: "fighter.heavyStrike" },
    trait: { id: "rhythm", effectId: "fighter.rhythm" },
  },
  assassin: {
    id: "assassin", role: "assassin", baseAttack: 21, baseHp: 50, attackInterval: 0.9, rangeAlongRoute: 0.3,
    coverage: { kind: "ownZone", maxZoneSpan: 1 },
    blockRule: { baseCapacity: 0, rowCapacityMultiplier: {}, zoneSpan: 0 },
    tiers: {
      1: { behavior: {} },
      2: { behavior: { coverage: { maxZoneSpan: 2 } } },
      3: { behavior: { coverage: { maxZoneSpan: 3 } } },
    },
    autoSkill: { id: "huntDash", trigger: { kind: "condition", conditionId: "highValueTargetAvailable" }, effectId: "assassin.huntDash" },
    trait: { id: "executioner", effectId: "assassin.executioner" },
  },
  fireMage: {
    id: "fireMage", role: "ranged", baseAttack: 16, baseHp: 56, attackInterval: 1.35, rangeAlongRoute: 0.62,
    coverage: { kind: "rangedSelective", maxZoneSpan: 1 },
    blockRule: { baseCapacity: 0, rowCapacityMultiplier: {}, zoneSpan: 0 },
    tiers: {
      1: { behavior: {} },
      2: { behavior: { coverage: { maxZoneSpan: 2 } } },
      3: { behavior: { coverage: { maxZoneSpan: 2 } } },
    },
    autoSkill: { id: "flameBurst", trigger: { kind: "attackCount", every: 4 }, effectId: "fireMage.flameBurst" },
    trait: { id: "ignite", effectId: "fireMage.ignite" },
  },
  frostQueen: {
    id: "frostQueen", role: "ranged", baseAttack: 14, baseHp: 61, attackInterval: 1.3, rangeAlongRoute: 0.76,
    coverage: { kind: "rangedSelective", maxZoneSpan: 2 },
    blockRule: { baseCapacity: 0, rowCapacityMultiplier: {}, zoneSpan: 0 },
    tiers: { 1: { behavior: {} }, 2: { behavior: {} }, 3: { behavior: { coverage: { maxZoneSpan: 4 } } } },
    autoSkill: { id: "chill", trigger: { kind: "attackCount", every: 1 }, effectId: "frostQueen.chill" },
    trait: { id: "freeze", effectId: "frostQueen.freeze" },
  },
  ranger: {
    id: "ranger", role: "ranged", baseAttack: 14, baseHp: 58, attackInterval: 0.72, rangeAlongRoute: 0.88,
    coverage: { kind: "rangedSelective", maxZoneSpan: 1 },
    blockRule: { baseCapacity: 0, rowCapacityMultiplier: {}, zoneSpan: 0 },
    tiers: { 1: { behavior: {} }, 2: { behavior: {} }, 3: { behavior: {} } },
    autoSkill: { id: "snipe", trigger: { kind: "attackCount", every: 1 }, effectId: "ranger.snipe" },
    trait: { id: "pierce", effectId: "ranger.pierce" },
  },
  engineer: {
    id: "engineer", role: "ranged", baseAttack: 10, baseHp: 74, attackInterval: 1.08, rangeAlongRoute: 0.66,
    coverage: { kind: "rangedSelective", maxZoneSpan: 2 },
    blockRule: { baseCapacity: 0, rowCapacityMultiplier: {}, zoneSpan: 0 },
    tiers: { 1: { behavior: {} }, 2: { behavior: {} }, 3: { behavior: { coverage: { maxZoneSpan: 3 } } } },
    autoSkill: { id: "barrage", trigger: { kind: "attackCount", every: 1 }, effectId: "engineer.barrage" },
    trait: { id: "overload", effectId: "engineer.overload" },
  },
  priest: {
    id: "priest", role: "support", baseAttack: 5, baseHp: 72, attackInterval: 1.25, rangeAlongRoute: 0,
    coverage: { kind: "auraOnly", maxZoneSpan: 0 },
    supportRange: { kind: "radiusCells", radius: 2 },
    blockRule: { baseCapacity: 0, rowCapacityMultiplier: {}, zoneSpan: 0 },
    tiers: { 1: { behavior: {} }, 2: { behavior: {} }, 3: { behavior: {} } },
    autoSkill: { id: "heal", trigger: { kind: "interval", seconds: 2.5 }, effectId: "priest.heal" },
    trait: { id: "overheal", effectId: "priest.overheal" },
  },
  bard: {
    id: "bard", role: "support", baseAttack: 6, baseHp: 68, attackInterval: 1.02, rangeAlongRoute: 0,
    coverage: { kind: "auraOnly", maxZoneSpan: 0 },
    supportRange: { kind: "sameRow" },
    blockRule: { baseCapacity: 0, rowCapacityMultiplier: {}, zoneSpan: 0 },
    tiers: {
      1: { behavior: {} },
      2: { behavior: {} },
      3: { behavior: {} },
    },
    autoSkill: { id: "cadence", trigger: { kind: "interval", seconds: 3 }, effectId: "bard.cadence" },
    trait: { id: "resonance", effectId: "bard.resonance" },
  },
};

export const HERO_EFFECT_REGISTRY: CombatEffectRegistry = {
  "knight.shieldOnBlock": knightShieldOnBlock,
  "knight.ironWill": knightIronWill,
  "deathKnight.shadowStrike": deathKnightShadowStrike,
  "deathKnight.bloodpact": deathKnightBloodpact,
  "fighter.heavyStrike": fighterHeavyStrike,
  "fighter.rhythm": fighterRhythmTrait,
  "assassin.huntDash": assassinHuntDash,
  "assassin.executioner": assassinExecutionerTrait,
  "fireMage.flameBurst": fireMageFlameBurst,
  "fireMage.ignite": fireMageIgniteTrait,
  "frostQueen.chill": frostQueenChill,
  "frostQueen.freeze": frostQueenFreezeTrait,
  "ranger.snipe": rangerSnipe,
  "ranger.pierce": rangerPierceTrait,
  "engineer.barrage": engineerBarrage,
  "engineer.overload": engineerOverloadTrait,
  "priest.heal": priestHeal,
  "priest.overheal": priestOverhealTrait,
  "bard.cadence": bardCadence,
  "bard.resonance": bardResonanceTrait,
};

