/**
 * Phase 9c: Battle Screen for the new Run Engine (client/src/game/run-engine/**).
 *
 * The board reuses the same animated hero sprites (HeroFrameSprite/HERO_FRAME_SHEETS,
 * originally built for the old BattleScreen) so a summoned hero looks the same as
 * before -- per explicit user feedback that the battle module's visuals should not
 * change even though the underlying Dice/Summon/Merge/Formation/Combat rules did.
 * Everything else here (Route strip, Dice tray, Reward/Pause/Result overlays) is
 * still a simplified, purpose-built control surface for the new state machine, not
 * a pixel port of the old screens.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./battleScreenV2.css";
import { ChevronDown, ChevronLeft, Coins, Dices, Gift, Menu, Music, Pause, Play, RotateCcw, Shield, Sparkles, Swords, Volume2, X, Zap } from "lucide-react";
import { ENEMIES, EQUIPMENT, HEROES } from "@/game/config";
import { HERO_BOARD_LAYOUT } from "@/game/heroBoardLayout";
import { HERO_FRAME_SHEETS, HeroFrameSprite } from "@/game/heroSprites";
import { RUN_ENGINE_CONFIG } from "@/game/run-engine/config";
import { ENEMY_DEFINITIONS } from "@/game/run-engine/enemies";
import { HERO_DEFINITIONS } from "@/game/run-engine/heroes";
import { getEligibleComboEffects } from "@/game/run-engine/rules/dice";
import { ALL_DEFENSE_ZONES, BOARD_ROWS, boardCellKey } from "@/game/run-engine/types";
import type {
  BlessingDefinition,
  BoardState,
  CellKey,
  DiceComboDefinition,
  DiceComboEffect,
  DiceComboKind,
  HeroInstance,
  HeroTier,
  RunState,
  TalentDefinition,
  WaveDefinition,
  WaveRuntimeState,
} from "@/game/run-engine/types";
import { WAVES_BY_CHAPTER } from "@/game/run-engine/waves";
import { useGameStore } from "@/game/store";
import type { ChapterId, DungeonId, EquipmentSlot, HeroId } from "@/game/types";

// All three chapters are 10 Waves each (waves.ts's WAVES_BY_CHAPTER doc comment),
// so a single module-level constant stays valid without branching per chapterId.
const TOTAL_WAVES = WAVES_BY_CHAPTER.courtyard.length;

// ---------------------------------------------------------------------------
// Presentation-only display copy -- talents.ts/blessings.ts stay pure rule data
// (opaque effectIds), this is the one place that maps them to Chinese labels.
// ---------------------------------------------------------------------------

const TALENT_DISPLAY: Record<string, { label: string; description: string }> = {
  extraReroll: { label: "靈巧指節", description: "增加本波重骰次數。" },
  sixPower: { label: "六面加護", description: "擲出的 6 點提供額外效果。" },
  mergeBurst: { label: "升階衝擊", description: "合成時對敵軍造成傷害。" },
  mergeShield: { label: "聚光護幕", description: "合成後獲得護盾。" },
  tempoT1: { label: "新兵節奏", description: "T1 英雄攻速提升。" },
  extraReposition: { label: "調度餘裕", description: "每波調度次數增加。" },
  fireCraft: { label: "餘燼工坊", description: "火焰系英雄傷害提升。" },
  shieldWall: { label: "鋼鐵陣列", description: "坦克英雄阻擋數提升。" },
};

const BLESSING_DISPLAY: Record<string, { label: string; description: string }> = {
  twoMergeAlways: { label: "首演捷徑", description: "合成常態只需 2 名同英雄同階。" },
  wideBoard: { label: "廣域徵召", description: "棋盤格局調整，利於大量召喚。" },
  energyOverflow: { label: "命運洋溢", description: "命運能量上限與獲取提升。" },
  castleFortify: { label: "城壁加固", description: "城堡最大生命提升。" },
  fireStorm: { label: "焚天號令", description: "火焰系英雄獲得額外爆發傷害。" },
  guardianOath: { label: "守護誓約", description: "坦克系英雄獲得額外護盾。" },
};

const COMBO_LABELS: Record<DiceComboKind, string> = {
  NONE: "無組合", PAIR: "一對", TWO_PAIR: "兩對", THREE_KIND: "三條",
  SMALL_STRAIGHT: "小順子", LARGE_STRAIGHT: "大順子", FULL_HOUSE: "葫蘆",
  FOUR_KIND: "四條", FIVE_KIND: "五條",
};

const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = { weapon: "武器", armor: "護甲", relic: "遺物" };

function describeComboEffect(effect: DiceComboEffect): string {
  switch (effect.kind) {
    case "gainFateEnergy": return `獲得 ${effect.amount} 點命運能量`;
    case "summonRandom": return `隨機召喚 ${effect.count} 名英雄`;
    case "summonChosen": return "指定召喚 1 名英雄";
    case "combatBuff": return `本波${effect.attackSpeedPct ? ` 攻速 +${Math.round(effect.attackSpeedPct * 100)}%` : ""}${effect.damagePct ? ` 傷害 +${Math.round(effect.damagePct * 100)}%` : ""}`;
    case "freeMergeWithTwo": return "下次合成僅需 2 名同英雄同階";
    case "leaderBurstReady": return "隊長爆發技能就緒";
    case "jackpotTierUp": return "指定一名 T1/T2 英雄直接升階，並獲得隊長爆發";
  }
}

function previewComboEffect(effect: DiceComboEffect): { tag: string; value: string; followUp: string } {
  switch (effect.kind) {
    case "gainFateEnergy": return { tag: "立即獲得", value: `＋${effect.amount} 命運能量`, followUp: "可用於隨機或指定召喚。" };
    case "summonRandom": return { tag: "立即召喚", value: `＋${effect.count} 名隨機英雄`, followUp: "英雄會加入棋盤或待命區。" };
    case "summonChosen": return { tag: "下一步", value: "指定 1 名英雄", followUp: "從目前編組中選擇要召喚的職業。" };
    case "combatBuff": {
      const buffs = [effect.attackSpeedPct ? `攻速＋${Math.round(effect.attackSpeedPct * 100)}%` : "", effect.damagePct ? `傷害＋${Math.round(effect.damagePct * 100)}%` : ""].filter(Boolean).join("、");
      return { tag: "本波增益", value: buffs, followUp: "僅在本波自動戰鬥期間有效。" };
    }
    case "freeMergeWithTwo": return { tag: "持續效果", value: "下次合成僅需 2 名", followUp: "選兩名相同英雄、相同 T 階即可升階；找不到搭配時可在棋盤上放棄，不影響開戰。" };
    case "leaderBurstReady": return { tag: "隊長爆發", value: "立即就緒", followUp: "開戰後可依隊長規則觸發爆發。" };
    case "jackpotTierUp": return { tag: "下一步", value: "指定 T1／T2 直接升階", followUp: "同時使隊長爆發立即就緒。" };
  }
}

function heroLabel(heroId: HeroId) {
  const definition = HEROES[heroId];
  return { name: definition.name, color: definition.color, icon: definition.icon };
}

/** Hero-summon-choice button (THREE_KIND's overlay, "指定召喚") -- shows the same
 * animated idle sprite as the board/team formation, per user feedback that
 * "there used to be a character model to look at" here too. */
