/**
 * Phase 9c: Battle Screen for the new Run Engine (client/src/game/run-engine/**).
 *
 * Deliberately simplified visuals compared to the old BattleScreen (no frame-
 * sprite animations, no hand-painted battlefield backdrop) -- per the user's own
 * Phase 2 scoping decision ("UI 可以先簡化"), this phase's job is a fully working,
 * correct control surface for Dice -> Summon -> Merge -> Formation -> Auto Combat
 * -> Talent/Blessing, not visual polish. It reuses HEROES/ENEMIES (client/src/
 * game/config.ts) purely for name/color/icon display -- those are meta-layer
 * display data, not combat rules, so borrowing them doesn't couple this screen to
 * the old engine.
 */
import { useEffect, useRef, useState } from "react";
import "./battleScreenV2.css";
import { ChevronLeft, Coins, Dices, Gift, Heart, Lock, Pause, Play, RotateCcw, Shield, Sparkles, Swords, X, Zap } from "lucide-react";
import { ENEMIES, HEROES } from "@/game/config";
import { RUN_ENGINE_CONFIG } from "@/game/run-engine/config";
import { ENEMY_DEFINITIONS } from "@/game/run-engine/enemies";
import { ALL_DEFENSE_ZONES, BOARD_ROWS, boardCellKey } from "@/game/run-engine/types";
import type {
  BlessingDefinition,
  BoardState,
  CellKey,
  DiceComboDefinition,
  DiceComboEffect,
  DiceComboKind,
  HeroInstance,
  RouteId,
  RouteState,
  RunState,
  TalentDefinition,
} from "@/game/run-engine/types";
import { WAVE_DEFINITIONS } from "@/game/run-engine/waves";
import { useGameStore } from "@/game/store";
import type { DungeonId, HeroId } from "@/game/types";

const TOTAL_WAVES = WAVE_DEFINITIONS.length;

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

