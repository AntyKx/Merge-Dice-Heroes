/** 精靈骰塔劇場：垂直舞台卷軸介面，命運青綠標示可操作決策，戰鬥規則完全由 game/ 引擎掌管。 */
import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, Heart, Info, Lock, Music2, Pause, Play, RotateCcw, Settings2, Shield, Sparkles, Swords, Volume2, X, Zap } from "lucide-react";
import { PixiBattle } from "@/components/GameCanvas";
import { DICE_COMBINATIONS, HEROES, SELECTABLE_HERO_IDS, TALENTS, WAVES } from "@/game/config";
import { HERO_BOARD_LAYOUT, type HeroBoardLayout } from "@/game/heroBoardLayout";
import { useGameStore } from "@/game/store";
import type { HeroId, HeroInstance, TalentDefinition } from "@/game/types";

const LOGO_URL = "/manus-storage/merge-dice-heroes-logo_260faa76.png";
const BACKDROP_URL = "/manus-storage/merge-dice-heroes-battlefield_1a6df969.png";
const HEROES_URL = "/manus-storage/merge-dice-heroes-characters_e2aafd6a.png";

type HeroAnimationAction = "idle" | "attack" | "skill";

type FrameRange = { start: number; count: number };
type HeroFrameSheet = { source: string; totalFrames: number; actions: Record<HeroAnimationAction, FrameRange> };

const HERO_FRAME_SHEETS: Partial<Record<HeroId, HeroFrameSheet>> = {
  fireMage: { source: "/manus-storage/fireMage_1d8ba3b5.webp", totalFrames: 14, actions: { idle: { start: 0, count: 6 }, attack: { start: 6, count: 5 }, skill: { start: 11, count: 3 } } },
  knight: { source: "/manus-storage/holy_paladin_v2_4e2083d3.webp", totalFrames: 20, actions: { idle: { start: 0, count: 6 }, attack: { start: 6, count: 5 }, skill: { start: 11, count: 3 } } },
  priest: { source: "/manus-storage/priest_06f2f936.webp", totalFrames: 13, actions: { idle: { start: 0, count: 5 }, attack: { start: 5, count: 5 }, skill: { start: 10, count: 3 } } },
  ranger: { source: "/manus-storage/ranger_dd823f17.webp", totalFrames: 14, actions: { idle: { start: 0, count: 6 }, attack: { start: 6, count: 5 }, skill: { start: 11, count: 3 } } },
  engineer: { source: "/manus-storage/engineer_16b7f9e2.webp", totalFrames: 14, actions: { idle: { start: 0, count: 6 }, attack: { start: 6, count: 5 }, skill: { start: 11, count: 3 } } },
  deathKnight: { source: "/manus-storage/deathKnight_b6832a48.webp", totalFrames: 13, actions: { idle: { start: 0, count: 6 }, attack: { start: 6, count: 4 }, skill: { start: 10, count: 3 } } },
  bard: { source: "/manus-storage/bard_6a888ed1.webp", totalFrames: 13, actions: { idle: { start: 0, count: 6 }, attack: { start: 6, count: 5 }, skill: { start: 11, count: 2 } } },
  fighter: { source: "/manus-storage/fighter_4f0da582.webp", totalFrames: 14, actions: { idle: { start: 0, count: 6 }, attack: { start: 6, count: 5 }, skill: { start: 11, count: 3 } } },
  frostQueen: { source: "/manus-storage/frostQueen_4afc6c08.webp", totalFrames: 14, actions: { idle: { start: 0, count: 6 }, attack: { start: 6, count: 5 }, skill: { start: 11, count: 3 } } },
  assassin: { source: "/manus-storage/assassin_5d5e75f5.webp", totalFrames: 14, actions: { idle: { start: 0, count: 6 }, attack: { start: 6, count: 5 }, skill: { start: 11, count: 3 } } },
};

