/**
 * Run Engine core types (架構重構 Phase 2).
 *
 * This module is the new, self-contained "single Run" rule layer described in
 * 素材/玩法核心.txt. It intentionally does NOT import anything from the lobby/meta
 * layer (store.ts, persistence.ts, heroProgress.ts) -- the only bridge to that layer
 * is `MetaProgressionAdapter` in ./metaAdapter.ts. Definition types (static data) and
 * Instance/State types (runtime, per-Run) are kept separate throughout, matching the
 * existing game/types.ts convention (HeroDefinition vs HeroInstance).
 *
 * T1/T2/T3 tier here is strictly Run-scoped: HeroInstance.tier resets every Run and is
 * never persisted to the meta layer. Permanent hero growth (Level/XP, future Star/
 * Fragment, future Signature Weapon) lives entirely outside this module.
 */
import type { HeroId, DiceCombinationKind } from "../types";

// ---------------------------------------------------------------------------
// Hero: Definition (static) vs Instance (Run-scoped runtime)
// ---------------------------------------------------------------------------

export type HeroTier = 1 | 2 | 3;

export type HeroRole = "tank" | "melee" | "assassin" | "ranged" | "support";

export type DefenseZone = 1 | 2 | 3 | 4;
export type BoardRow = "front" | "midFront" | "midBack" | "back";
export const BOARD_ROWS: readonly BoardRow[] = ["front", "midFront", "midBack", "back"];
/** Row order from the battlefield (Route side) toward the castle -- index 0 is
 * closest to the enemy Route, matching 五、【縱向四列】's Row1..Row4 ordering. */
export const ALL_DEFENSE_ZONES: readonly DefenseZone[] = [1, 2, 3, 4];

/** A single one of the 16 cells in the 4x4 hero-only board (see BoardState). */
export interface BoardCell {
  zone: DefenseZone;
  row: BoardRow;
}

/** Named alias for boardCellKey()'s return type -- lets UI-layer code (store.ts,
 * the Battle Screen component tree) reference a CellKey without repeating
 * `ReturnType<typeof boardCellKey>` at every call site. */
export type CellKey = `${DefenseZone}-${BoardRow}`;

export function boardCellKey(cell: BoardCell): CellKey {
  return `${cell.zone}-${cell.row}`;
}

/**
 * How a hero's attacks/effects reach Routes above the board. Kept per-hero (not a
 * single global rule) per 玩法核心.txt 九、英雄職業與道路覆蓋 -- tanks mainly cover
 * their own zone, ranged/support use different coverage shapes entirely. "auraOnly"
 * means the hero does not target enemies/Routes at all (pure Support -- see
 * SupportRangeRule below).
 */
export interface AttackCoverageRule {
  kind: "ownZone" | "ownZonePlusAdjacent" | "rangedSelective" | "auraOnly";
  /** How many DefenseZones this coverage can reach at once (1 = own zone only). */
  maxZoneSpan: number;
}

/**
 * Block/Intercept capability. baseCapacity 0 = never blocks (e.g. assassin).
 * rowCapacityMultiplier gives *graded* Block by row per 九、【坦克】"前線才能發揮
 * 完整 Block，中前可以依英雄能力有限 Block，中後/後方基本沒有正常 Block" -- a row
 * missing from this map has 0 capacity (no Block at all), matching the old
 * effectiveRows list semantics but allowing "limited" (e.g. 0.5) instead of only
 * on/off.
 */
export interface BlockRule {
  baseCapacity: number;
  rowCapacityMultiplier: Partial<Record<BoardRow, number>>;
  /** How many DefenseZones this hero's Block reaches, symmetric with
   * AttackCoverageRule.maxZoneSpan (1 = own zone only). T3 Knight's "可以有限
   * 協防相鄰 DefenseZone" (十二) is the prototypical zoneSpan:2 case. */
  zoneSpan: number;
}

/** Three trigger kinds allowed for Auto Skills (十四、Hero Auto Skill). */
export type AutoSkillTrigger =
  | { kind: "attackCount"; every: number }
  | { kind: "interval"; seconds: number }
  | { kind: "condition"; conditionId: string };

export interface AutoSkillDefinition {
  id: string;
  trigger: AutoSkillTrigger;
  /** Opaque id resolved by the (Phase 6) combat engine's skill-effect registry. */
  effectId: string;
}

export interface TraitDefinition {
  id: string;
  /** Opaque id resolved by the (Phase 6) combat engine's trait-effect registry. */
  effectId: string;
}