function heroLabel(heroId: HeroId) {
  const definition = HEROES[heroId];
  return { name: definition.name, color: definition.color, icon: definition.icon };
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Bsv2Header({ run }: { run: RunState }) {
  const openScreen = useGameStore((state) => state.openScreen);
  const togglePause = useGameStore((state) => state.togglePause);
  const isPaused = useGameStore((state) => state.isPaused);
  const ratio = run.castle.hp / run.castle.maxHp;
  return <header className="bsv2-header">
    <button className="bsv2-icon-btn" onClick={() => openScreen("title")} aria-label="離開本局"><ChevronLeft size={18} /></button>
    <div className="bsv2-castle"><Heart size={14} fill="currentColor" /><div><span>城堡</span><strong>{Math.max(0, Math.round(run.castle.hp))}/{run.castle.maxHp}</strong></div><i><b style={{ width: `${Math.max(0, ratio) * 100}%` }} /></i></div>
    <div className="bsv2-wave"><small>WAVE</small><strong>{String(run.wave).padStart(2, "0")}</strong><span>/ {TOTAL_WAVES}</span></div>
    {run.phase === "COMBAT_RUNNING" && <button className="bsv2-icon-btn" onClick={togglePause} aria-label={isPaused ? "繼續" : "暫停"}>{isPaused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}</button>}
  </header>;
}

// ---------------------------------------------------------------------------
// Route Strip -- 4 lanes above the board, aligned to the board's 4 DefenseZone
// columns so the Route-to-Board correspondence (玩法核心.txt 五/六) is visible.
// ---------------------------------------------------------------------------

function RouteStrip({ routes, activeRoutes }: { routes: RouteState[]; activeRoutes: RouteId[] }) {
  const enemies = routes.flatMap((route) => route.enemies);
  return <div className="bsv2-route-strip" aria-label="敵軍道路">
    {ALL_DEFENSE_ZONES.map((zone) => <div key={zone} className={`bsv2-route-lane ${activeRoutes.includes(zone) ? "is-active" : "is-inactive"}`}><small>路 {zone}</small></div>)}
    <div className="bsv2-route-overlay">
      {enemies.map((enemy) => {
        const definition = ENEMY_DEFINITIONS[enemy.defId];
        const meta = ENEMIES[enemy.defId as keyof typeof ENEMIES];
        const minZone = Math.min(...enemy.occupiedRoutes);
        const span = enemy.occupiedRoutes.length;
        const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        return <div key={enemy.instanceId} className={`bsv2-enemy-marker ${enemy.blockedBy ? "is-blocked" : ""} ${definition?.tags.includes("boss") ? "is-boss" : ""}`} style={{ left: `${((minZone - 1) / 4) * 100}%`, width: `${(span / 4) * 100}%`, top: `${Math.min(96, enemy.pathProgress * 100)}%`, "--enemy-color": meta?.color ?? "#8098c0" } as React.CSSProperties}>
          <i /><b><span style={{ width: `${hpRatio * 100}%` }} /></b>
        </div>;
      })}
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// Board (4x4) + Pending Zone
// ---------------------------------------------------------------------------

type BoardMode = "merge" | "reposition" | "recycle" | "pendingPlace" | null;

function HeroCell({ hero, selected, onClick, disabled }: { hero: HeroInstance | undefined; selected: boolean; onClick: () => void; disabled: boolean }) {
  if (!hero) return <button className="bsv2-cell is-empty" onClick={onClick} disabled={disabled} aria-label="空格" />;
  const label = heroLabel(hero.heroId);
  const hpRatio = Math.max(0, hero.hp / hero.maxHp);
  return <button className={`bsv2-cell is-filled ${selected ? "is-selected" : ""} ${hero.status === "downed" ? "is-downed" : ""}`} style={{ "--hero-color": label.color } as React.CSSProperties} onClick={onClick} disabled={disabled} aria-label={`${label.name} T${hero.tier}，生命 ${Math.ceil(hero.hp)}/${hero.maxHp}`}>
    <span className="bsv2-cell-icon">{label.icon}</span>
    <b className="bsv2-cell-tier">T{hero.tier}</b>
    {hero.shield > 0 && <i className="bsv2-cell-shield"><Shield size={9} fill="currentColor" /></i>}
    {hero.status === "downed" && <span className="bsv2-cell-downed">倒地</span>}
    <span className="bsv2-cell-hp"><em style={{ width: `${hpRatio * 100}%` }} /></span>
  </button>;
}

function Bsv2Board({ board, interactive, pendingJackpotTierUp }: { board: BoardState; interactive: boolean; pendingJackpotTierUp: boolean }) {
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

  if (!run) return null;
  const cap = run.pendingFreeMerge ? 2 : 3;

  const clickCell = (cellKey: CellKey) => {
    if (pendingJackpotTierUp) { chooseJackpotTierUpTarget(cellKey); return; }
    const hero = board.cells[cellKey];
    if (mode === "pendingPlace" && placingInstanceId && !hero) {
      placePendingHero(placingInstanceId, cellKey);
      setPlacingInstanceId(null);
      setMode(null);
      return;
    }
    if (mode === "recycle" && hero) { recycleBoardHero(cellKey); return; }
    if (mode === "reposition") {
      if (!repositionFrom) { if (hero) setRepositionFrom(cellKey); return; }
      if (repositionFrom !== cellKey) repositionHero(repositionFrom, cellKey);
      setRepositionFrom(null);
      return;
    }
    if (mode === "merge" && hero) {
      if (selectedCells.includes(cellKey)) { setSelectedCells(selectedCells.filter((key) => key !== cellKey)); return; }
      const anchor = selectedCells[0] ? board.cells[selectedCells[0]] : undefined;
      if (anchor && (anchor.heroId !== hero.heroId || anchor.tier !== hero.tier)) { setSelectedCells([cellKey]); return; }
      if (selectedCells.length < cap) setSelectedCells([...selectedCells, cellKey]);
    }
  };

  const confirmMerge = () => { if (selectedCells.length === cap) mergeSelection(selectedCells, selectedCells[0]); setSelectedCells([]); };
  const pendingRemaining = run.reposition.baseAllowance - run.reposition.usedThisWave;

  return <section className="bsv2-board-section">
    {run.pending.heroes.length > 0 && <div className="bsv2-pending-zone" aria-label="待命區">
      <span><Sparkles size={13} />待命區</span>
      {run.pending.heroes.map((hero) => { const label = heroLabel(hero.heroId); return <button key={hero.instanceId} className={`bsv2-pending-card ${placingInstanceId === hero.instanceId ? "is-selected" : ""}`} style={{ "--hero-color": label.color } as React.CSSProperties} disabled={!interactive} onClick={() => { setMode("pendingPlace"); setPlacingInstanceId(hero.instanceId); }}><b>{label.icon}</b><small>{label.name} T{hero.tier}</small></button>; })}
      {placingInstanceId && <em>點選棋盤空格放置</em>}
    </div>}

    {pendingJackpotTierUp && <p className="bsv2-mode-banner is-jackpot"><Sparkles size={14} />五條就緒！點選一名 T1/T2 英雄直接升階。</p>}

    <div className="bsv2-board-grid">
      {BOARD_ROWS.map((row) => ALL_DEFENSE_ZONES.map((zone) => {
        const cellKey = boardCellKey({ zone, row });
        return <HeroCell key={cellKey} hero={board.cells[cellKey]} selected={selectedCells.includes(cellKey) || repositionFrom === cellKey} onClick={() => clickCell(cellKey)} disabled={!interactive && !pendingJackpotTierUp} />;
      }))}
    </div>

    {interactive && !pendingJackpotTierUp && <div className="bsv2-board-toolbar">
      <div className="bsv2-mode-buttons">
        <button className={mode === "merge" ? "is-active" : ""} onClick={() => { setMode(mode === "merge" ? null : "merge"); setSelectedCells([]); }}><Sparkles size={14} />合成</button>
        <button className={mode === "reposition" ? "is-active" : ""} onClick={() => { setMode(mode === "reposition" ? null : "reposition"); setRepositionFrom(null); }}>調度 {pendingRemaining}</button>
        <button className={mode === "recycle" ? "is-active" : ""} onClick={() => setMode(mode === "recycle" ? null : "recycle")}><X size={14} />回收</button>
        {pendingRemaining <= 0 && <button className="bsv2-buy-reposition" disabled={!run || run.fateEnergy.current < RUN_ENGINE_CONFIG.fateEnergy.extraRepositionCost} onClick={buyExtraReposition}>+1 調度 ({RUN_ENGINE_CONFIG.fateEnergy.extraRepositionCost})</button>}
      </div>
      {mode === "merge" && <div className="bsv2-mode-hint"><span>已選 {selectedCells.length}/{cap} 名{run.pendingFreeMerge ? "（葫蘆：僅需 2 名）" : ""}</span><button className="bsv2-confirm-btn" disabled={selectedCells.length !== cap} onClick={confirmMerge}>合成升階</button></div>}
      {mode === "reposition" && <p className="bsv2-mode-hint">{repositionFrom ? "點選目標空格或英雄以交換" : "點選要移動的英雄"}</p>}
      {mode === "recycle" && <p className="bsv2-mode-hint">點選棋盤英雄立即回收，換取命運能量。</p>}
    </div>}
  </section>;
}

// ---------------------------------------------------------------------------
// Wave Preview
// ---------------------------------------------------------------------------

function Bsv2WavePreview({ run }: { run: RunState }) {
  const acknowledgeWavePreview = useGameStore((state) => state.acknowledgeWavePreview);
  const waveDefinition = WAVE_DEFINITIONS[run.wave - 1];
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

function Bsv2Dice({ run }: { run: RunState }) {
  const toggleDiceLock = useGameStore((state) => state.toggleDiceLock);
  const rerollDice = useGameStore((state) => state.rerollDice);
  const confirmFate = useGameStore((state) => state.confirmFate);
  return <section className="bsv2-panel bsv2-dice">
    <div className="bsv2-dice-topline"><span>命運骰盅</span><strong>尚可重骰 {run.dice.rerollsLeft} 次</strong></div>
    <div className="bsv2-dice-row">{run.dice.values.map((value, index) => <button key={index} className={`bsv2-die ${run.dice.locked[index] ? "is-locked" : ""}`} onClick={() => toggleDiceLock(index)} aria-label={`骰子 ${index + 1}：${value}`}><b>{value}</b>{run.dice.locked[index] && <i><Lock size={10} /></i>}</button>)}</div>
    <div className="bsv2-action-row">
      <button className="bsv2-secondary-btn" disabled={run.dice.rerollsLeft <= 0} onClick={rerollDice}><RotateCcw size={15} />重骰</button>
      <button className="bsv2-primary-btn" onClick={confirmFate}><Sparkles size={15} />確認命運</button>
    </div>
  </section>;
}

function Bsv2ComboChoice({ run }: { run: RunState }) {
  const chooseComboEffect = useGameStore((state) => state.chooseComboEffect);
  const choices = run.pendingComboChoices.filter((choice: DiceComboDefinition) => choice.kind !== "NONE" || run.pendingComboChoices.length === 1);
  return <section className="bsv2-panel bsv2-combo-choice">
    <h2>命運已定，選擇一項效果</h2>
    <div className="bsv2-combo-list">{choices.map((choice) => <button key={choice.kind} className="bsv2-combo-card" onClick={() => chooseComboEffect(choice.kind)}><b>{COMBO_LABELS[choice.kind]}</b><span>{describeComboEffect(choice.effect)}</span></button>)}</div>
  </section>;
}

// ---------------------------------------------------------------------------
// Preparation panel (Fate Energy summon)
// ---------------------------------------------------------------------------

function Bsv2Preparation({ run }: { run: RunState }) {
  const spendEnergyForRandomSummon = useGameStore((state) => state.spendEnergyForRandomSummon);
  const spendEnergyForChosenSummon = useGameStore((state) => state.spendEnergyForChosenSummon);
  const confirmFormation = useGameStore((state) => state.confirmFormation);
  const [pickingHero, setPickingHero] = useState(false);
  const ready = run.pending.heroes.length === 0 && !run.pendingHeroChoice && !run.pendingFreeMerge && !run.pendingJackpotTierUp;
  return <section className="bsv2-panel bsv2-preparation">
    <div className="bsv2-energy-row"><Coins size={15} /><span>命運能量</span><strong>{run.fateEnergy.current}/{run.fateEnergy.max}</strong></div>
    <div className="bsv2-action-row">
      <button className="bsv2-secondary-btn" disabled={run.fateEnergy.current < RUN_ENGINE_CONFIG.fateEnergy.randomSummonCost} onClick={spendEnergyForRandomSummon}><Zap size={14} />隨機召喚 ({RUN_ENGINE_CONFIG.fateEnergy.randomSummonCost})</button>
      <button className="bsv2-secondary-btn" disabled={run.fateEnergy.current < RUN_ENGINE_CONFIG.fateEnergy.specifiedSummonCost} onClick={() => setPickingHero(true)}><Sparkles size={14} />指定召喚 ({RUN_ENGINE_CONFIG.fateEnergy.specifiedSummonCost})</button>
    </div>
    {pickingHero && <div className="bsv2-hero-pick-row">{run.selectedHeroes.map((heroId) => { const label = heroLabel(heroId); return <button key={heroId} style={{ "--hero-color": label.color } as React.CSSProperties} onClick={() => { spendEnergyForChosenSummon(heroId); setPickingHero(false); }}>{label.icon} {label.name}</button>; })}<button className="bsv2-cancel-pick" onClick={() => setPickingHero(false)}><X size={14} /></button></div>}
    <button className="bsv2-primary-btn bsv2-battle-btn" disabled={!ready} onClick={confirmFormation}><Swords size={16} />確認陣型，開戰！</button>
  </section>;
}

function Bsv2HeroChoiceOverlay({ run }: { run: RunState }) {
  const chooseSummonHero = useGameStore((state) => state.chooseSummonHero);
  if (!run.pendingHeroChoice) return null;
  return <div className="bsv2-dialog-backdrop"><div className="bsv2-modal">
    <p className="bsv2-kicker">三條的獎賞</p><h3>指定一位英雄</h3>
    <div className="bsv2-hero-pick-row">{run.selectedHeroes.map((heroId) => { const label = heroLabel(heroId); return <button key={heroId} style={{ "--hero-color": label.color } as React.CSSProperties} onClick={() => chooseSummonHero(heroId)}>{label.icon} {label.name}</button>; })}</div>
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
  if (!run) return null;

  const showRoutes = run.waveRuntime !== undefined;
  const boardInteractive = run.phase === "PREPARATION";
  const waveDefinition = WAVE_DEFINITIONS[run.wave - 1];

  return <section className="bsv2-screen">
    <Bsv2Header run={run} />
    {showRoutes && run.waveRuntime && <RouteStrip routes={run.waveRuntime.routes} activeRoutes={waveDefinition?.activeRoutes ?? []} />}
    {run.phase === "WAVE_PREVIEW" && <Bsv2WavePreview run={run} />}
    {run.phase === "DICE_DECISION" && <Bsv2Dice run={run} />}
    {run.phase === "DICE_RESOLVE" && <Bsv2ComboChoice run={run} />}
    {(run.phase === "PREPARATION" || run.phase === "COMBAT_RUNNING" || run.phase === "REWARD_RESOLVE") && <Bsv2Board board={run.board} interactive={boardInteractive} pendingJackpotTierUp={run.pendingJackpotTierUp} />}
    {run.phase === "PREPARATION" && <Bsv2Preparation run={run} />}
    <p className="bsv2-message"><Gift size={13} />{run.message}</p>
    <Bsv2HeroChoiceOverlay run={run} />
    <Bsv2RewardOverlay run={run} />
    <Bsv2PauseOverlay />
    <Bsv2ResultOverlay run={run} />
  </section>;
}