const HERO_PORTRAITS: Partial<Record<HeroId, string>> = {
  knight: "/manus-storage/knight_e04e7edb.webp",
  fireMage: "/manus-storage/fire-mage_69098bcc.webp",
  priest: "/manus-storage/priest_cdb9439c.webp",
  assassin: "/manus-storage/assassin_6dc251bd.webp",
  frostQueen: "/manus-storage/frost-queen_9e2ac060.webp",
  ranger: "/manus-storage/ranger_c3a1fc95.webp",
  bard: "/manus-storage/bard_2a50639e.webp",
  deathKnight: "/manus-storage/death-knight_8d85600c.webp",
  engineer: "/manus-storage/engineer_6fba977b.webp",
  fighter: "/manus-storage/fighter_9eaee4ec.webp",
};

const leaderSkill: Record<HeroId, string> = {
  knight: "全體英雄獲得護盾",
  fireMage: "火焰隕石轟炸敵軍",
  archer: "集中齊射最危險目標",
  priest: "全隊治療並提高攻速",
  ranger: "林影獵殺最危險目標",
  engineer: "齒輪超載轟炸敵軍",
  deathKnight: "冥衛誓約護盾前線",
  bard: "潮音合鳴治療並加速",
  fighter: "裂地重拳震撼前排",
  frostQueen: "霜華領域凍傷敵軍",
  assassin: "夜幕處決最危險目標",
};

const classOffset: Partial<Record<HeroId, string>> = { knight: "0% 0%", fireMage: "100% 0%", archer: "0% 100%", priest: "100% 100%" };

const PROJECTILE_STYLES: Record<HeroId, { kind: string; color: string; glow: string }> = {
  knight: { kind: "holy-lance", color: "#f6d56d", glow: "#fff4b8" },
  fireMage: { kind: "fire-orb", color: "#ff7044", glow: "#ffd66d" },
  archer: { kind: "wind-arrow", color: "#83ca69", glow: "#e6ffbf" },
  priest: { kind: "blessing", color: "#d9a7f5", glow: "#fff2ff" },
  ranger: { kind: "forest-arrow", color: "#78bc56", glow: "#dcff93" },
  engineer: { kind: "gear-shot", color: "#dd9938", glow: "#fff0a3" },
  deathKnight: { kind: "soul-lance", color: "#7d6bc5", glow: "#d2c5ff" },
  bard: { kind: "sound-note", color: "#4bb9bf", glow: "#d2fbff" },
  fighter: { kind: "impact-fist", color: "#e18a47", glow: "#ffe0a1" },
  frostQueen: { kind: "ice-shard", color: "#72c9f1", glow: "#ddf8ff" },
  assassin: { kind: "shadow-dart", color: "#b16bc2", glow: "#ffd5ff" },
};

function HeroFrameSprite({ heroId, action, animationSignal = 0, boardLayout }: { heroId: HeroId; action: HeroAnimationAction; animationSignal?: number; boardLayout?: HeroBoardLayout }) {
  const frameSheet = HERO_FRAME_SHEETS[heroId];
  const [frame, setFrame] = useState(0);
  const range = frameSheet?.actions[action];
  const frameCount = range?.count ?? 0;
  useEffect(() => {
    if (!frameCount) return;
    const interval = action === "idle" ? 145 : action === "attack" ? 88 : 132;
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % frameCount), interval);
    return () => window.clearInterval(timer);
  }, [action, animationSignal, frameCount]);
  if (!frameSheet || !range) return null;
  const frameIndex = range.start + frame;
  const position = frameSheet.totalFrames > 1 ? (frameIndex / (frameSheet.totalFrames - 1)) * 100 : 0;
  return <span className={`frame-hero-sprite is-${action}`} style={{ backgroundImage: `url(${frameSheet.source})`, backgroundSize: `auto ${frameSheet.totalFrames * 100}%`, backgroundPosition: `center ${position}%`, transform: boardLayout ? `translate(${boardLayout.shiftX}%, ${boardLayout.shiftY}%) scale(${boardLayout.scale})` : undefined }} aria-hidden="true" />;
}