/**
 * T2/T3 must be able to patch *behavior*, not just multiply stats (十一、Tier 設計原則).
 * All fields optional: only override what actually changes at that tier.
 */
export interface TierBehaviorPatch {
  coverage?: Partial<AttackCoverageRule>;
  blockRule?: Partial<BlockRule>;
  autoSkill?: Partial<AutoSkillDefinition>;
}

export interface HeroTierConfig {
  /** Overrides the Config default tier multiplier (1.0/1.6/2.4, tentative -- see
   * RUN_ENGINE_CONFIG.tierStatMultiplier) for this specific hero+tier, if a hero's
   * design needs to deviate from the global baseline. Leave unset to just use the
   * global default, which is the common case. */
  statMultiplierOverride?: number;
  behavior: TierBehaviorPatch;
}

/**
 * How a Support hero's Talent/Buff/Heal effects reach ALLIES. Deliberately separate
 * from AttackCoverageRule -- 九、【Support】says support "主要依相鄰格/範圍/同排/
 * 同列/Aura...不要主要依敵軍道路判定", i.e. it's board-adjacency based, not
 * Route-based like enemy targeting.
 */
export type SupportRangeRule =
  | { kind: "adjacentCell" }
  | { kind: "sameRow" }
  | { kind: "sameZone" }
  | { kind: "radiusCells"; radius: number }
  | { kind: "auraAll" };

export interface HeroDefinition {
  id: HeroId;
  role: HeroRole;
  baseAttack: number;
  baseHp: number;
  attackInterval: number;
  coverage: AttackCoverageRule;
  /** How far along a Route (0-1 of the path, 1 = at the castle) this hero can still
   * reach an enemy. Independent from zone coverage -- both must be satisfied. */
  rangeAlongRoute: number;
  blockRule: BlockRule;
  /** Only meaningful for role === "support"; enemy-facing heroes leave this unset. */
  supportRange?: SupportRangeRule;
  tiers: Record<HeroTier, HeroTierConfig>;
  autoSkill: AutoSkillDefinition;
  trait: TraitDefinition;
}

export interface ActiveStatusEffect {
  id: string;
  /** Source distinguishes stacking rules: same-name same-source refreshes/takes-max;
   * different-source can stack up to a cap (十三、疊加規則). */
  source: string;
  magnitude: number;
  expiresAtMs?: number;
}

export interface AutoSkillRuntimeState {
  attackCountSinceWaveStart: number;
  cooldownRemainingSeconds: number;
  /** Small deterministic offset so same-hero instances don't fire in perfect sync. */
  initialOffsetSeconds: number;
}

/** Run-scoped hero on the board (or in the Pending Zone). Reset every Run. */
export interface HeroInstance {
  instanceId: string;
  heroId: HeroId;
  tier: HeroTier;
  hp: number;
  maxHp: number;
  shield: number;
  /** null while sitting in the Pending Zone (see PendingZoneState). */
  cell: BoardCell | null;
  status: "active" | "downed";
  buffs: ActiveStatusEffect[];
  skill: AutoSkillRuntimeState;
  /** Basic Attack timer -- separate from `skill` (Auto Skill has its own trigger/
   * cooldown per 十四). Support heroes (auraOnly coverage) never consume this. */
  attackCooldownRemainingSeconds: number;
}

// ---------------------------------------------------------------------------
// Board / Pending Zone
// ---------------------------------------------------------------------------

export interface BoardState {
  /** Exactly 16 entries, keyed by boardCellKey(). */
  cells: Partial<Record<`${DefenseZone}-${BoardRow}`, HeroInstance>>;
}

export interface PendingZoneState {
  /** Config: PENDING_ZONE_CAPACITY (see config.ts). Overflow must never silently
   * consume a hero -- callers must block further summons until resolved. */
  heroes: HeroInstance[];
}

// ---------------------------------------------------------------------------
// Enemy Route (above the board -- monsters NEVER enter the 4x4)
// ---------------------------------------------------------------------------

export type RouteId = 1 | 2 | 3 | 4;
export type RoutePressure = "low" | "medium" | "high";

/** Width=1 occupies its own Route; width=2/4 occupies multiple Routes as ONE
 * EnemyInstance (never split into multiple monsters). */
export type EnemyWidth = 1 | 2 | 4;