function HeroPickCard({ heroId, onClick }: { heroId: HeroId; onClick: () => void }) {
  const label = heroLabel(heroId);
  return <button className="bsv2-hero-pick-card" style={{ "--hero-color": label.color } as React.CSSProperties} onClick={onClick}>
    <span className="bsv2-hero-pick-portrait">
      {HERO_FRAME_SHEETS[heroId] ? <HeroFrameSprite heroId={heroId} action="idle" /> : <em>{label.icon}</em>}
    </span>
    <span>{label.name}</span>
  </button>;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Bsv2Header({ run }: { run: RunState }) {
  const togglePause = useGameStore((state) => state.togglePause);
  const isPaused = useGameStore((state) => state.isPaused);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="bsv2-header">
    {/* Leaving mid-battle now lives only in 戰鬥選單 (Bsv2SettingsDrawer's
        confirm-gated 離開戰鬥) -- this used to be an instant, no-confirm exit
        right here, which risked losing a Run to a stray tap. */}
    <div className="bsv2-wave"><small>WAVE</small><strong>{String(run.wave).padStart(2, "0")}</strong><span>/ {TOTAL_WAVES}</span></div>
    <button className={`bsv2-icon-btn bsv2-history-toggle ${historyOpen ? "is-open" : ""}`} onClick={() => { setHistoryOpen((open) => !open); setMenuOpen(false); }} aria-label="查看本局骰型歷程" aria-expanded={historyOpen}><Dices size={16} /></button>
    {run.phase === "COMBAT_RUNNING" && <button className="bsv2-icon-btn" onClick={togglePause} aria-label={isPaused ? "繼續" : "暫停"}>{isPaused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}</button>}
    <button className={`bsv2-icon-btn bsv2-menu-toggle ${menuOpen ? "is-open" : ""}`} onClick={() => { setMenuOpen((open) => !open); setHistoryOpen(false); }} aria-label="戰鬥選單" aria-expanded={menuOpen}><Menu size={16} /></button>
    {historyOpen && <Bsv2DiceHistory run={run} onClose={() => setHistoryOpen(false)} />}
    {menuOpen && <Bsv2SettingsDrawer run={run} onClose={() => setMenuOpen(false)} />}
  </header>;
}

function Bsv2DiceHistory({ run, onClose }: { run: RunState; onClose: () => void }) {
  const activeEffects = [
    run.waveCombatBuff.attackSpeedMultiplier > 1 ? `攻速＋${Math.round((run.waveCombatBuff.attackSpeedMultiplier - 1) * 100)}%` : null,
    run.waveCombatBuff.damageMultiplier > 1 ? `傷害＋${Math.round((run.waveCombatBuff.damageMultiplier - 1) * 100)}%` : null,
    run.pendingFreeMerge ? "下一次合成僅需 2 名" : null,
    run.pendingJackpotTierUp ? "可指定 T1／T2 直接升階" : null,
    run.leader.burstReady ? "隊長爆發就緒" : null,
  ].filter(Boolean);
  return <aside className="bsv2-dice-history" aria-label="本局骰型歷程">
    <header><span><Dices size={14} />本局骰型</span><button type="button" onClick={onClose} aria-label="收起骰型歷程"><X size={13} /></button></header>
    {run.comboHistory.length > 0 ? <ol>{run.comboHistory.slice().reverse().map((entry, index) => <li key={`${entry.wave}-${entry.kind}-${index}`}><small>W{entry.wave}</small><b>{COMBO_LABELS[entry.kind]}</b></li>)}</ol> : <p>尚未選擇骰型效果。</p>}
    <footer><small>目前加成</small>{activeEffects.length > 0 ? <span>{activeEffects.join(" · ")}</span> : <span>尚無持續加成</span>}</footer>
  </aside>;
}

function Bsv2SettingsDrawer({ run, onClose }: { run: RunState; onClose: () => void }) {
  const openScreen = useGameStore((state) => state.openScreen);
  const equipped = useGameStore((state) => state.progress.equipped);
  const equippedItems = (["weapon", "armor", "relic"] as EquipmentSlot[])
    .map((slot) => { const equipmentId = equipped[slot]; return equipmentId ? { slot, item: EQUIPMENT[equipmentId] } : null; })
    .filter((entry): entry is { slot: EquipmentSlot; item: typeof EQUIPMENT[keyof typeof EQUIPMENT] } => !!entry);
  const debuffLines = [
    run.enemyRule && run.enemyRule.hpMultiplier > 1 ? `敵軍生命 +${Math.round((run.enemyRule.hpMultiplier - 1) * 100)}%` : null,
    run.enemyRule && run.enemyRule.speedMultiplier > 1 ? `敵軍移速 +${Math.round((run.enemyRule.speedMultiplier - 1) * 100)}%` : null,
  ].filter((line): line is string => !!line);
  const leaveBattle = () => {
    if (!window.confirm("確定要離開本局戰鬥嗎？目前進度將會遺失。")) return;
    onClose();
    openScreen("title");
  };
  return <aside className="bsv2-settings-drawer" aria-label="戰鬥選單">
    <header><span><Menu size={14} />戰鬥選單</span><button type="button" onClick={onClose} aria-label="收起選單"><X size={13} /></button></header>
    <section>
      <h3>目前增益</h3>
      {run.talents.length === 0 && run.blessings.length === 0
        ? <p className="bsv2-settings-empty">尚未選擇任何天賦或祝福。</p>
        : <ul>
            {run.talents.map((entry) => { const display = TALENT_DISPLAY[entry.talentId] ?? { label: entry.talentId, description: "" }; return <li key={entry.talentId}><b>{display.label}</b><small>Lv.{entry.level}</small><span>{display.description}</span></li>; })}
            {run.blessings.map((id) => { const display = BLESSING_DISPLAY[id] ?? { label: id, description: "" }; return <li key={id}><b>{display.label}</b><span>{display.description}</span></li>; })}
          </ul>}
    </section>
    <section>
      <h3>裝備效果</h3>
      {equippedItems.length === 0
        ? <p className="bsv2-settings-empty">本局未裝備任何物品。</p>
        : <ul>{equippedItems.map(({ slot, item }) => <li key={slot}><b>{item.name}</b><small>{EQUIPMENT_SLOT_LABELS[slot]}</small><span>{item.description}</span></li>)}</ul>}
    </section>
    <section>
      <h3>本局減益</h3>
      {debuffLines.length === 0
        ? <p className="bsv2-settings-empty">本局為一般遠征，無特殊減益效果。</p>
        : <ul className="bsv2-settings-flat">{debuffLines.map((line) => <li key={line}>{line}</li>)}</ul>}
    </section>
    <section>
      <h3>音效與音樂</h3>
      <div className="bsv2-settings-stub"><Volume2 size={14} /><span>音效</span><em>即將推出</em></div>
      <div className="bsv2-settings-stub"><Music size={14} /><span>音樂</span><em>即將推出</em></div>
    </section>
    <button type="button" className="bsv2-settings-leave" onClick={leaveBattle}><ChevronLeft size={14} />離開戰鬥</button>
  </aside>;
}

// ---------------------------------------------------------------------------
// Battle stage -- the original battlefield backdrop, with the 4 Route lanes
// (aligned to the board's 4 DefenseZone columns below, per 玩法核心.txt 五/六)
// and enemy/Block markers overlaid on top of it.
// ---------------------------------------------------------------------------

const FOREST_CASTLE_BOARD_URL = "/manus-storage/forest-citadel-board_4039b3e9.webp";

/** Kept up from Wave Preview through Reward (not just during COMBAT_RUNNING) so the
 * battlefield stays on screen while rolling dice, per user feedback -- the active
 * Route lanes double as an "incoming attack" hint (animated chevrons flowing down
 * the lane) available before any enemy has actually spawned, using the Wave's
 * activeRoutes rather than live waveRuntime data. Inactive lanes are left
 * un-tinted (no more darkening overlay) so the artwork stays readable underneath. */
function RouteStrip({ waveDefinition, waveRuntime, wave, chapterId, boardOverlay }: { waveDefinition: WaveDefinition | undefined; waveRuntime: WaveRuntimeState | undefined; wave: number; chapterId: ChapterId; boardOverlay?: React.ReactNode }) {
  const activeRoutes = waveDefinition?.activeRoutes ?? [];
  const liveEnemies = waveRuntime?.routes.flatMap((route) => route.enemies) ?? [];
  const plannedCount = waveDefinition?.batches.reduce((sum, batch) => sum + batch.entries.length, 0) ?? 0;
  const enemyCount = waveRuntime ? liveEnemies.length : plannedCount;
  const isBossWave = !!waveDefinition?.bossEncounter;

  // Same presentation-only "diff consecutive authoritative snapshots" pulse the
  // Hero board cells already use (see Bsv2Board) -- gives an enemy a floating
  // "-N" the instant a Hero's attack lands, mirroring the damage number Heroes
  // already show when THEY take a hit.
  const [enemyHitCues, setEnemyHitCues] = useState<Record<string, number>>({});
  const previousEnemyHpRef = useRef<Record<string, number>>({});
  const enemyHitTimerRef = useRef<number[]>([]);
  useEffect(() => {
    const nextHp: Record<string, number> = {};
    const incoming: Array<{ instanceId: string; amount: number }> = [];
    liveEnemies.forEach((enemy) => {
      const previousHp = previousEnemyHpRef.current[enemy.instanceId];
      const damage = previousHp !== undefined ? previousHp - enemy.hp : 0;
      if (damage > 0.01) incoming.push({ instanceId: enemy.instanceId, amount: damage });
      nextHp[enemy.instanceId] = enemy.hp;
    });
    previousEnemyHpRef.current = nextHp;
    incoming.forEach(({ instanceId, amount }) => {
      setEnemyHitCues((current) => ({ ...current, [instanceId]: amount }));
      const timer = window.setTimeout(() => setEnemyHitCues((current) => {
        const next = { ...current };
        delete next[instanceId];
        return next;
      }), 620);
      enemyHitTimerRef.current.push(timer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waveRuntime]);
  useEffect(() => () => enemyHitTimerRef.current.forEach((timer) => window.clearTimeout(timer)), []);
  const nextWaveDefinition = WAVES_BY_CHAPTER[chapterId][wave];
  const summarizeEnemies = (definition: WaveDefinition | undefined) => {
    const counts = new Map<string, number>();
    definition?.batches.forEach((batch) => batch.entries.forEach((entry) => counts.set(entry.enemyId, (counts.get(entry.enemyId) ?? 0) + 1)));
    if (definition?.bossEncounter) counts.set(definition.bossEncounter.bossEnemyId, (counts.get(definition.bossEncounter.bossEnemyId) ?? 0) + 1);
    return Array.from(counts.entries()).map(([enemyId, count]) => ({ name: ENEMIES[enemyId as keyof typeof ENEMIES]?.name ?? enemyId, count }));
  };
  const currentSummary = summarizeEnemies(waveDefinition);
  const nextSummary = summarizeEnemies(nextWaveDefinition);
  return <div className={`bsv2-battle-stage bsv2-forest-stage ${boardOverlay ? "is-combined-scene" : ""}`} aria-label="森林城堡戰場">
    <img className="bsv2-scene-art" src={FOREST_CASTLE_BOARD_URL} alt="" aria-hidden="true" />
    <div className="bsv2-stage-copy"><span>第 {wave} 波</span><small>{enemyCount} 名敵人</small></div>
    {isBossWave && <div className="bsv2-boss-warning"><Shield size={13} />Boss 波次</div>}
    <aside className="bsv2-wave-forecast" aria-label="敵軍波次摘要">
      <section><span>本波 W{wave}</span><p>{currentSummary.map((enemy) => <i key={enemy.name}>{enemy.name}×{enemy.count}</i>)}</p>{isBossWave && <b><Shield size={10} />Boss</b>}</section>
      {nextWaveDefinition && <section className={nextWaveDefinition.bossEncounter ? "is-boss" : ""}><span>下波 W{wave + 1}</span><p>{nextSummary.map((enemy) => <i key={enemy.name}>{enemy.name}×{enemy.count}</i>)}</p>{nextWaveDefinition.bossEncounter && <b><Shield size={10} />Boss 預警</b>}</section>}
    </aside>
    <div className="bsv2-route-strip">
      {ALL_DEFENSE_ZONES.map((zone) => {
        const active = activeRoutes.includes(zone);
        return <div key={zone} className={`bsv2-route-lane ${active ? "is-active" : "is-inactive"}`}>
          <small>路 {zone}</small>
          {active && <span className="bsv2-route-hint" aria-hidden="true"><i /><i /><i /></span>}
        </div>;
      })}
      <div className="bsv2-route-overlay">
        {liveEnemies.map((enemy) => {
          const definition = ENEMY_DEFINITIONS[enemy.defId];
          const meta = ENEMIES[enemy.defId as keyof typeof ENEMIES];
          const minZone = Math.min(...enemy.occupiedRoutes);
          const span = enemy.occupiedRoutes.length;
          const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
          const hitAmount = enemyHitCues[enemy.instanceId];
          return <div key={enemy.instanceId} className={`bsv2-enemy-marker ${enemy.blockedBy ? "is-blocked" : ""} ${definition?.tags.includes("boss") ? "is-boss" : ""} ${hitAmount ? "is-hit" : ""}`} style={{ left: `${((minZone - 1) / 4) * 100}%`, width: `${(span / 4) * 100}%`, top: `${Math.min(94, enemy.pathProgress * 100)}%`, "--enemy-color": meta?.color ?? "#8098c0" } as React.CSSProperties} aria-label={`${meta?.name ?? enemy.defId}，生命 ${Math.ceil(enemy.hp)}/${enemy.maxHp}`}>
            <i />
            <b><span style={{ width: `${hpRatio * 100}%` }} /></b>
            {hitAmount ? <strong className="bsv2-enemy-damage-float" aria-hidden="true">-{Math.max(1, Math.round(hitAmount))}</strong> : null}
          </div>;
        })}
      </div>
    </div>
    {boardOverlay}
  </div>;
}

// ---------------------------------------------------------------------------
// Board (4x4) + Pending Zone
// ---------------------------------------------------------------------------

type BoardMode = "merge" | "reposition" | "recycle" | "pendingPlace" | null;

/** True for a brief window right after a Basic Attack lands (attackCooldownRemainingSeconds
 * resets to the full effective interval and counts down from there) -- an approximation of the
 * old engine's discrete "just attacked" event, close enough for a purely cosmetic animation cue.
 * Ignores buff/equipment speed multipliers, so the window can drift a little under heavy attack-
 * speed buffs; not worth threading those through just to pick an animation frame. */
function isRecentlyAttacking(hero: HeroInstance): boolean {
  const interval = HERO_DEFINITIONS[hero.heroId]?.attackInterval ?? 1;
  return hero.attackCooldownRemainingSeconds > interval * 0.75;
}

function HeroCell({ cellKey, hero, selected, mergeCandidate, repositionTarget, hitAmount, onClick, disabled }: { cellKey: CellKey; hero: HeroInstance | undefined; selected: boolean; mergeCandidate: boolean; repositionTarget: boolean; hitAmount?: number; onClick: () => void; disabled: boolean }) {
  if (!hero) return <button data-cell-key={cellKey} className="bsv2-cell is-empty" onClick={onClick} disabled={disabled} aria-label="空格" />;
  const label = heroLabel(hero.heroId);
  const hpRatio = Math.max(0, hero.hp / hero.maxHp);
  const action = isRecentlyAttacking(hero) ? "attack" : "idle";
  const boardLayout = HERO_BOARD_LAYOUT[hero.heroId]?.[action];
  const visual = HERO_FRAME_SHEETS[hero.heroId]
    ? <span className={`bsv2-cell-sprite hero-board-sprite hero-${hero.heroId} tier-${hero.tier} is-${action}`}><HeroFrameSprite heroId={hero.heroId} action={action} boardLayout={boardLayout} /></span>
    : <span className="bsv2-cell-icon">{label.icon}</span>;
  return <button data-cell-key={cellKey} className={`bsv2-cell is-filled ${selected ? "is-selected" : ""} ${mergeCandidate ? "is-merge-candidate" : ""} ${repositionTarget ? "is-reposition-target" : ""} ${hitAmount ? "is-hit" : ""} ${hero.status === "downed" ? "is-downed" : ""}`} style={{ "--hero-color": label.color } as React.CSSProperties} onClick={onClick} disabled={disabled} aria-label={`${label.name} T${hero.tier}，生命 ${Math.ceil(hero.hp)}/${hero.maxHp}`}>
    {visual}
    {hitAmount ? <><i className="bsv2-hit-flash" aria-hidden="true" /><strong className="bsv2-damage-float" aria-hidden="true">-{Math.max(1, Math.round(hitAmount))}</strong></> : null}
    <b className="bsv2-cell-tier">T{hero.tier}</b>
    {hero.shield > 0 && <i className="bsv2-cell-shield"><Shield size={9} fill="currentColor" /></i>}
    {hero.status === "downed" && <span className="bsv2-cell-downed">倒地</span>}
    <span className="bsv2-cell-hp"><em style={{ width: `${hpRatio * 100}%` }} /></span>
  </button>;
}

function Bsv2Board({ board, interactive, pendingJackpotTierUp, embedded = false, visualTestFullBoard = false, toolbarSlot = null }: { board: BoardState; interactive: boolean; pendingJackpotTierUp: boolean; embedded?: boolean; visualTestFullBoard?: boolean; toolbarSlot?: HTMLElement | null }) {
  const mergeSelection = useGameStore((state) => state.mergeSelection);
  const repositionHero = useGameStore((state) => state.repositionHero);
  const recycleBoardHero = useGameStore((state) => state.recycleBoardHero);
  const placePendingHero = useGameStore((state) => state.placePendingHero);
  const buyExtraReposition = useGameStore((state) => state.buyExtraReposition);
  const chooseJackpotTierUpTarget = useGameStore((state) => state.chooseJackpotTierUpTarget);
  const run = useGameStore((state) => state.run);

  const [mode, setMode] = useState<BoardMode>(null);
  const [selectedCells, setSelectedCells] = useState<CellKey[]>([]);
  const [repositionFrom, setRepositionFrom] = useState<CellKey | null>(null);
  const [placingInstanceId, setPlacingInstanceId] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<CellKey | null>(null);
  const [mergeNotice, setMergeNotice] = useState<string | null>(null);
  const [hitCues, setHitCues] = useState<Partial<Record<CellKey, number>>>({});
  const previousVitalsRef = useRef<Record<string, { cellKey: CellKey; hp: number; shield: number }>>({});
  const hitTimerRef = useRef<number[]>([]);

  // Presentation-only cue: the Run Engine remains the authority for HP/Shield.
  // Comparing consecutive authoritative board snapshots gives the UI a reliable
  // hit pulse without adding animation state to gameplay data.
  useEffect(() => {
    const nextVitals: Record<string, { cellKey: CellKey; hp: number; shield: number }> = {};
    const incoming: Array<{ cellKey: CellKey; amount: number }> = [];
    (Object.entries(board.cells) as Array<[CellKey, HeroInstance | undefined]>).forEach(([cellKey, hero]) => {
      if (!hero) return;
      const previous = previousVitalsRef.current[hero.instanceId];
      const damage = previous ? (previous.hp + previous.shield) - (hero.hp + hero.shield) : 0;
      if (damage > 0.01) incoming.push({ cellKey, amount: damage });
      nextVitals[hero.instanceId] = { cellKey, hp: hero.hp, shield: hero.shield };
    });
    previousVitalsRef.current = nextVitals;
    incoming.forEach(({ cellKey, amount }) => {
      setHitCues((current) => ({ ...current, [cellKey]: amount }));
      const timer = window.setTimeout(() => setHitCues((current) => {
        const next = { ...current };
        delete next[cellKey];
        return next;
      }), 620);
      hitTimerRef.current.push(timer);
    });
  }, [board]);

  useEffect(() => () => hitTimerRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  // Reset all local selection state whenever the board stops being interactive
  // (e.g. leaving PREPARATION for COMBAT_RUNNING) -- adjusted during render per
  // React's "adjusting state when a prop changes" pattern, not in an effect.
  const [wasInteractive, setWasInteractive] = useState(interactive);
  if (interactive !== wasInteractive) {
    setWasInteractive(interactive);
    if (!interactive) {
      setMode(null);
      setSelectedCells([]);
      setRepositionFrom(null);
      setPlacingInstanceId(null);
    }
  }

  // Full House (葫蘆)/熔合催化劑 only *permit* stopping a Merge at 2 -- they never
  // forbid the normal 3-count Merge. Hard-capping selection at 2 here used to trap
  // players who had no matching *pair* on the board: they could not reach a 3rd
  // matching hero either, so pendingFreeMerge could never clear and "確認陣型，
  // 開戰" stayed disabled with no way out. Selection can now always grow to 3;
  // confirming at 2 (while pendingFreeMerge) still spends the discount immediately.
  const minMergeCount = run?.pendingFreeMerge ? 2 : 3;
  const maxMergeCount = 3;
  const pendingRemaining = run ? run.reposition.baseAllowance - run.reposition.usedThisWave : 0;
  const finishReposition = (fromCellKey: CellKey, toCellKey: CellKey) => {
    if (fromCellKey === toCellKey || pendingRemaining <= 0) return;
    repositionHero(fromCellKey, toCellKey);
    setRepositionFrom(null);
    setFocusedCell(toCellKey);
    const remainingAfterMove = pendingRemaining - 1;
    setMergeNotice(null);
    if (remainingAfterMove <= 0) setMode(null);
  };

  if (!run) return null;

  const visualTestHeroes = visualTestFullBoard
    ? BOARD_ROWS.flatMap((row, rowIndex) => ALL_DEFENSE_ZONES.map((zone, zoneIndex) => ({
        ...run.board.cells[Object.keys(run.board.cells).find((key) => run.board.cells[key as CellKey]) as CellKey]!,
        instanceId: `visual-test-${row}-${zone}`,
        heroId: run.selectedHeroes[(rowIndex * ALL_DEFENSE_ZONES.length + zoneIndex) % run.selectedHeroes.length],
        tier: (((rowIndex + zoneIndex) % 3) + 1) as HeroTier,
        hp: 72 + ((rowIndex * 11 + zoneIndex * 7) % 28),
        maxHp: 100,
        shield: 0,
        status: "active" as const,
        attackCooldownRemainingSeconds: 0,
      })))
    : null;

  const clickCell = (cellKey: CellKey) => {
    setFocusedCell(cellKey);
    if (visualTestFullBoard) return;
    if (pendingJackpotTierUp) { chooseJackpotTierUpTarget(cellKey); return; }
    const hero = board.cells[cellKey];
    if (mode === "pendingPlace" && placingInstanceId && !hero) {
      placePendingHero(placingInstanceId, cellKey);
      setPlacingInstanceId(null);
      setMode(null);
      return;
    }
    if (!hero && mode === "merge") {
      setSelectedCells([]);
      setFocusedCell(null);
      setMergeNotice("已取消選取。");
      return;
    }
    if (mode === "recycle" && hero) { recycleBoardHero(cellKey); return; }
    if (mode === "reposition") {
      if (!repositionFrom) { if (hero) setRepositionFrom(cellKey); return; }
      if (repositionFrom === cellKey) { setRepositionFrom(null); setFocusedCell(null); return; }
      finishReposition(repositionFrom, cellKey);
      return;
    }
    if (mode === "merge" && hero) {
      setSelectedCells((current) => {
        if (current.includes(cellKey)) return current.filter((key) => key !== cellKey);
        const anchor = current[0] ? board.cells[current[0]] : undefined;
        if (!anchor || (anchor.heroId === hero.heroId && anchor.tier === hero.tier && hero.tier < 3)) return current.length < maxMergeCount ? [...current, cellKey] : current;
        return [cellKey];
      });
      setMergeNotice(null);
    }
  };

  const mergeAnchor = selectedCells[0] ? board.cells[selectedCells[0]] : undefined;
  const canConfirmMerge = selectedCells.length >= minMergeCount
    && selectedCells.length <= maxMergeCount
    && !!mergeAnchor
    && mergeAnchor.tier < 3
    && selectedCells.every((cellKey) => {
      const hero = board.cells[cellKey];
      return hero?.heroId === mergeAnchor.heroId && hero.tier === mergeAnchor.tier;
    });
  const mergeConfirmLabel = canConfirmMerge
    ? "合成升階"
    : selectedCells.length === 0
      ? `需選 ${minMergeCount} 名`
      : `還差 ${Math.max(0, minMergeCount - selectedCells.length)} 名`;
  const confirmMerge = () => {
    if (!canConfirmMerge) {
      setMergeNotice(`請選擇至少 ${minMergeCount} 名相同英雄、相同 T 階。`);
      return;
    }
    const usedFreeMerge = selectedCells.length === 2;
    mergeSelection(selectedCells, selectedCells[0]);
    setSelectedCells([]);
    setFocusedCell(null);
    setMode(null);
    setMergeNotice(usedFreeMerge ? "兩名免費合成完成！" : "三名合成完成！");
  };

  // The mode toggles (合成/調度/回收) render into the Battle Console's toolbar
  // slot via portal when one is supplied (PREPARATION in the combined scene),
  // so the buttons live in the fixed-position console instead of being
  // anchored to the board's own (scaled, cover-cropped) coordinates -- while
  // the mode/selection state above stays right here next to clickCell, since
  // it only ever needs to talk to the board.
  const toolbarNode = interactive && !pendingJackpotTierUp ? <div className="bsv2-board-toolbar">
    <div className="bsv2-mode-buttons">
      <button className={`bsv2-kingdom-badge ${mode === "merge" ? "is-active" : ""}`} aria-pressed={mode === "merge"} onClick={() => { setMode(mode === "merge" ? null : "merge"); setSelectedCells([]); setMergeNotice(null); }}><img src="/battle-console/badge-merge.png" alt="合成" /></button>
      <button className={`bsv2-kingdom-badge ${mode === "reposition" ? "is-active" : ""}`} aria-pressed={mode === "reposition"} disabled={pendingRemaining <= 0} onClick={() => { setMode(mode === "reposition" ? null : "reposition"); setRepositionFrom(null); setMergeNotice(null); }}><img src="/battle-console/badge-reposition.png" alt="調度" /><i className="bsv2-kingdom-badge-count">{pendingRemaining}</i></button>
      <button className={`bsv2-kingdom-badge ${mode === "recycle" ? "is-active" : ""}`} aria-pressed={mode === "recycle"} onClick={() => setMode(mode === "recycle" ? null : "recycle")}><img src="/battle-console/badge-recycle.png" alt="回收" /></button>
      {pendingRemaining <= 0 && run.reposition.extraPurchasesThisWave < RUN_ENGINE_CONFIG.fateEnergy.extraRepositionPurchaseLimitPerWave && <button className="bsv2-buy-reposition" disabled={!run || run.fateEnergy.current < RUN_ENGINE_CONFIG.fateEnergy.extraRepositionCost} onClick={buyExtraReposition}>+1 調度 ({RUN_ENGINE_CONFIG.fateEnergy.extraRepositionCost})</button>}
    </div>
    {mode === "merge" && <div className="bsv2-mode-hint"><span>點選相同英雄、相同 T 階：{selectedCells.length}/{maxMergeCount} 名{run.pendingFreeMerge ? "（葫蘆免費合成，選滿 2 名即可合成，或繼續選第 3 名改為一般合成）" : ""}</span><button className="bsv2-confirm-btn" disabled={!canConfirmMerge} onClick={confirmMerge}>{mergeConfirmLabel}</button></div>}
    {mergeNotice && <p className="bsv2-merge-notice" role="status">{mergeNotice}</p>}
    {mode === "reposition" && <p className="bsv2-mode-hint">{repositionFrom ? "點選空格移動，或點選另一名英雄互換位置，立即扣除 1 次。" : "點選一名英雄，再點選空格或另一名英雄即可移動／互換。"}</p>}
    {mode === "recycle" && <p className="bsv2-mode-hint">點選棋盤英雄立即回收，換取命運能量。</p>}
  </div> : null;

  return <section className={`bsv2-board-section bsv2-forest-board ${embedded ? "bsv2-board-embedded" : ""}`}>
    <div className="bsv2-legacy-board-skin" aria-label="英雄舞台">
    <div className="bsv2-legacy-board-heading"><span><Swords size={15} />英雄舞台</span><small>{interactive ? "召喚、合成與調度英雄" : "英雄在此守住四條防線"}</small></div>
    {run.pending.heroes.length > 0 && <div className="bsv2-pending-zone" aria-label="待命區">
      <span><Sparkles size={13} />待命區</span>
      {run.pending.heroes.map((hero) => { const label = heroLabel(hero.heroId); return <button key={hero.instanceId} className={`bsv2-pending-card ${placingInstanceId === hero.instanceId ? "is-selected" : ""}`} style={{ "--hero-color": label.color } as React.CSSProperties} disabled={!interactive} onClick={() => { setMode("pendingPlace"); setPlacingInstanceId(hero.instanceId); }}><b>{label.icon}</b><small>{label.name} T{hero.tier}</small></button>; })}
      {placingInstanceId && <em>點選棋盤空格放置</em>}
    </div>}

    {pendingJackpotTierUp && <p className="bsv2-mode-banner is-jackpot"><Sparkles size={14} />五條就緒！點選一名 T1/T2 英雄直接升階。</p>}

    <div className={`bsv2-board-grid ${mode === "reposition" ? "is-repositioning" : ""}`}>
      {BOARD_ROWS.map((row, rowIndex) => ALL_DEFENSE_ZONES.map((zone) => {
        const cellKey = boardCellKey({ zone, row });
        const testHero = visualTestHeroes?.[rowIndex * ALL_DEFENSE_ZONES.length + (zone - 1)];
        const hero = testHero ?? board.cells[cellKey];
        const mergeCandidate = mode === "merge" && !!hero && !selectedCells.includes(cellKey) && (!mergeAnchor || (mergeAnchor.heroId === hero.heroId && mergeAnchor.tier === hero.tier && hero.tier < 3));
        const repositionTarget = mode === "reposition" && !!repositionFrom && repositionFrom !== cellKey;
        return <HeroCell key={cellKey} cellKey={cellKey} hero={hero} selected={focusedCell === cellKey || selectedCells.includes(cellKey) || repositionFrom === cellKey} mergeCandidate={mergeCandidate} repositionTarget={repositionTarget} hitAmount={hitCues[cellKey]} onClick={() => clickCell(cellKey)} disabled={visualTestFullBoard ? false : !interactive && !pendingJackpotTierUp} />;
      }))}
    </div>
    </div>

    {toolbarNode && (toolbarSlot ? createPortal(toolbarNode, toolbarSlot) : toolbarNode)}
  </section>;
}

// ---------------------------------------------------------------------------
// Wave Preview
// ---------------------------------------------------------------------------

function Bsv2WavePreview({ run }: { run: RunState }) {
  const acknowledgeWavePreview = useGameStore((state) => state.acknowledgeWavePreview);
  const waveDefinition = WAVES_BY_CHAPTER[run.chapterId][run.wave - 1];
  const counts = new Map<string, number>();
  waveDefinition?.batches.forEach((batch) => batch.entries.forEach((entry) => counts.set(entry.enemyId, (counts.get(entry.enemyId) ?? 0) + 1)));
  return <section className="bsv2-panel bsv2-wave-preview">
    <h2>第 {run.wave} 波即將降臨</h2>
    <div className="bsv2-wave-enemies">{Array.from(counts.entries()).map(([enemyId, count]) => <span key={enemyId}>{ENEMIES[enemyId as keyof typeof ENEMIES]?.name ?? enemyId} ×{count}</span>)}</div>
    {waveDefinition?.bossEncounter && <p className="bsv2-boss-flag"><Shield size={14} />Boss 波次</p>}
    <button className="bsv2-primary-btn" onClick={acknowledgeWavePreview}><Dices size={17} />擲出命運骰</button>
  </section>;
}

// ---------------------------------------------------------------------------
// Dice + Combo Choice
// ---------------------------------------------------------------------------

/** Classic 3x3 pip layout per face value, cells numbered row-major 1-9
 * (1 2 3 / 4 5 6 / 7 8 9). Renders as dots instead of a printed digit. */
const DIE_PIPS: Record<number, number[]> = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function DiceFace({ value }: { value: number }) {
  const active = DIE_PIPS[value] ?? [];
  return <span className="bsv2-die-face" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => i + 1).map((cell) => <i key={cell} className={active.includes(cell) ? "is-on" : ""} />)}</span>;
}

function Bsv2Dice({ run }: { run: RunState }) {
  const toggleDiceLock = useGameStore((state) => state.toggleDiceLock);
  const rerollDice = useGameStore((state) => state.rerollDice);
  const confirmFate = useGameStore((state) => state.confirmFate);
  // Remounting the row (via key) on every roll/reroll is what replays the
  // CSS toss-in animation below -- changing a die's face value in place
  // wouldn't retrigger a CSS animation on an already-mounted element.
  const rollKey = `${run.dice.rerollsLeft}-${run.dice.values.join("")}`;
  const mid = (run.dice.values.length - 1) / 2;
  // A die's `locked` flag reads as "kept" (engine/rule-function naming) --
  // the player instead clicks to SELECT a die for the next reroll, i.e. the
  // ones shown highlighted are locked === false. See orchestrator.rerollDice.
  const hasSelection = run.dice.locked.some((locked) => !locked);
  // Live preview of what THIS roll already qualifies for, updated on every
  // lock/reroll -- getEligibleComboEffects is a pure function of the dice
  // values, so this never touches run state, just previews it before the
  // player commits via 確認命運. Same NONE-only-when-sole-option filter
  // Bsv2ComboChoice uses, so the preview never contradicts the real choice
  // screen the player sees right after confirming.
  const eligibleChoices = getEligibleComboEffects(run.dice.values);
  const previewChoices = eligibleChoices.filter((choice) => choice.kind !== "NONE" || eligibleChoices.length === 1);
  // The preview card and the ornate dice-frame panel used to be one element,
  // which forced the frame's fixed-ratio background art to stretch to fit
  // the preview's variable length (0-4 combo chips) -- fragile (a % gap
  // against that now-auto height silently zeroed itself out, see prior fix)
  // and it could visibly grow tall enough to crowd the board above it. Now
  // they're two siblings in a plain flex column: the preview is a flat card
  // like Bsv2DiceHistory (no background art to fight), and the dice frame
  // goes back to a fixed aspect-ratio since it only ever holds a constant 5
  // dice + 2 buttons again.
  return <div className="bsv2-dice-stack">
    {previewChoices.length > 0 && <div className="bsv2-dice-preview" aria-live="polite">
      <span className="bsv2-dice-preview-label">目前骰型：</span>
      {previewChoices.map((choice) => <span key={choice.kind} className={`bsv2-dice-preview-chip ${choice.kind === "NONE" ? "is-none" : ""}`}><b>{COMBO_LABELS[choice.kind]}</b>{previewComboEffect(choice.effect).value}</span>)}
    </div>}
    <section className="bsv2-panel bsv2-dice">
      <div className="bsv2-dice-row" key={rollKey}>{run.dice.values.map((value, index) => {
        const selected = !run.dice.locked[index];
        return <button key={index} className={`bsv2-die ${selected ? "is-selected" : ""}`} style={{ "--toss-delay": `${index * 70}ms`, "--toss-x": `${(index - mid) * 18}px`, "--toss-rot": `${(index % 2 === 0 ? -1 : 1) * (28 + index * 6)}deg`, "--toss-spin": `${(index % 2 === 0 ? 1 : -1) * (50 + index * 10)}deg` } as React.CSSProperties} onClick={() => toggleDiceLock(index)} aria-pressed={selected} aria-label={`骰子 ${index + 1}：點數 ${value}${selected ? "，已選擇重骰" : ""}`}><DiceFace value={value} />{selected && <i className="bsv2-die-badge"><RotateCcw size={9} /></i>}</button>;
      })}</div>
      <div className="bsv2-action-row">
        <button className="bsv2-secondary-btn" disabled={run.dice.rerollsLeft <= 0 || !hasSelection} onClick={rerollDice}><RotateCcw size={15} />重骰 ({run.dice.rerollsLeft})</button>
        <button className="bsv2-primary-btn" onClick={confirmFate}><Sparkles size={15} />確認命運</button>
      </div>
    </section>
  </div>;
}

function Bsv2ComboChoice({ run }: { run: RunState }) {
  const chooseComboEffect = useGameStore((state) => state.chooseComboEffect);
  const choices = run.pendingComboChoices.filter((choice: DiceComboDefinition) => choice.kind !== "NONE" || run.pendingComboChoices.length === 1);
  const [celebration, setCelebration] = useState<DiceComboKind | null>(null);
  const choose = (kind: DiceComboKind) => {
    if (kind !== "FULL_HOUSE" && kind !== "FIVE_KIND") { chooseComboEffect(kind); return; }
    setCelebration(kind);
    window.setTimeout(() => chooseComboEffect(kind), 760);
  };
  return <section className="bsv2-panel bsv2-combo-choice">
    <h2>命運已定，選擇一項效果</h2>
    <div className="bsv2-combo-list">{choices.map((choice) => {
      const preview = previewComboEffect(choice.effect);
      return <button key={choice.kind} className="bsv2-combo-card" disabled={celebration !== null} onClick={() => choose(choice.kind)}>
        <span className="bsv2-combo-heading"><b>{COMBO_LABELS[choice.kind]}</b><i>{preview.tag}</i></span>
        <strong>{preview.value}</strong>
        <span className="bsv2-combo-summary">{describeComboEffect(choice.effect)}</span>
        <small>{preview.followUp}</small>
      </button>;
    })}</div>
    {celebration && <div className={`bsv2-special-combo-flare is-${celebration.toLowerCase()}`} role="status" aria-live="polite"><span>{celebration === "FULL_HOUSE" ? "葫蘆成立" : "五條大獎"}</span><b>{celebration === "FULL_HOUSE" ? "下一次合成僅需兩名" : "指定英雄直接升階"}</b><i>{celebration === "FULL_HOUSE" ? "◇ ◇ ◇" : "✦ ✦ ✦"}</i></div>}
  </section>;
}

// ---------------------------------------------------------------------------
// Battle Console -- the bottom "kingdom war-room" console (素材/CLAUDE_王國戰場
// 控制台_PROMPT.txt). Fully expanded during PREPARATION (castle HP, summon
// actions, the merge/reposition/recycle toolbar portaled in from Bsv2Board,
// and the Start Battle CTA); slides down to a slim wall-strip for
// COMBAT_RUNNING/REWARD_RESOLVE so the battlefield gets its vertical space
// back, then slides back up once PREPARATION returns.
// ---------------------------------------------------------------------------

function BattleConsole({ run, onToolbarSlotChange }: { run: RunState; onToolbarSlotChange: (node: HTMLDivElement | null) => void }) {
  const spendEnergyForRandomSummon = useGameStore((state) => state.spendEnergyForRandomSummon);
  const spendEnergyForChosenSummon = useGameStore((state) => state.spendEnergyForChosenSummon);
  const confirmFormation = useGameStore((state) => state.confirmFormation);
  const declineFreeMerge = useGameStore((state) => state.declineFreeMerge);
  const [pickingHero, setPickingHero] = useState(false);
  const isPrep = run.phase === "PREPARATION";
  const ready = run.pending.heroes.length === 0 && !run.pendingHeroChoice && !run.pendingFreeMerge && !run.pendingJackpotTierUp;
  const hasOpeningSummon = run.initialFreeRandomSummonAvailable;
  const castleRatio = Math.max(0, run.castle.hp / run.castle.maxHp);
  const castleLabel = `${Math.max(0, Math.round(run.castle.hp))}/${run.castle.maxHp}`;

  return <div className={`battle-console ${isPrep ? "is-expanded" : "is-collapsed"}`}>
    <div className="battle-console__expanded">
      <img className="battle-console__rim" src="/battle-console/wall-frame-wide.png" alt="" aria-hidden="true" />
      <div className="battle-console__body">
        <div className="battle-console__row">
          <div className="battle-console__chip battle-console__chip--hp" aria-label={`守望堡生命 ${castleLabel}`}>
            <Shield size={17} fill="currentColor" />
            <div><span>守望堡生命</span><strong>{castleLabel}</strong><i><b style={{ width: `${castleRatio * 100}%` }} /></i></div>
          </div>
          <button className="battle-console__chip battle-console__chip--summon" disabled={!hasOpeningSummon && run.fateEnergy.current < RUN_ENGINE_CONFIG.fateEnergy.randomSummonCost} onClick={spendEnergyForRandomSummon}>
            <Zap size={17} /><div><span>{hasOpeningSummon ? "開局隨機召喚" : "隨機召喚"}</span><strong>{hasOpeningSummon ? "免費" : RUN_ENGINE_CONFIG.fateEnergy.randomSummonCost}</strong></div>
          </button>
          <button className="battle-console__chip battle-console__chip--summon is-arcane" disabled={run.fateEnergy.current < RUN_ENGINE_CONFIG.fateEnergy.specifiedSummonCost} onClick={() => setPickingHero(true)}>
            <Sparkles size={17} /><div><span>指定召喚</span><strong>{RUN_ENGINE_CONFIG.fateEnergy.specifiedSummonCost}</strong></div>
          </button>
        </div>
        <div className="battle-console__energy"><Coins size={11} /><span>命運能量</span><strong>{run.fateEnergy.current}/{run.fateEnergy.max}</strong></div>
        {pickingHero && <div className="bsv2-hero-pick-row">{run.selectedHeroes.map((heroId) => <HeroPickCard key={heroId} heroId={heroId} onClick={() => { spendEnergyForChosenSummon(heroId); setPickingHero(false); }} />)}<button className="bsv2-cancel-pick" onClick={() => setPickingHero(false)}><X size={14} /></button></div>}
        {run.pendingFreeMerge && <div className="bsv2-free-merge-notice" role="status">
          <span>葫蘆／熔合催化劑待用：合成 2 名相同英雄即可免費升階，找不到就先放棄，不影響開戰。</span>
          <button type="button" onClick={declineFreeMerge}>放棄免費合成</button>
        </div>}
        <div className="battle-console__row battle-console__row--action">
          <div className="battle-console__toolbar-slot" ref={onToolbarSlotChange} />
          <button className="battle-console__cta" disabled={!ready} onClick={confirmFormation}><img src="/battle-console/battle-cta-red.png" alt="確認陣型，開戰！" /></button>
        </div>
      </div>
    </div>
    <div className="battle-console__collapsed">
      <img className="battle-console__collapsed-bg" src="/battle-console/wall-frame-long.png" alt="" aria-hidden="true" />
      <div className="battle-console__collapsed-chip" aria-label={`守望堡生命 ${castleLabel}`}><Shield size={12} fill="currentColor" /><strong>{castleLabel}</strong></div>
      <div className="battle-console__collapsed-chip" aria-label={`命運能量 ${run.fateEnergy.current}/${run.fateEnergy.max}`}><Coins size={12} /><strong>{run.fateEnergy.current}/{run.fateEnergy.max}</strong></div>
    </div>
  </div>;
}

function Bsv2BattleLog({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);
  return <section className={`bsv2-battle-log ${expanded ? "is-expanded" : ""}`} aria-label="戰鬥 Log">
    <button type="button" onClick={() => setExpanded((open) => !open)} aria-expanded={expanded} aria-controls="battle-log-message"><Gift size={12} /><span>戰鬥 Log</span><ChevronDown size={13} /></button>
    {expanded && <p id="battle-log-message">{message}</p>}
  </section>;
}

function Bsv2HeroChoiceOverlay({ run }: { run: RunState }) {
  const chooseSummonHero = useGameStore((state) => state.chooseSummonHero);
  if (!run.pendingHeroChoice) return null;
  return <div className="bsv2-dialog-backdrop"><div className="bsv2-modal">
    <p className="bsv2-kicker">三條的獎賞</p><h3>指定一位英雄</h3>
    <div className="bsv2-hero-pick-row">{run.selectedHeroes.map((heroId) => <HeroPickCard key={heroId} heroId={heroId} onClick={() => chooseSummonHero(heroId)} />)}</div>
  </div></div>;
}

// ---------------------------------------------------------------------------
// Reward overlay (Talent + Blessing)
// ---------------------------------------------------------------------------

function Bsv2RewardOverlay({ run }: { run: RunState }) {
  const chooseTalentReward = useGameStore((state) => state.chooseTalentReward);
  const chooseBlessingReward = useGameStore((state) => state.chooseBlessingReward);
  const advanceToNextWave = useGameStore((state) => state.advanceToNextWave);
  if (run.phase !== "REWARD_RESOLVE") return null;
  const bothResolved = run.talentChoices.length === 0 && run.blessingChoices.length === 0;
  return <div className="bsv2-dialog-backdrop"><div className="bsv2-modal bsv2-reward-modal">
    <p className="bsv2-kicker">幕間獎賞</p>
    {run.talentChoices.length > 0 && <>
      <h3>選擇一項天賦</h3>
      <div className="bsv2-choice-grid">{run.talentChoices.map((talent: TalentDefinition) => { const display = TALENT_DISPLAY[talent.id] ?? { label: talent.id, description: talent.category }; return <button key={talent.id} className="bsv2-choice-card" onClick={() => chooseTalentReward(talent.id)}><b>{display.label}</b><span>{display.description}</span></button>; })}</div>
    </>}
    {run.talentChoices.length === 0 && run.blessingChoices.length > 0 && <>
      <h3>選擇一項祝福</h3>
      <div className="bsv2-choice-grid">{run.blessingChoices.map((blessing: BlessingDefinition) => { const display = BLESSING_DISPLAY[blessing.id] ?? { label: blessing.id, description: "" }; return <button key={blessing.id} className="bsv2-choice-card is-blessing" onClick={() => chooseBlessingReward(blessing.id)}><b>{display.label}</b><span>{display.description}</span></button>; })}</div>
    </>}
    {bothResolved && <button className="bsv2-primary-btn" onClick={advanceToNextWave}>{run.wave >= TOTAL_WAVES ? "揭開結局" : "前往下一波"}<ChevronLeft size={16} className="bsv2-flip" /></button>}
  </div></div>;
}

// ---------------------------------------------------------------------------
// Result overlay
// ---------------------------------------------------------------------------

function Bsv2ResultOverlay({ run }: { run: RunState }) {
  const restartRun = useGameStore((state) => state.restartRun);
  const openScreen = useGameStore((state) => state.openScreen);
  const activeDungeonId = useGameStore((state) => state.activeDungeonId);
  const dungeonDisplay: DungeonId | undefined = activeDungeonId;
  if (run.phase !== "RUN_WIN" && run.phase !== "RUN_LOSE") return null;
  const won = run.phase === "RUN_WIN";
  return <div className="bsv2-dialog-backdrop"><div className={`bsv2-modal bsv2-result-modal ${won ? "is-victory" : "is-defeat"}`}>
    <div className="bsv2-result-seal">{won ? <Sparkles size={32} /> : <Shield size={32} />}</div>
    <h3>{won ? "勝利！" : "本局失利"}</h3>
    <span>{run.message}</span>
    <div className="bsv2-result-stats"><div><b>{run.wave}</b><small>抵達波次</small></div><div><b>{run.talents.length}</b><small>取得天賦</small></div><div><b>{Math.max(0, Math.round(run.castle.hp))}</b><small>城堡生命</small></div></div>
    {dungeonDisplay ? <><button className="bsv2-primary-btn" onClick={() => openScreen("dungeon")}><Swords size={16} />查看試煉之門</button><button className="bsv2-text-btn" onClick={() => openScreen("title")}>回到王都</button></> : <><button className="bsv2-primary-btn" onClick={restartRun}><RotateCcw size={16} />再玩一局</button><button className="bsv2-text-btn" onClick={() => openScreen("title")}>回到首頁</button></>}
  </div></div>;
}

// ---------------------------------------------------------------------------
// Pause overlay
// ---------------------------------------------------------------------------

function Bsv2PauseOverlay() {
  const isPaused = useGameStore((state) => state.isPaused);
  const togglePause = useGameStore((state) => state.togglePause);
  const autoSpeed = useGameStore((state) => state.autoSpeed);
  const setAutoSpeed = useGameStore((state) => state.setAutoSpeed);
  const openScreen = useGameStore((state) => state.openScreen);
  if (!isPaused) return null;
  return <div className="bsv2-dialog-backdrop"><div className="bsv2-modal bsv2-pause-modal">
    <Pause size={28} fill="currentColor" /><h3>暫停演出</h3>
    <div className="bsv2-speed-choice"><span>戰鬥速度</span>{([1, 2, 4] as const).map((speed) => <button key={speed} className={autoSpeed === speed ? "is-selected" : ""} onClick={() => setAutoSpeed(speed)}>{speed}×</button>)}</div>
    <button className="bsv2-primary-btn" onClick={togglePause}><Play size={16} fill="currentColor" />繼續戰鬥</button>
    <button className="bsv2-text-btn" onClick={() => openScreen("title")}>離開本局</button>
  </div></div>;
}

// ---------------------------------------------------------------------------
// Combat tick loop
// ---------------------------------------------------------------------------

function useCombatLoop() {
  const phase = useGameStore((state) => state.run?.phase);
  const isPaused = useGameStore((state) => state.isPaused);
  const autoSpeed = useGameStore((state) => state.autoSpeed);
  const combatTick = useGameStore((state) => state.combatTick);
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (phase !== "COMBAT_RUNNING" || isPaused) return;
    let previous = performance.now();
    const step = (now: number) => {
      const delta = Math.min(0.08, (now - previous) / 1000) * autoSpeed;
      previous = now;
      combatTick(delta);
      timerRef.current = requestAnimationFrame(step);
    };
    timerRef.current = requestAnimationFrame(step);
    return () => { if (timerRef.current) cancelAnimationFrame(timerRef.current); };
  }, [phase, isPaused, autoSpeed, combatTick]);
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function BattleScreenV2() {
  const run = useGameStore((state) => state.run);
  useCombatLoop();
  // Portal target for Bsv2Board's merge/reposition/recycle toolbar (see
  // BattleConsole/Bsv2Board) -- lets the buttons render fixed to the Battle
  // Console instead of the board's own scaled/cover-cropped coordinates,
  // without lifting the mode/selection state out of Bsv2Board.
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null);
  // TitleScreen (GameScreen.tsx) locks the page against browser drag/bounce
  // while it's mounted and unlocks on unmount -- since it unmounts the moment
  // the player enters battle, this screen needs the exact same lock itself, or
  // the whole page becomes a normal draggable/bouncing webpage during combat.
  useEffect(() => {
    // Skip elements inside .bsv2-modal (reward/talent choice, dice history, etc.)
    // so their own overflow-y:auto scrolling still works -- only the page itself
    // should be pinned.
    const stopPan = (event: TouchEvent) => { if (!(event.target as Element | null)?.closest(".bsv2-modal, .bsv2-dice-history")) event.preventDefault(); };
    window.addEventListener("touchmove", stopPan, { passive: false });
    const root = document.documentElement;
    const body = document.body;
    root.classList.add("lobby-viewport-lock");
    body.classList.add("lobby-viewport-lock");
    return () => {
      window.removeEventListener("touchmove", stopPan);
      root.classList.remove("lobby-viewport-lock");
      body.classList.remove("lobby-viewport-lock");
    };
  }, []);
  if (!run) return null;

  const boardInteractive = run.phase === "PREPARATION";
  const visualTestFullBoard = import.meta.env.DEV && new URLSearchParams(window.location.search).has("fullBoardPreview");
  const waveDefinition = WAVES_BY_CHAPTER[run.chapterId][run.wave - 1];
  // WAVE_PREVIEW/DICE_DECISION/DICE_RESOLVE all join the combined scene now (素材/
  // CLAUDE_王國戰場控制台 follow-ups): the whole "roll fate, resolve it, see what's
  // coming" sequence happens as floating cards over the live battlefield instead of
  // swapping to a separate full-screen dark panel.
  const isCombinedScene = run.phase === "PREPARATION" || run.phase === "COMBAT_RUNNING" || run.phase === "REWARD_RESOLVE" || run.phase === "WAVE_PREVIEW" || run.phase === "DICE_DECISION" || run.phase === "DICE_RESOLVE";
  const boardInScene = isCombinedScene
    ? <Bsv2Board board={run.board} interactive={boardInteractive} pendingJackpotTierUp={run.pendingJackpotTierUp} embedded visualTestFullBoard={visualTestFullBoard} toolbarSlot={toolbarSlot} />
    : undefined;

  return <section className={`bsv2-screen ${isCombinedScene ? "bsv2-screen--combined" : ""}`}>
    <Bsv2Header run={run} />
    <RouteStrip waveDefinition={waveDefinition} waveRuntime={run.waveRuntime} wave={run.wave} chapterId={run.chapterId} boardOverlay={boardInScene} />
    <Bsv2BattleLog message={run.message} />
    {isCombinedScene
      ? <>
          <BattleConsole run={run} onToolbarSlotChange={setToolbarSlot} />
          {run.phase === "WAVE_PREVIEW" && <Bsv2WavePreview run={run} />}
          {run.phase === "DICE_DECISION" && <Bsv2Dice run={run} />}
          {run.phase === "DICE_RESOLVE" && <Bsv2ComboChoice run={run} />}
        </>
      : <div className="bsv2-bottom-overlay" />}
    <Bsv2HeroChoiceOverlay run={run} />
    <Bsv2RewardOverlay run={run} />
    <Bsv2PauseOverlay />
    <Bsv2ResultOverlay run={run} />
  </section>;
}