function HeroPortrait({ heroId, size = "small", action = "idle", animationSignal = 0 }: { heroId: HeroId; size?: "small" | "large"; action?: HeroAnimationAction; animationSignal?: number }) {
  const definition = HEROES[heroId];
  const HeroMark = heroId === "knight" ? Shield : heroId === "fireMage" ? Zap : heroId === "archer" ? Swords : Sparkles;
  if (HERO_FRAME_SHEETS[heroId]) return <span className={`hero-portrait hero-portrait--${size} hero-portrait--${heroId} has-frame-sprite is-${action}`} style={{ borderColor: definition.color }} aria-hidden="true"><HeroFrameSprite key={`${action}-${animationSignal}`} heroId={heroId} action={action} animationSignal={animationSignal} /></span>;
  return <span className={`hero-portrait hero-portrait--${size} hero-portrait--${heroId}`} style={{ backgroundImage: `url(${HEROES_URL})`, backgroundPosition: classOffset[heroId], borderColor: definition.color }} aria-hidden="true"><span className="hero-sigil"><HeroMark size={size === "large" ? 24 : 16} strokeWidth={2.7} /></span></span>;
}

function LeaderHeroShowcase({ heroId }: { heroId: HeroId }) {
  const definition = HEROES[heroId];
  if (HERO_FRAME_SHEETS[heroId]) return <span className={`leader-hero-showcase hero-${heroId}`} style={{ borderColor: definition.color }} aria-hidden="true"><HeroFrameSprite key={`leader-${heroId}`} heroId={heroId} action="idle" boardLayout={HERO_BOARD_LAYOUT[heroId]?.idle} /></span>;
  return <HeroPortrait heroId={heroId} size="large" />;
}

function ProjectileLayer({ heroId, tier, signal }: { heroId: HeroId; tier: number; signal: number }) {
  const effect = PROJECTILE_STYLES[heroId];
  return <span key={`${heroId}-${tier}-${signal}`} className={`projectile-layer projectile-${effect.kind} tier-${tier}`} style={{ "--projectile-color": effect.color, "--projectile-glow": effect.glow } as React.CSSProperties} aria-hidden="true"><i className="projectile-trail" /><i className="projectile-core" /><i className="projectile-impact" /></span>;
}

function Header() {
  const { run, pause } = useGameStore();
  if (!run) return null;
  const ratio = run.combat.castleHp / run.combat.castleMaxHp;
  return <header className="battle-header">
    <div className="castle-readout"><Heart size={15} fill="currentColor" /><div><span>城堡</span><strong>{run.combat.castleHp}/{run.combat.castleMaxHp}</strong></div><i><b style={{ width: `${ratio * 100}%` }} /></i></div>
    <div className="wave-plate"><small>WAVE</small><strong>{String(run.wave).padStart(2, "0")}</strong><span>/ 10</span></div>
    <button className="icon-button" onClick={pause} aria-label="暫停"><Pause size={19} fill="currentColor" /></button>
  </header>;
}

function TitleScreen() {
  const { openScreen, progress, setSetting } = useGameStore();
  return <section className="title-screen">
    <div className="title-orbit orbit-one" /><div className="title-orbit orbit-two" />
    <div className="title-mark"><img src={LOGO_URL} alt="Merge Dice Heroes 命運骰標誌" /></div>
    <p className="eyebrow">骰子策略 · 英雄合成 · 自動塔防</p>
    <h1><span>MERGE</span><b>DICE</b><span>HEROES</span></h1>
    <p className="title-tagline">鎖住好運，合成勝機。</p>
    <div className="title-actions">
      <button className="primary-cta" onClick={() => openScreen("team")}><Play size={18} fill="currentColor" />展開新一局</button>
      <button className="secondary-cta" onClick={() => openScreen("guide")}><BookOpen size={18} />策略圖鑑</button>
    </div>
    <div className="record-panel"><span>冒險紀錄</span><div><b>{progress.wins}</b><small>勝利</small></div><div><b>{progress.bestWave}</b><small>最高波次</small></div><div><b>{progress.losses}</b><small>失利</small></div></div>
    <div className="settings-strip"><span><Settings2 size={15} />設定</span><button className={progress.settings.sfxEnabled ? "setting-on" : ""} onClick={() => setSetting("sfxEnabled", !progress.settings.sfxEnabled)}><Volume2 size={15} />音效</button><button className={progress.settings.musicEnabled ? "setting-on" : ""} onClick={() => setSetting("musicEnabled", !progress.settings.musicEnabled)}><Music2 size={15} />音樂</button></div>
  </section>;
}