export interface EnemyDefinition {
  id: string;
  width: EnemyWidth;
  /** Independent from width -- most width>=2 enemies still cost 1 Block by default. */
  blockCost: number;
  /** Independent from width -- see CastleDamage config table. */
  castleDamage: number;
  /** Only Siege enemies may damage the castle before reaching the end of a Route. */
  siege: boolean;
  tags: Array<"elite" | "healer" | "ranged" | "siege" | "boss">;
  baseHp: number;
  baseAttack: number;
  attackIntervalSeconds: number;
  speed: number;
}

export interface EnemyInstance {
  instanceId: string;
  defId: string;
  hp: number;
  maxHp: number;
  /** The Route(s) this single instance currently occupies (len 1, 2, or 4). */
  occupiedRoutes: RouteId[];
  pathProgress: number;
  /** HeroInstance.instanceId currently blocking this enemy, if any. */
  blockedBy?: string;
  /** Slow/Burning/etc from CombatEffectResult.debuffToEnemies -- same
   * ActiveStatusEffect shape and stacking rules (rules/status.ts) as
   * HeroInstance.buffs. */
  debuffs: ActiveStatusEffect[];
  /** Only relevant while blockedBy is set -- "被 Block 的怪：停止前進 -> 攻擊阻擋
   * 他的英雄 -> 英雄正常與其戰鬥" (八). Defaults to 0 at spawn (ready to swing the
   * instant it's blocked). */
  attackCooldownRemainingSeconds: number;
  /** Independent cooldown for "ranged"-tagged enemies' direct-strike-a-hero attack
   * (orchestrator.ts's Combat tick step 5.5), which bypasses Block entirely --
   * kept separate from attackCooldownRemainingSeconds so a ranged enemy that's
   * ALSO currently blockedBy a tank still fires both attacks on their own
   * independent cadences instead of one starving the other. Only ever ticks once
   * pathProgress has crossed RUN_ENGINE_CONFIG.rangedEnemyEngageRangeAlongRoute. */
  rangedAttackCooldownRemainingSeconds: number;
}

export interface RouteState {
  routeId: RouteId;
  active: boolean;
  enemies: EnemyInstance[];
}

export interface SpawnBatchEntry {
  enemyId: string;
  /** Gap before this specific entry spawns, relative to the batch start (per 二十、
   * "同一 Batch 中怪物也應該有 Spawn Gap" -- e.g. 0.0s / 0.5s / 1.0s / ...). */
  gapSeconds: number;
  /** Which Route(s) this single EnemyInstance spawns onto -- len 1 for Width 1,
   * len 2/4 for Width 2/4 (never split into multiple instances). */
  routes: RouteId[];
}

export interface SpawnBatch {
  /** Delay before this batch starts, relative to Wave/Route start. */
  delaySeconds: number;
  entries: SpawnBatchEntry[];
}

// ---------------------------------------------------------------------------
// Boss Encounter (data-driven script, not a generic spawner)
// ---------------------------------------------------------------------------

export interface BossPhaseDefinition {
  id: string;
  /** Phase activates once boss HP fraction drops to/below this value (1.0 = start). */
  hpFractionTrigger: number;
  /** Opaque ids resolved by the (Phase 6+) boss-script interpreter. */
  skillIds: string[];
  summons?: SpawnBatch;
  tileLock?: boolean;
  dangerZone?: boolean;
}

export interface BossEncounterDefinition {
  bossEnemyId: string;
  phases: BossPhaseDefinition[];
}

// ---------------------------------------------------------------------------
// Battlefield Event (must be disclosed before combat; never rewrites Boss core rules)
// ---------------------------------------------------------------------------

export interface BattlefieldEventDefinition {
  id: string;
  kind: "environment" | "enemyModifier" | "playerBenefit" | "riskReward" | "specialRule";
  /** Opaque id resolved by the (Phase 5+) event-effect registry. */
  effectId: string;
}

// ---------------------------------------------------------------------------
// Wave
// ---------------------------------------------------------------------------

export interface WaveDefinition {
  waveNumber: number;
  activeRoutes: RouteId[];
  routePressure: Partial<Record<RouteId, RoutePressure>>;
  batches: SpawnBatch[];
  bossEncounter?: BossEncounterDefinition;
  event?: BattlefieldEventDefinition;
}

/** A single SpawnBatchEntry flattened to an absolute wave-clock time (built once at
 * Wave start by wave.ts's flattenSpawnSchedule() from WaveDefinition.batches). */
export interface ScheduledSpawn {
  dueAtSeconds: number;
  enemyId: string;
  routes: RouteId[];
}