function TeamScreen() {
  const { openScreen, selectedHeroes, toggleTeamHero } = useGameStore();
  return <section className="selection-screen">
    <button className="back-link" onClick={() => openScreen("title")}><ChevronLeft size={19} />回到舞台</button>
    <p className="screen-kicker">第一步 · 編排隊伍</p><h2>選擇三位登場英雄</h2><p className="screen-subtitle">每局只會從此召喚池中呼喚英雄。你的組合，會決定可以走出的策略。</p>
    <div className="selection-count"><span>{selectedHeroes.length}</span>/3 已選</div>
    <div className="hero-choice-grid">{SELECTABLE_HERO_IDS.map((heroId) => {
      const definition = HEROES[heroId]; const selected = selectedHeroes.includes(heroId);
      return <button key={heroId} className={`hero-choice ${selected ? "is-selected" : ""}`} style={{ "--hero-color": definition.color } as React.CSSProperties} onClick={() => toggleTeamHero(heroId)}><span className="hero-choice-art"><img src={HERO_PORTRAITS[heroId]} alt="" /><em>{definition.classLabel}</em></span><div><b>{definition.name}</b><small>{definition.tierNotes[1]}</small></div><i>{selected ? "已選" : "選擇"}</i></button>;
    })}</div>
    <button className="primary-cta wide-cta" disabled={selectedHeroes.length !== 3} onClick={() => openScreen("leader")}><Swords size={18} />決定隊長</button>
  </section>;
}

function LeaderScreen() {
  const { openScreen, selectedHeroes, leaderId, chooseLeader, startRun } = useGameStore();
  return <section className="selection-screen leader-screen">
    <button className="back-link" onClick={() => openScreen("team")}><ChevronLeft size={19} />重選隊伍</button>
    <p className="screen-kicker">第二步 · 指定隊長</p><h2>選一位帶領本局</h2><p className="screen-subtitle">骰出四條時，隊長會立刻介入戰局；五條則由全隊合力展開必殺。</p>
    <div className="leader-list">{selectedHeroes.map((heroId) => <button key={heroId} className={`leader-option ${leaderId === heroId ? "is-selected" : ""}`} style={{ "--hero-color": HEROES[heroId].color } as React.CSSProperties} onClick={() => chooseLeader(heroId)}><LeaderHeroShowcase heroId={heroId} /><div><b>{HEROES[heroId].name}</b><strong><Zap size={15} fill="currentColor" />{leaderSkill[heroId]}</strong></div><span>{leaderId === heroId ? "隊長" : "指定"}</span></button>)}</div>
    <button className="primary-cta wide-cta" onClick={startRun}><Sparkles size={18} />進入命運舞台</button>
  </section>;
}

function EnemyStrip() {
  const { run } = useGameStore();
  if (!run) return null;
  const remaining = run.combat.enemies.length + run.combat.pendingEnemies.length;
  return <div className="battle-stage" style={{ backgroundImage: `linear-gradient(180deg, rgba(237,246,242,.14), rgba(251,242,219,.1)), url(${BACKDROP_URL})` }}>
    <div className="stage-copy"><span>{WAVES[run.wave - 1].title}</span><small>{remaining} 名敵人</small></div>
    {run.combat.bossWarning && <div className="boss-warning"><Shield size={15} />{run.combat.bossWarning}</div>}
    <PixiBattle run={run} />
    <div className="castle-gate"><Shield size={18} fill="currentColor" /><span>守望堡</span></div>
  </div>;
}

function HeroTile({ hero, index, selected, previewing, onPointerDown, onPointerUp, onPointerCancel }: { hero: HeroInstance | null; index: number; selected: boolean; previewing: boolean; onPointerDown: (index: number) => void; onPointerUp: (index: number) => void; onPointerCancel: () => void; }) {
  const { run } = useGameStore();
  const locked = run?.combat.lockedTile === index;
  if (!hero) return <button className={`hero-tile is-empty ${locked ? "is-locked" : ""}`} disabled={locked} aria-label={locked ? "被 Boss 封鎖的格子" : "空的英雄格"}><span>{locked ? <Lock size={16} /> : ""}</span></button>;
  const definition = HEROES[hero.heroId];
  const hp = Math.max(0, hero.hp / hero.maxHp) * 100;
  const isUltimateCast = run?.phase === "MERGING" && run.lastCombination?.kind === "FIVE_KIND";
  const isLeaderCast = run?.phase === "MERGING" && run.lastCombination?.kind === "FOUR_KIND" && run.leaderId === hero.heroId;
  const displayAction: HeroAnimationAction = isUltimateCast || isLeaderCast
    ? "skill"
    : previewing || (run?.phase === "COMBAT" && hero.cooldown > 0.8)
      ? "attack"
      : "idle";
  const characterVisual = HERO_FRAME_SHEETS[hero.heroId]
    ? <span className={`hero-board-sprite hero-${hero.heroId} tier-${hero.tier} is-${displayAction}`}><HeroFrameSprite key={`${displayAction}-${hero.attackCount}`} heroId={hero.heroId} action={displayAction} animationSignal={hero.attackCount} boardLayout={HERO_BOARD_LAYOUT[hero.heroId]?.[displayAction]} /></span>
    : <HeroPortrait heroId={hero.heroId} action={displayAction} animationSignal={hero.attackCount} />;
  const isAttacking = displayAction === "attack";
  return <button className={`hero-tile tier-${hero.tier} ${selected ? "is-selected" : ""} ${previewing ? "is-previewing" : ""} ${isAttacking ? "is-attacking" : ""} ${displayAction === "skill" ? "is-casting" : ""} ${locked ? "is-locked" : ""}`} style={{ "--hero-color": definition.color } as React.CSSProperties} disabled={locked} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onPointerDown(index); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); onPointerUp(index); }} onPointerCancel={onPointerCancel} onContextMenu={(event) => event.preventDefault()} aria-label={`${definition.name} T${hero.tier}，生命 ${Math.ceil(hero.hp)}/${hero.maxHp}。長按可預覽攻擊動畫。`}><span className="hero-visual-zone">{characterVisual}{previewing && hero.heroId !== "fireMage" && <span className="preview-slash" />}</span>{isAttacking && <ProjectileLayer heroId={hero.heroId} tier={hero.tier} signal={hero.attackCount} />}<b className="tier-badge">T{hero.tier}</b>{hero.shield > 0 && <i className="shield-icon"><Shield size={10} fill="currentColor" /></i>}{displayAction === "skill" && <span className="preview-badge"><Sparkles size={9} />{isUltimateCast ? "必殺" : "技能"}</span>}{previewing && <span className="preview-badge"><Swords size={9} />預覽</span>}<em className="attack-orb" style={{ animationDuration: `${previewing ? .42 : Math.max(.45, hero.cooldown + .4)}s` }} /><span className="tile-hp"><i style={{ width: `${hp}%` }} /></span></button>;
}

function Board() {
  const { run, selectedBoardIndexes, selectBoardHero, swapBoardHeroes } = useGameStore();
  const dragIndex = useRef<number | null>(null);
  const longPressTimer = useRef<number | undefined>(undefined);
  const longPressStarted = useRef(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  if (!run) return null;
  const pointerDown = (index: number) => {
    dragIndex.current = index;
    longPressStarted.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressStarted.current = true;
      setPreviewIndex(index);
    }, 460);
  };
  const pointerUp = (index: number) => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    if (longPressStarted.current) {
      longPressStarted.current = false;
      dragIndex.current = null;
      setPreviewIndex(null);
      return;
    }
    if (run.phase !== "MERGING") { dragIndex.current = null; return; }
    if (dragIndex.current === null) return;
    if (dragIndex.current === index) selectBoardHero(index); else swapBoardHeroes(dragIndex.current, index);
    dragIndex.current = null;
  };
  const cancelPointer = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressStarted.current = false;
    dragIndex.current = null;
    setPreviewIndex(null);
  };
  const previewFixture = new URLSearchParams(window.location.search).get("preview");
  return <section className="board-section"><div className="section-heading"><span><Swords size={15} />英雄舞台</span><small>點選 3 名同職同階後合成；拖曳可交換；長按預覽攻擊。</small></div><div className="hero-board">{run.board.map((hero, index) => <HeroTile key={hero?.id ?? `empty-${index}`} hero={hero} index={index} selected={selectedBoardIndexes.includes(index)} previewing={previewIndex === index || (Boolean(previewFixture) && (previewFixture === "all" || hero?.heroId === "fireMage"))} onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={cancelPointer} />)}</div></section>;
}