export interface WaveRuntimeState {
  waveNumber: number;
  routes: RouteState[];
  /** Sorted ascending by dueAtSeconds; spawnedCount is a cursor into it, not a
   * shrinking list, so re-deriving state is trivial to reason about/test. */
  spawnQueue: ScheduledSpawn[];
  spawnedCount: number;
  elapsedSeconds: number;
}

// ---------------------------------------------------------------------------
// Dice (multi-eligible-combo, per 二十七/二十八)
// ---------------------------------------------------------------------------

/** Reuse the existing 9-kind union from game/types.ts -- it already matches
 * 玩法核心.txt exactly, no need to redeclare it. */
export type DiceComboKind = DiceCombinationKind;

export interface DiceState {
  values: number[];
  locked: boolean[];
  rerollsLeft: number;
  maxRerolls: number;
  isRolling: boolean;
}

export type DiceComboEffect =
  | { kind: "gainFateEnergy"; amount: number }
  | { kind: "summonRandom"; count: number }
  | { kind: "summonChosen"; count: number }
  | { kind: "combatBuff"; attackSpeedPct?: number; damagePct?: number }
  | { kind: "freeMergeWithTwo" }
  | { kind: "leaderBurstReady" }
  | { kind: "jackpotTierUp" };

export interface DiceComboDefinition {
  kind: DiceComboKind;
  effect: DiceComboEffect;
}

// ---------------------------------------------------------------------------
// Fate Energy (merged Summon + Recycle energy, per 二十九)
// ---------------------------------------------------------------------------

export interface FateEnergyState {
  current: number;
  max: number;
}

export interface FateEnergyCostTable {
  recycleReward: Record<HeroTier, number>;
  randomSummonCost: number;
  specifiedSummonCost: number;
  extraRepositionCost: number;
  /** How many times per Wave a player may buy extra Reposition with Fate Energy. */
  extraRepositionPurchaseLimitPerWave: number;
}

// ---------------------------------------------------------------------------
// Reposition
// ---------------------------------------------------------------------------

export interface RepositionState {
  usedThisWave: number;
  baseAllowance: number;
  /** Config: does unused allowance carry over to next Wave? Default false. */
  carriesOverBetweenWaves: boolean;
  /** Extra-Reposition purchases (Fate Energy) made this Wave -- capped at
   * fateEnergy.extraRepositionPurchaseLimitPerWave, per 二十九. Always resets
   * to 0 on Wave advance regardless of carriesOverBetweenWaves. */
  extraPurchasesThisWave: number;
}

// ---------------------------------------------------------------------------
// Leader (Passive always-on; Burst trigger-based, no separate energy bar)
// ---------------------------------------------------------------------------

export interface LeaderPassiveDefinition {
  id: string;
  /** Opaque id resolved by the (Phase 7) leader-effect registry. Applies for the
   * whole Run regardless of whether this heroId is currently summoned. */
  effectId: string;
}

export type LeaderBurstKind = "buffShield" | "attackSkill";

export interface LeaderBurstDefinition {
  id: string;
  kind: LeaderBurstKind;
  effectId: string;
  /** Only relevant when kind === "attackSkill" and the effect needs a target Route
   * chosen ahead of time, per 三十三. */
  requiresRouteChoice: boolean;
}

export interface LeaderState {
  heroId: HeroId;
  passive: LeaderPassiveDefinition;
  burst: LeaderBurstDefinition;
  burstReady: boolean;
  chosenBurstRoute?: RouteId;
}

// ---------------------------------------------------------------------------
// Talent (Lv1-3, qualitative) vs Blessing (single-pick, rule-change)
// ---------------------------------------------------------------------------

export type TalentCategory =
  | "dice" | "summon" | "merge" | "formation" | "combat"
  | "heroSpecific" | "resource" | "reposition" | "sustain" | "riskReward";

export interface TalentLevelEffect {
  level: 1 | 2 | 3;
  /** Opaque id resolved by the (Phase 7) talent-effect registry. Lv2/Lv3 may point
   * at a *different* effectId than Lv1 to express a qualitative change, not just a
   * bigger number on the same effect. */
  effectId: string;
}

export interface TalentDefinition {
  id: string;
  category: TalentCategory;
  levels: [TalentLevelEffect, TalentLevelEffect, TalentLevelEffect];
  /** Which selected heroes (and/or the Leader) this Talent synergizes with -- used
   * by generateTalentChoices()'s Weighted Pool (三十: "Talent Pool 應依 3 英雄/
   * Leader/Equipment/已有 Build 做 Weighted Pool"). Omit for a fully generic Talent
   * with no particular hero affinity. */
  relatedHeroIds?: HeroId[];
}