function DiceTray() {
  const { run, toggleLock, reroll, resolve, useSummonEnergy, mergeSelected, selectedBoardIndexes, recycleTierOne, beginCombat } = useGameStore();
  if (!run) return null;
  const combination = run.lastCombination;
  const phase = run.phase;
  const canAct = phase === "SELECTING_DICE";
  const canMerge = phase === "MERGING" && !run.pendingHeroChoice && !run.pendingFreeMerge && selectedBoardIndexes.length === 3;
  return <section className="dice-deck">
    <div className="dice-topline"><span>命運骰盅</span><strong>{phase === "SELECTING_DICE" ? `尚可重骰 ${run.dice.rerollsLeft} 次` : combination ? `${combination.label} · ${combination.description}` : "等待你的指令"}</strong></div>
    <div className={`dice-row ${run.dice.isRolling ? "is-rolling" : ""}`}>{run.dice.values.map((value, index) => <button key={`${value}-${index}`} className={`die die-${value} ${run.dice.locked[index] ? "is-locked" : ""}`} disabled={!canAct} onClick={() => toggleLock(index)} aria-label={`骰子 ${index + 1}：${value}${run.dice.locked[index] ? "，已鎖定" : ""}`}><b>{value}</b>{run.dice.locked[index] && <i><Lock size={11} /></i>}</button>)}</div>
    <div className="action-row">
      {canAct && <><button className="game-button pale" disabled={run.dice.rerollsLeft <= 0 || run.dice.isRolling} onClick={reroll}><RotateCcw size={16} />重骰</button><button className="game-button teal" disabled={run.dice.isRolling} onClick={resolve}><Sparkles size={16} />提前結算</button></>}
      {phase === "MERGING" && <><button className="game-button pale" disabled={run.summonEnergy < 1} onClick={useSummonEnergy}><Zap size={16} fill="currentColor" />召喚 {run.summonEnergy}</button><button className="game-button amber" disabled={!canMerge} onClick={mergeSelected}><Sparkles size={16} />合成 {selectedBoardIndexes.length}/3</button><button className="game-button pale recycle" disabled={run.recycleEnergy < 3} onClick={recycleTierOne}><X size={16} />重整 {run.recycleEnergy}/3</button><button className="game-button teal battle-button" disabled={run.pendingHeroChoice || run.pendingFreeMerge} onClick={beginCombat}><Swords size={16} />開戰</button></>}
    </div>
  </section>;
}

function ActiveTalents() {
  const { run } = useGameStore();
  if (!run) return null;
  return <div className="talent-strip"><span><Sparkles size={14} />本局增益</span>{run.activeTalents.length ? run.activeTalents.map((active) => { const talent = TALENTS.find((item) => item.id === active.id)!; return <i key={active.id} className={`rarity-${talent.rarity}`}>{talent.name}{active.stacks > 1 ? ` ×${active.stacks}` : ""}</i>; }) : <em>尚未選擇天賦；第 3 波後將出現三選一。</em>}<b>隊長：{HEROES[run.leaderId].name}</b></div>;
}

function HeroChoiceOverlay() {
  const { run, chooseSummonHero } = useGameStore();
  if (!run?.pendingHeroChoice) return null;
  return <div className="dialog-backdrop"><div className="choice-modal small-modal"><p className="screen-kicker">三條的獎賞</p><h3>指定一位英雄</h3><p>從本局隊伍中選擇要立即召喚的英雄。</p><div className="summon-choice-list">{run.selectedHeroes.map((heroId) => <button key={heroId} onClick={() => chooseSummonHero(heroId)}><HeroPortrait heroId={heroId} /><span>{HEROES[heroId].name}</span><Sparkles size={17} /></button>)}</div></div></div>;
}

function TalentOverlay() {
  const { run, prepareTalents, takeTalent } = useGameStore();
  useEffect(() => {
    if (run?.phase !== "REWARD" || run.talentChoices.length) return;
    const timer = window.setTimeout(prepareTalents, 0);
    return () => window.clearTimeout(timer);
  }, [run?.phase, run?.talentChoices.length, prepareTalents]);
  if (run?.phase !== "REWARD" || !run.talentChoices.length) return null;
  return <div className="dialog-backdrop"><div className="choice-modal"><p className="screen-kicker">幕間獎賞</p><h3>選擇下一段戰術</h3><p>每次僅能帶走一項強化；本局決策會一路影響到 Boss。</p><div className="talent-choices">{run.talentChoices.map((talent) => <TalentCard key={talent.id} talent={talent} onChoose={() => takeTalent(talent.id)} />)}</div></div></div>;
}

function TalentCard({ talent, onChoose }: { talent: TalentDefinition; onChoose: () => void }) { return <button className={`talent-card rarity-${talent.rarity}`} onClick={onChoose}><i>{talent.rarity === "epic" ? "EPIC" : talent.rarity === "rare" ? "RARE" : "COMMON"}</i><b>{talent.name}</b><span>{talent.description}</span><small>最多 {talent.maxStacks} 層</small></button>; }

function PauseOverlay() {
  const { run, pause, setAutoSpeed, autoSpeed, openScreen } = useGameStore();
  if (run?.phase !== "PAUSED") return null;
  return <div className="dialog-backdrop"><div className="pause-modal"><Pause size={30} fill="currentColor" /><h3>暫停演出</h3><p>敵軍和英雄都已凍結，放心調整節奏。</p><div className="speed-choice"><span>戰鬥速度</span>{([1, 2, 4] as const).map((speed) => <button key={speed} className={autoSpeed === speed ? "is-selected" : ""} onClick={() => setAutoSpeed(speed)}>{speed}×</button>)}</div><button className="primary-cta wide-cta" onClick={pause}><Play size={17} fill="currentColor" />繼續戰鬥</button><button className="text-button" onClick={() => openScreen("title")}>離開本局</button></div></div>;
}

function ResultOverlay() {
  const { run, restartRun, openScreen, continueWave } = useGameStore();
  if (!run || !["VICTORY", "DEFEAT", "WAVE_CLEAR"].includes(run.phase)) return null;
  if (run.phase === "WAVE_CLEAR") return <div className="wave-clear-banner"><Sparkles size={20} /><div><b>第 {run.wave} 波完成</b><span>{run.message}</span></div><button className="game-button teal" onClick={continueWave}>{run.wave >= 10 ? "揭開結局" : "下一波"}<ChevronLeft size={16} className="flip" /></button></div>;
  const won = run.phase === "VICTORY";
  return <div className="dialog-backdrop"><div className={`result-modal ${won ? "is-victory" : "is-defeat"}`}><div className="result-seal">{won ? <Sparkles size={35} /> : <Shield size={35} />}</div><p>{won ? "THE CURTAIN RISES" : "THE CASTLE FELL"}</p><h3>{won ? "勝利！" : "本局失利"}</h3><span>{run.message}</span><div className="result-stats"><div><b>{run.wave}</b><small>抵達波次</small></div><div><b>{run.activeTalents.length}</b><small>取得天賦</small></div><div><b>{run.combat.castleHp}</b><small>城堡生命</small></div></div><button className="primary-cta wide-cta" onClick={restartRun}><RotateCcw size={17} />再玩一局</button><button className="text-button" onClick={() => openScreen("title")}>回到首頁</button></div></div>;
}

function DebugPanel() {
  const { run, showDebug, toggleDebug, debugTriggerCombination, debugSummon, debugJumpWave, debugCastleHp } = useGameStore();
  if (!import.meta.env.DEV || !run) return null;
  return <div className={`debug-panel ${showDebug ? "is-open" : ""}`}><button className="debug-toggle" onClick={toggleDebug}>DEBUG</button>{showDebug && <div><strong>開發控制</strong><section><span>指定骰型</span>{Object.keys(DICE_COMBINATIONS).slice(1).map((kind) => <button key={kind} onClick={() => debugTriggerCombination(kind as keyof typeof DICE_COMBINATIONS)}>{DICE_COMBINATIONS[kind as keyof typeof DICE_COMBINATIONS].label}</button>)}</section><section><span>生成英雄</span>{(["knight", "fireMage", "archer", "priest"] as HeroId[]).map((heroId) => <button key={heroId} onClick={() => debugSummon(heroId, 1)}>{HEROES[heroId].name}</button>)}</section><section><button onClick={() => debugJumpWave(Math.min(10, run.wave + 1))}>跳至下一波</button><button onClick={() => debugCastleHp(5)}>城堡 +5</button><button onClick={() => debugCastleHp(-5)}>城堡 -5</button></section></div>}</div>;
}