export interface RunTalentState {
  talentId: string;
  level: 1 | 2 | 3;
}

export interface RuleChangeDescriptor {
  /** Opaque id resolved by the (Phase 7) blessing-effect registry. Blessings change
   * a rule (e.g. "Merge with 2 instead of 3 on first Merge each Wave"), not just add
   * a flat stat modifier. */
  effectId: string;
}

export interface BlessingDefinition {
  id: string;
  ruleChange: RuleChangeDescriptor;
  /** Same purpose as TalentDefinition.relatedHeroIds -- 三十二's "核心祝福 Offer
   * 至少一個最好與目前 Build 有高度關聯". */
  relatedHeroIds?: HeroId[];
}

// ---------------------------------------------------------------------------
// Equipment (Team-wide: Weapon x1 / Armor x1 / Relic x1 -- reuses the existing
// EquipmentBonuses shape conceptually; the concrete adapter lives in metaAdapter.ts)
// ---------------------------------------------------------------------------

export interface EquipmentLoadout {
  attackMultiplier: number;
  castleBonus: number;
  extraRerolls: number;
}

// ---------------------------------------------------------------------------
// Castle / Run-level state
// ---------------------------------------------------------------------------

export interface CastleState {
  hp: number;
  maxHp: number;
}

export type RunPhase =
  | "RUN_START"
  | "WAVE_PREVIEW"
  | "DICE_ROLL"
  | "DICE_DECISION"
  | "DICE_RESOLVE"
  | "REWARD_RESOLVE"
  | "PREPARATION"
  | "FORMATION_CONFIRM"
  | "COMBAT_START"
  | "COMBAT_RUNNING"
  | "COMBAT_END"
  | "POST_WAVE"
  | "RUN_WIN"
  | "RUN_LOSE";

/** Player-facing simplification of RunPhase, per 四十二 (DICE / PREPARATION / COMBAT). */
export function toPlayerFacingPhase(phase: RunPhase): "DICE" | "PREPARATION" | "COMBAT" {
  if (phase === "WAVE_PREVIEW" || phase === "DICE_ROLL" || phase === "DICE_DECISION" || phase === "DICE_RESOLVE") return "DICE";
  if (phase === "PREPARATION" || phase === "FORMATION_CONFIRM" || phase === "REWARD_RESOLVE") return "PREPARATION";
  return "COMBAT";
}

export interface RunState {
  runId: string;
  phase: RunPhase;
  wave: number;
  selectedHeroes: HeroId[];
  leader: LeaderState;
  board: BoardState;
  pending: PendingZoneState;
  dice: DiceState;
  fateEnergy: FateEnergyState;
  reposition: RepositionState;
  castle: CastleState;
  waveRuntime?: WaveRuntimeState;
  talents: RunTalentState[];
  blessings: string[];
  equipment: EquipmentLoadout;
  /** Every dice effect selected during this run, kept independently from the
   * authoritative effect state so UI history can never change gameplay. */
  comboHistory: Array<{ kind: DiceComboKind; wave: number }>;

  // ---- Phase 9 orchestration bookkeeping (mirrors the old game/types.ts
  // RunState's pendingHeroChoice/pendingFreeMerge/talentChoices/message fields,
  // per 玩法核心.txt 一's "請依現有程式風格整合") ----
  /** Set after DICE_RESOLVE (getEligibleComboEffects) until the player picks one --
   * 二十八's "多 Combo 選擇", never auto-resolved to "the highest". */
  pendingComboChoices: DiceComboDefinition[];
  /** Every run begins with one free random summon, redeemable during its first
   * PREPARATION phase before normal Fate Energy summon costs apply. */
  initialFreeRandomSummonAvailable: boolean;
  /** THREE_KIND: player must name which of the 3 selected heroes to summon. */
  pendingHeroChoice: boolean;
  /** FULL_HOUSE: the next Merge this Preparation may use 2 instead of 3. */
  pendingFreeMerge: boolean;
  /** FIVE_KIND: player must name a board T1/T2 hero to instantly tier up. */
  pendingJackpotTierUp: boolean;
  /** SMALL_STRAIGHT/LARGE_STRAIGHT combat buff, active for this Wave's combat only. */
  waveCombatBuff: { attackSpeedMultiplier: number; damageMultiplier: number };
  talentChoices: TalentDefinition[];
  blessingChoices: BlessingDefinition[];
  message: string;
}