function BattleScreen() {
  const { run } = useGameStore();
  const combatTick = useGameStore((state) => state.combatTick);
  const autoSpeed = useGameStore((state) => state.autoSpeed);
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (run?.phase !== "COMBAT") return;
    let previous = performance.now();
    const step = (now: number) => { const delta = Math.min(0.08, (now - previous) / 1000) * autoSpeed; previous = now; combatTick(delta); timerRef.current = requestAnimationFrame(step); };
    timerRef.current = requestAnimationFrame(step);
    return () => { if (timerRef.current) cancelAnimationFrame(timerRef.current); };
  }, [run?.phase, combatTick, autoSpeed]);
  if (!run) return null;
  return <section className="game-screen"><Header /><EnemyStrip /><Board /><DiceTray /><ActiveTalents /><p className="event-message"><Info size={14} />{run.message}</p><HeroChoiceOverlay /><TalentOverlay /><PauseOverlay /><ResultOverlay /><DebugPanel /></section>;
}

function GuideScreen() {
  const { openScreen } = useGameStore();
  return <section className="guide-screen"><button className="back-link" onClick={() => openScreen("title")}><ChevronLeft size={19} />首頁</button><img className="guide-mark" src={LOGO_URL} alt="" /><p className="screen-kicker">策略圖鑑</p><h2>一局的勝機，從留下一顆骰子開始。</h2><div className="guide-cards"><article><span className="guide-icon dice-icon">⚄</span><h3>1. 留骰與重骰</h3><p>每波有五顆骰與兩次重骰。先點選鎖定值得保留的點數，再重骰其餘骰子。兩回合無組合後，下一回合會保證至少一對。</p></article><article><span className="guide-icon"><Sparkles size={24} /></span><h3>2. 召喚與合成</h3><p>骰型帶來召喚、隊長技或強化。三名同職、同階英雄點選後合成，T1 變 T2，T2 變 T3。棋盤滿時會轉成重整能量。</p></article><article><span className="guide-icon"><Swords size={24} /></span><h3>3. 守住十波</h3><p>英雄會自動迎敵。第 3、6、9 波後從三項天賦中選擇一項；第 10 波以雙階段 Boss 作為終幕。城堡生命歸零即失敗。</p></article></div><h3 className="dice-guide-heading">骰型一覽</h3><div className="combo-table">{Object.values(DICE_COMBINATIONS).slice().reverse().map((combo) => <div key={combo.kind}><b>{combo.label}</b><span>{combo.description}</span></div>)}</div><button className="primary-cta wide-cta" onClick={() => openScreen("team")}><Play size={17} fill="currentColor" />現在開演</button></section>;
}

export default function GameScreen() {
  const screen = useGameStore((state) => state.screen);
  const startDemo = useGameStore((state) => state.startDemo);
  const openScreen = useGameStore((state) => state.openScreen);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("leader")) {
      const timer = window.setTimeout(() => openScreen("leader"), 0);
      return () => window.clearTimeout(timer);
    }
    if (params.has("roster")) {
      const timer = window.setTimeout(() => openScreen("team"), 0);
      return () => window.clearTimeout(timer);
    }
    if (!params.has("demo")) return;
    const fireMageTier = params.get("preview") === "3" ? 3 : 2;
    const requestedHero = params.get("hero");
    const showcaseHero = requestedHero && Object.prototype.hasOwnProperty.call(HEROES, requestedHero) ? requestedHero as HeroId : "ranger";
    const castParam = params.get("cast");
    const cast: "leader" | "ultimate" | undefined = castParam === "leader" || castParam === "ultimate" ? castParam : undefined;
    const timer = window.setTimeout(() => startDemo(fireMageTier, showcaseHero, cast), 0);
    return () => window.clearTimeout(timer);
  }, [startDemo, openScreen]);
  return <main className="game-frame">{screen === "title" && <TitleScreen />}{screen === "team" && <TeamScreen />}{screen === "leader" && <LeaderScreen />}{screen === "game" && <BattleScreen />}{screen === "guide" && <GuideScreen />}</main>;
}
