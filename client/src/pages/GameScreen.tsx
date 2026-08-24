/** 精靈骰塔劇場：垂直舞台卷軸介面，命運青綠標示可操作決策，戰鬥規則完全由 game/ 引擎掌管。 */
/* Design reminder: a bright, original hand-painted chibi castle courtyard is the fixed scenic stage; mobile HUD, progress, and compact actions must stay legible without covering the focal castle. */
import { useEffect, useRef, useState } from "react";
import "./shopEnhancements.css";
import "./lobbyCompact.css";
import "./dailyCelebration.css";
import "./islandLobby.css";
import "./simpleCuteLobby.css";
import "./courtyardEntranceTheme.css";
import "./courtyardSignboards.css";
import "./courtyardHomeEmblems.css";
import "./heroCardAlignment.css";
import "./teamEditFormation.css";
import "./lobbyTeamManager.css";
import "./chapterMap.css";
import { AlertTriangle, BatteryCharging, Check, ChevronLeft, ChevronRight, Coins, Cross, Flame, Gift, Hand, Hammer, Heart, Info, Lock, Menu, Music2, PackageOpen, Pause, Play, RefreshCw, RotateCcw, Settings2, Shield, ShieldCheck, Skull, Snowflake, Sparkles, Swords, Target, Trash2, Volume2, X, Zap } from "lucide-react";
import { PixiBattle } from "@/components/GameCanvas";
import { DAILY_QUESTS, DICE_COMBINATIONS, DUNGEONS, EQUIPMENT, getEquipmentBonuses, HEROES, SELECTABLE_HERO_IDS, SHOP_OFFERS, TALENTS, WAVES } from "@/game/config";
import { HERO_BOARD_LAYOUT, type HeroBoardLayout } from "@/game/heroBoardLayout";
import { getHeroProgress, heroXpRequirement } from "@/game/heroProgress";
import { LEADER_CARD_PROFILES } from "@/game/leaderCardProfiles";
import { useGameStore } from "@/game/store";
import type { DailyQuestId, EquipmentSlot, HeroId, HeroInstance, ShopOfferId, TalentDefinition } from "@/game/types";

const LOGO_URL = "/manus-storage/merge-dice-heroes-logo_260faa76.png";
const BACKDROP_URL = "/manus-storage/merge-dice-heroes-battlefield_1a6df969.png";
const HEROES_URL = "/manus-storage/merge-dice-heroes-characters_e2aafd6a.png";
const CUTE_LOBBY_BACKGROUND_URL = "/manus-storage/merge-dice-heroes-chibi-castle-courtyard_9bec38cf.png";
const CASTLE_WALKWAY_PARTY_URL = "/manus-storage/castle-walkway-party-transparent_1070719d.png";
const STORY_STAGE_FRAME_URL = "/manus-storage/astervow-story-stage-frame-ultra-slim_f3d08c10.png";
const HUD_RESOURCE_ICON_URLS = {
  coins: "/manus-storage/astervow-hud-coin_72c66ed6.png",
  crystals: "/manus-storage/astervow-hud-crystal_395f9588.png",
  stamina: "/manus-storage/astervow-hud-stamina_1f9b3f77.png",
} as const;
const FORMATION_LEADER_CROWN_URL = "/manus-storage/courtyard-formation-leader-crown_530c6f3a.png";
const FORMATION_EDIT_EMBLEM_URL = "/manus-storage/formation-edit-feather-emblem_fd598b0e.png";
const FORMATION_ROLE_ICON_URLS: Partial<Record<HeroId, string>> = {
  knight: "/manus-storage/knight_6d5e1a4d.png",
  fireMage: "/manus-storage/fireMage_0825fe58.png",
  priest: "/manus-storage/priest_3bf2b437.png",
  assassin: "/manus-storage/assassin_b09e134b.png",
  frostQueen: "/manus-storage/frostQueen_eae06d67.png",
  ranger: "/manus-storage/ranger_69c948d0.png",
  bard: "/manus-storage/bard_f354d6cb.png",
  deathKnight: "/manus-storage/deathKnight_70c785f2.png",
  engineer: "/manus-storage/engineer_dbf5edbb.png",
  fighter: "/manus-storage/fighter_8b188187.png",
};
const ASTERVOW_ICON_URLS = {
  equipment: "/manus-storage/equipment_b47d9ea9.png",
  shop: "/manus-storage/shop_410470c0.png",
  daily: "/manus-storage/daily_5ebf446e.png",
  guide: "/manus-storage/guide_4803f3b1.png",
  dungeon: "/manus-storage/dungeon_540de8ab.png",
  castle: "/manus-storage/castle_6220a0fb.png",
  expedition: "/manus-storage/expedition_a43a1129.png",
  forge: "/manus-storage/forge_195bcb52.png",
} as const;

type LobbyWeather = "day" | "night";
type ScenePreviewMode = "auto" | LobbyWeather;
type LobbyTab = "kingdom" | "menu" | "inbox" | "announcements" | "settings";
type ExpeditionBannerStyle = "verdant" | "crimson" | "moon";

const getLobbyWeather = (date: Date): LobbyWeather => {
  const hour = date.getHours();
  if (hour >= 19 || hour < 6) return "night";
  return "day";
};

const LOBBY_WEATHER_META: Record<LobbyWeather, { label: string; detail: string }> = {
  day: { label: "王都微風", detail: "雲飄與林梢輕搖" },
  night: { label: "星夜王都", detail: "塔燈守望中" },
};

const STORY_CHAPTER_STAGES = [
  { id: "gate", label: "城門初試", wave: 1, power: 80, reward: "命運碎晶 ×6", detail: "首通補給：守望素材 ×2", enemy: "史萊姆斥候與木盾哥布林", rule: "熟悉骰子合成與第一列防守節奏。", marker: "shield" },
  { id: "garden", label: "庭園伏擊", wave: 3, power: 120, reward: "命運碎晶 ×8", detail: "首通補給：鍛造銅礦 ×3", enemy: "疾行狼群與投石小妖", rule: "敵軍速度提高；留意遠程優先目標。", marker: "flame" },
  { id: "tower", label: "塔樓守望", wave: 5, power: 170, reward: "命運碎晶 ×10", detail: "首通補給：英雄經驗 ×20", enemy: "飛翼守衛與裝甲傀儡", rule: "每回合會出現一名高護甲敵人。", marker: "sparkle" },
  { id: "bridge", label: "石橋決戰", wave: 7, power: 220, reward: "命運碎晶 ×12", detail: "首通補給：鍛造銅礦 ×6", enemy: "雙刃盜賊與重甲衛兵", rule: "敵人分兩路逼近，建議維持範圍輸出。", marker: "swords" },
  { id: "boss", label: "命運骰塔之門", wave: 10, power: 300, reward: "命運碎晶 ×18", detail: "章節通關：王都守望印章", enemy: "骰塔守門巨像", rule: "Boss 會在半血時強化衝鋒；保留技能骰。", marker: "crown" },
] as const;

const CHAPTER_MAP_THEMES = [
  { id: "courtyard", label: "王都庭園", title: "命運骰塔之門", backgroundUrl: CUTE_LOBBY_BACKGROUND_URL },
  { id: "battlefield", label: "城外戰線", title: "霧谷前線", backgroundUrl: BACKDROP_URL },
  { id: "moonlit", label: "月影城垣", title: "銀月守望", backgroundUrl: CUTE_LOBBY_BACKGROUND_URL },
] as const;

function StoryStageMarker({ marker }: { marker: (typeof STORY_CHAPTER_STAGES)[number]["marker"] }) {
  if (marker === "flame") return <Flame size={15} />;
  if (marker === "sparkle") return <Sparkles size={15} />;
  if (marker === "swords") return <Swords size={15} />;
  if (marker === "crown") return <ShieldCheck size={15} />;
  return <Shield size={15} />;
}

function AnimatedResourceValue({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isChanging, setIsChanging] = useState(false);
  const previousValue = useRef(value);
  useEffect(() => {
    if (previousValue.current === value) return;
    const startValue = previousValue.current;
    const delta = value - startValue;
    const startedAt = performance.now();
    let animationFrame = 0;
    setIsChanging(true);
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 360);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(startValue + delta * eased));
      if (progress < 1) animationFrame = window.requestAnimationFrame(tick);
      else {
        previousValue.current = value;
        window.setTimeout(() => setIsChanging(false), 140);
      }
    };
    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);
  return <b className={isChanging ? "hud-resource-value is-changing" : "hud-resource-value"}>{displayValue}{suffix}</b>;
}

type HeroAnimationAction = "idle" | "attack" | "skill";

type FrameRange = { start: number; count: number };
type HeroFrameSheet = { source: string; totalFrames: number; actions: Record<HeroAnimationAction, FrameRange> };

// Locally self-hosted, foot/center-locked fixed-canvas sheets (decontaminated alpha, no manus-storage dependency).
const heroSheet = (heroId: string): HeroFrameSheet => ({ source: `/heroes/${heroId}.png`, totalFrames: 14, actions: { idle: { start: 0, count: 6 }, attack: { start: 6, count: 5 }, skill: { start: 11, count: 3 } } });
const HERO_FRAME_SHEETS: Partial<Record<HeroId, HeroFrameSheet>> = {
  fireMage: heroSheet("fireMage"),
  knight: heroSheet("knight"),
  frostQueen: heroSheet("frostQueen"),
  assassin: heroSheet("assassin"),
  bard: heroSheet("bard"),
  priest: heroSheet("priest"),
  ranger: heroSheet("ranger"),
  engineer: heroSheet("engineer"),
  fighter: heroSheet("fighter"),
  deathKnight: {
    source: "/manus-storage/death_knight_new_fixed_canvas_1db47d50.png",
    totalFrames: 20,
    actions: {
      idle: { start: 0, count: 6 },
      attack: { start: 6, count: 5 },
      skill: { start: 11, count: 3 },
    },
  },
};

const HERO_PORTRAITS: Partial<Record<HeroId, string>> = {
  knight: "/manus-storage/clean_roster_knight_5f490405.png",
  fireMage: "/manus-storage/clean_roster_fireMage_e5c91d38.png",
  priest: "/manus-storage/clean_roster_priest_508c9320.png",
  assassin: "/manus-storage/clean_roster_assassin_9a5b5b10.png",
  frostQueen: "/manus-storage/clean_roster_frostQueen_1eeac3eb.png",
  ranger: "/manus-storage/clean_roster_ranger_f86f8a0b.png",
  bard: "/manus-storage/clean_roster_bard_bb147e2a.png",
  deathKnight: "/manus-storage/death_knight_roster_portrait_ed6525af.png",
  engineer: "/manus-storage/clean_roster_engineer_0d197992.png",
  fighter: "/manus-storage/clean_roster_fighter_87f7f6da.png",
};

const LEADER_CARD_PORTRAITS: Partial<Record<HeroId, string>> = {
  knight: "/manus-storage/leader_aligned_knight_7191b988.png",
  fireMage: "/manus-storage/leader_aligned_fireMage_15d6dd46.png",
  priest: "/manus-storage/standard_leader_aligned_priest_87c184da.png",
  assassin: "/manus-storage/standard_leader_aligned_assassin_43abfc89.png",
  frostQueen: "/manus-storage/leader_aligned_frostQueen_e0d57e93.png",
  ranger: "/manus-storage/standard_leader_aligned_ranger_a8988d3a.png",
  bard: "/manus-storage/standard_leader_aligned_bard_5c86fab4.png",
  deathKnight: "/manus-storage/standard_leader_aligned_deathKnight_16940410.png",
  engineer: "/manus-storage/standard_leader_aligned_engineer_1b55c3c6.png",
  fighter: "/manus-storage/standard_leader_aligned_fighter_f8a29e61.png",
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
  frostQueen: "王室冰晶凍傷敵軍",
  assassin: "夜幕處決最危險目標",
};

const classOffset: Partial<Record<HeroId, string>> = { knight: "0% 0%", fireMage: "100% 0%", archer: "0% 100%", priest: "100% 100%" };

function HeroFrameSprite({ heroId, action, animationSignal = 0, boardLayout }: { heroId: HeroId; action: HeroAnimationAction; animationSignal?: number; boardLayout?: HeroBoardLayout }) {
  const frameSheet = HERO_FRAME_SHEETS[heroId];
  const [frame, setFrame] = useState(0);
  const range = frameSheet?.actions[action];
  const frameCount = range?.count ?? 0;
  const attackFrameParam = new URLSearchParams(window.location.search).get("attackFrame");
  const fixedAttackFrame = action === "attack" && attackFrameParam !== null
    ? Math.max(0, Math.min(frameCount - 1, Number.parseInt(attackFrameParam, 10) || 0))
    : null;
  useEffect(() => {
    if (!frameCount || fixedAttackFrame !== null) return;
    const interval = action === "idle" ? 145 : action === "attack" ? 88 : 132;
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % frameCount), interval);
    return () => window.clearInterval(timer);
  }, [action, animationSignal, fixedAttackFrame, frameCount]);
  if (!frameSheet || !range) return null;
  const frameIndex = range.start + (fixedAttackFrame ?? frame);
  const position = frameSheet.totalFrames > 1 ? (frameIndex / (frameSheet.totalFrames - 1)) * 100 : 0;
  return <span className={`frame-hero-sprite is-${action}`} style={{ backgroundImage: `url(${frameSheet.source})`, backgroundSize: `auto ${frameSheet.totalFrames * 100}%`, backgroundPosition: `center ${position}%`, transform: boardLayout ? `translate(${boardLayout.shiftX}%, ${boardLayout.shiftY}%) scale(${boardLayout.scale})` : undefined }} aria-hidden="true" />;
}

function HeroPortrait({ heroId, size = "small", action = "idle", animationSignal = 0 }: { heroId: HeroId; size?: "small" | "large"; action?: HeroAnimationAction; animationSignal?: number }) {
  const definition = HEROES[heroId];
  const HeroMark = heroId === "knight" ? Shield : heroId === "fireMage" ? Zap : heroId === "archer" ? Swords : Sparkles;
  if (HERO_FRAME_SHEETS[heroId]) return <span className={`hero-portrait hero-portrait--${size} hero-portrait--${heroId} has-frame-sprite is-${action}`} style={{ borderColor: definition.color }} aria-hidden="true"><HeroFrameSprite key={`${action}-${animationSignal}`} heroId={heroId} action={action} animationSignal={animationSignal} /></span>;
  return <span className={`hero-portrait hero-portrait--${size} hero-portrait--${heroId}`} style={{ backgroundImage: `url(${HEROES_URL})`, backgroundPosition: classOffset[heroId], borderColor: definition.color }} aria-hidden="true"><span className="hero-sigil"><HeroMark size={size === "large" ? 24 : 16} strokeWidth={2.7} /></span></span>;
}

/** Design reminder: the lobby team control is a frameless, living march tableau; live player data drives the three heroes and leader state. */
function FormationRoleIcon({ heroId }: { heroId: HeroId }) {
  const iconUrl = FORMATION_ROLE_ICON_URLS[heroId];
  if (iconUrl) return <img src={iconUrl} alt="" />;
  if (heroId === "knight") return <Shield size={13} fill="currentColor" />;
  if (heroId === "fireMage") return <Flame size={13} fill="currentColor" />;
  if (heroId === "priest") return <Cross size={13} />;
  if (heroId === "assassin") return <Swords size={13} />;
  if (heroId === "frostQueen") return <Snowflake size={13} />;
  if (heroId === "ranger") return <Target size={13} />;
  if (heroId === "bard") return <Music2 size={13} />;
  if (heroId === "deathKnight") return <Skull size={13} />;
  if (heroId === "engineer") return <Settings2 size={13} />;
  return <Hand size={13} fill="currentColor" />;
}

function TeamEditFormation({ selectedHeroes, leaderId, onEdit }: { selectedHeroes: HeroId[]; leaderId: HeroId; onEdit: () => void }) {
  const slots = Array.from({ length: 3 }, (_, index) => selectedHeroes[index] ?? null);
  return <button className="team-edit-formation team-edit-formation--march" onClick={onEdit} aria-label={`編輯遠征隊伍，目前已選 ${selectedHeroes.length} 名英雄`}>
    <span className="team-edit-formation__marchers">
      {slots.map((heroId, index) => {
        const hero = heroId ? HEROES[heroId] : null;
        return <span className={`team-edit-formation__marcher ${heroId ? "is-filled" : "is-empty"} marcher-${index + 1}`} key={heroId ?? `empty-${index}`} style={hero ? { "--formation-color": hero.color } as React.CSSProperties : undefined}>
          {heroId && <HeroPortrait heroId={heroId} size="large" action="idle" animationSignal={index} />}
          {heroId === leaderId && <span className="team-edit-formation__leader-crown" aria-label={`${hero?.name}為目前隊長`}><img src={FORMATION_LEADER_CROWN_URL} alt="" /></span>}
          <em aria-hidden="true">{heroId ? <FormationRoleIcon heroId={heroId} /> : "＋"}</em>
        </span>;
      })}
      <span className="team-edit-formation__edit" aria-hidden="true"><img src={FORMATION_EDIT_EMBLEM_URL} alt="" /></span>
    </span>
  </button>;
}

function LeaderHeroShowcase({ heroId }: { heroId: HeroId }) {
  const definition = HEROES[heroId];
  const profile = LEADER_CARD_PROFILES[heroId];
  const idleLayout = HERO_BOARD_LAYOUT[heroId]?.idle;
  const leaderLayout = idleLayout ? { ...idleLayout, scale: idleLayout.scale * profile.frameScale, shiftX: profile.shiftX, shiftY: idleLayout.shiftY + profile.shiftY } : undefined;
  const stageStyle = { borderColor: definition.color, "--leader-sky": profile.sky, "--leader-ground": profile.ground, "--leader-glow": profile.glow, "--leader-accent": profile.accent } as React.CSSProperties;
  const alignedPortrait = LEADER_CARD_PORTRAITS[heroId];
  if (alignedPortrait) return <span className={`leader-hero-showcase leader-stage--${heroId}`} style={stageStyle} aria-hidden="true"><i className="leader-stage-aura" /><span className="leader-stage-emblem">{profile.emblem}</span><small className="leader-stage-label">{profile.stageLabel}</small><img className="leader-aligned-portrait" src={alignedPortrait} alt="" /></span>;
  if (HERO_FRAME_SHEETS[heroId] && !profile.usePortrait) return <span className={`leader-hero-showcase leader-stage--${heroId}`} style={stageStyle} aria-hidden="true"><i className="leader-stage-aura" /><span className="leader-stage-emblem">{profile.emblem}</span><small className="leader-stage-label">{profile.stageLabel}</small><HeroFrameSprite key={`leader-${heroId}`} heroId={heroId} action="idle" boardLayout={leaderLayout} /></span>;
  return <span className={`leader-hero-showcase leader-stage--${heroId} leader-stage--static`} style={stageStyle} aria-hidden="true"><i className="leader-stage-aura" /><span className="leader-stage-emblem">{profile.emblem}</span><small className="leader-stage-label">{profile.stageLabel}</small><span className="leader-static-portrait" style={{ transform: `translate(calc(-50% + ${profile.shiftX}px), calc(-50% + ${profile.shiftY}px)) scale(${profile.frameScale})` }}>{profile.usePortrait && HERO_PORTRAITS[heroId] ? <img className="leader-static-art" src={HERO_PORTRAITS[heroId]} alt="" /> : <HeroPortrait heroId={heroId} size="large" />}</span></span>;
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

type LobbyModuleId = "equipment" | "shop" | "daily" | "dungeon";

const LOBBY_MODULES: Record<LobbyModuleId, { label: string; title: string; eyebrow: string; summary: string; icon: string; accent: string; status: string; items: Array<{ title: string; detail: string; tag: string }> }> = {
  equipment: { label: "裝備", title: "裝備工坊", eyebrow: "鍛造與配置", summary: "替隊長配置遺物與徽記；裝備效果會在每局開始前生效。", icon: "✦", accent: "gold", status: "3 件可查看", items: [{ title: "晨星長劍", detail: "全隊起始攻速 +4%", tag: "稀有" }, { title: "守望者披風", detail: "城堡最大生命 +2", tag: "普通" }, { title: "命運骰匣", detail: "第一回合額外獲得 1 次重骰", tag: "史詩" }] },
  shop: { label: "商店", title: "命運商店", eyebrow: "本日輪替", summary: "使用命運碎晶交換招募券、裝備藍圖與限定素材。", icon: "◈", accent: "teal", status: "刷新：06:42:18", items: [{ title: "英雄招募券", detail: "下次冒險可指定一次召喚選項", tag: "120 ✦" }, { title: "鍛造銅礦", detail: "裝備升級材料 ×20", tag: "80 ✦" }, { title: "霜華紋章", detail: "冰霜女王專屬飾品藍圖", tag: "240 ✦" }] },
  daily: { label: "每日任務", title: "冒險者日誌", eyebrow: "每日進度", summary: "完成日常行動以累積命運印記；每日 00:00 刷新。", icon: "✓", accent: "coral", status: "2 / 3 已完成", items: [{ title: "完成 1 局遠征", detail: "獎勵：命運碎晶 ×30", tag: "已完成" }, { title: "合成 3 次英雄", detail: "獎勵：鍛造銅礦 ×10", tag: "已完成" }, { title: "擊敗 1 名精英敵人", detail: "獎勵：英雄招募券 ×1", tag: "進行中" }] },
  dungeon: { label: "副本", title: "命運副本", eyebrow: "常駐挑戰", summary: "選擇特殊規則的舞台，為裝備與英雄突破收集素材。", icon: "⚔", accent: "violet", status: "第 1 區已開放", items: [{ title: "廢墟迴廊", detail: "敵軍攻速提高；掉落守望者披風素材", tag: "推薦戰力 180" }, { title: "霜凍祭壇", detail: "持續冰緩；掉落霜華紋章素材", tag: "第 2 區解鎖" }, { title: "暮影試煉", detail: "精英連戰；掉落暗影系列素材", tag: "第 3 區解鎖" }] },
};

function TitleScreen() {
  const { openScreen, progress, setSetting, selectedHeroes, leaderId, setTeamSlot, chooseLeader } = useGameStore();
  const [departing, setDeparting] = useState(false);
  const [lobbyTab, setLobbyTab] = useState<LobbyTab>("kingdom");
  const [bannerStyle, setBannerStyle] = useState<ExpeditionBannerStyle>("verdant");
  const [autoWeather, setAutoWeather] = useState<LobbyWeather>(() => getLobbyWeather(new Date()));
  const [scenePreviewMode, setScenePreviewMode] = useState<ScenePreviewMode>("auto");
  const [formationManagerOpen, setFormationManagerOpen] = useState(() => new URLSearchParams(window.location.search).get("manageTeam") === "1");
  const [focusedFormationSlot, setFocusedFormationSlot] = useState(0);
  const [chapterMapOpen, setChapterMapOpen] = useState(() => new URLSearchParams(window.location.search).get("chapterMap") === "1");
  const [focusedStageId, setFocusedStageId] = useState<string | null>(null);
  const [rewardBurstStageId, setRewardBurstStageId] = useState<string | null>(null);
  const [previewChapterIndex, setPreviewChapterIndex] = useState(() => Math.min(CHAPTER_MAP_THEMES.length - 1, Math.floor(progress.wins / 4)));
  const [showChapterStamp, setShowChapterStamp] = useState(false);
  const [lockedChapterMessage, setLockedChapterMessage] = useState<string | null>(null);
  const [unlockingChapterIndex, setUnlockingChapterIndex] = useState<number | null>(null);
  useEffect(() => {
    const syncWeather = () => setAutoWeather(getLobbyWeather(new Date()));
    syncWeather();
    const timer = window.setInterval(syncWeather, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const stopLobbyPan = (event: TouchEvent) => event.preventDefault();
    window.addEventListener("touchmove", stopLobbyPan, { passive: false });
    return () => window.removeEventListener("touchmove", stopLobbyPan);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.add("lobby-viewport-lock");
    body.classList.add("lobby-viewport-lock");
    return () => {
      root.classList.remove("lobby-viewport-lock");
      body.classList.remove("lobby-viewport-lock");
    };
  }, []);
  useEffect(() => {
    if (!chapterMapOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChapterMapOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [chapterMapOpen]);
  const claimableQuests = DAILY_QUESTS.filter((quest) => (quest.id === "battle" ? progress.daily.battles : quest.id === "merge" ? progress.daily.merges : progress.daily.victories) >= quest.target && !progress.daily.claimed.includes(quest.id)).length;
  const hasUpgradeableEquipment = progress.inventory.some((equipmentId) => { const level = progress.equipmentLevels[equipmentId] ?? 1; return level < 5 && progress.materials >= level * 8; });
  const hasDungeonAttempt = DUNGEONS.some((dungeon, index) => (dungeon.unlocked || (index > 0 && (progress.dungeonClears[DUNGEONS[index - 1].id] ?? 0) > 0)) && progress.stamina >= dungeon.energyCost);
  const playerLevel = 1 + Math.floor(progress.wins / 3);
  const levelProgress = (progress.wins % 3) + 1;
  const storyChapter = 1 + Math.floor(progress.wins / 4);
  const unlockedChapterCount = Math.max(1, Math.min(CHAPTER_MAP_THEMES.length, storyChapter));
  const activeChapterIndex = unlockedChapterCount - 1;
  const previewChapter = previewChapterIndex + 1;
  const chapterCompleted = progress.bestWave >= STORY_CHAPTER_STAGES.at(-1)!.wave;
  const currentStoryStage = STORY_CHAPTER_STAGES.find((stage) => progress.bestWave < stage.wave) ?? STORY_CHAPTER_STAGES.at(-1)!;
  const chapterTheme = CHAPTER_MAP_THEMES[previewChapterIndex];
  const previewingActiveChapter = previewChapterIndex === activeChapterIndex;
  const selectedStoryStage = STORY_CHAPTER_STAGES.find((stage) => stage.id === focusedStageId) ?? currentStoryStage;
  const selectedStageCleared = previewChapterIndex < activeChapterIndex || (previewingActiveChapter && progress.bestWave >= selectedStoryStage.wave);
  const teamPower = selectedHeroes.reduce((total, heroId) => {
    const hero = HEROES[heroId];
    const heroProgress = getHeroProgress(progress.heroProgress[heroId]);
    return total + Math.round((hero.attack * 6 + hero.maxHp * 0.18) * (1 + (heroProgress.level - 1) * 0.1));
  }, 0);
  const isUnderpowered = teamPower < selectedStoryStage.power;
  const weather = scenePreviewMode === "auto" ? autoWeather : scenePreviewMode;
  const weatherMeta = LOBBY_WEATHER_META[weather];
  const actionNotice: Partial<Record<LobbyModuleId, boolean>> = { equipment: hasUpgradeableEquipment && !progress.lobbyRead.equipment, shop: progress.shop.freeRefreshAvailable && !progress.lobbyRead.shop, daily: claimableQuests > 0 && !progress.lobbyRead.daily, dungeon: hasDungeonAttempt && !progress.lobbyRead.dungeon };
  useEffect(() => {
    if (!chapterCompleted) return;
    const stampKey = `merge-dice-heroes:chapter-${storyChapter}-stamp`;
    if (window.sessionStorage.getItem(stampKey)) return;
    window.sessionStorage.setItem(stampKey, "shown");
    const enterTimer = window.setTimeout(() => setShowChapterStamp(true), 0);
    const exitTimer = window.setTimeout(() => setShowChapterStamp(false), 1700);
    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(exitTimer);
    };
  }, [chapterCompleted, storyChapter]);
  const launchExpedition = () => { if (departing) return; setDeparting(true); window.setTimeout(() => openScreen("team"), 1100); };
  const editFormationHero = (heroId: HeroId) => {
    if (selectedHeroes[focusedFormationSlot] === heroId) {
      setTeamSlot(focusedFormationSlot);
      return;
    }
    setTeamSlot(focusedFormationSlot, heroId);
  };
  const focusChapterStage = (stageId: string, cleared: boolean) => {
    setFocusedStageId(stageId);
    if (!cleared) return;
    setRewardBurstStageId(stageId);
    window.setTimeout(() => setRewardBurstStageId((active) => active === stageId ? null : active), 700);
  };
  const selectChapterPreview = (index: number) => {
    const unlockWins = index * 4;
    if (index >= unlockedChapterCount) {
      setLockedChapterMessage(`需累積 ${unlockWins} 場勝利後解鎖第 ${index + 1} 章`);
      return;
    }
    setLockedChapterMessage(null);
    const celebrationKey = `merge-dice-heroes:chapter-${index + 1}-unlocked`;
    const shouldCelebrate = index > 0 && !window.sessionStorage.getItem(celebrationKey);
    if (!shouldCelebrate) {
      setPreviewChapterIndex(index);
      setFocusedStageId(null);
      return;
    }
    window.sessionStorage.setItem(celebrationKey, "shown");
    setUnlockingChapterIndex(index);
    window.setTimeout(() => {
      setPreviewChapterIndex(index);
      setFocusedStageId(null);
    }, 280);
    window.setTimeout(() => setUnlockingChapterIndex(null), 760);
  };
  return <section className={`lobby-screen cute-hub-lobby weather-${weather} banner-${bannerStyle} ${departing ? "is-departing" : ""}`}>
    <div className="cute-hub-art" style={{ backgroundImage: `url(${CUTE_LOBBY_BACKGROUND_URL})` }} aria-hidden="true" />
    <header className="cute-hub-hud" aria-label="玩家資源">
      <button className="cute-level" onClick={() => openScreen("team")} aria-label={`玩家等級 ${playerLevel}，查看隊伍`}><span>LV.</span><b>{String(playerLevel).padStart(2, "0")}</b><i><em style={{ width: `${levelProgress / 3 * 100}%` }} /></i></button>
      <button className="cute-resource" onClick={() => openScreen("shop")} aria-label={`金幣 ${progress.sigils}，前往商店`}><img className="cute-resource__icon" src={HUD_RESOURCE_ICON_URLS.coins} alt="" /><AnimatedResourceValue value={progress.sigils} /></button>
      <button className="cute-resource" onClick={() => openScreen("daily")} aria-label={`鑽石 ${progress.crystals}，前往每日任務`}><img className="cute-resource__icon" src={HUD_RESOURCE_ICON_URLS.crystals} alt="" /><AnimatedResourceValue value={progress.crystals} /></button>
      <button className="cute-resource" onClick={() => openScreen("dungeon")} aria-label={`體力 ${progress.stamina} / 20，前往副本`}><img className="cute-resource__icon" src={HUD_RESOURCE_ICON_URLS.stamina} alt="" /><AnimatedResourceValue value={progress.stamina} suffix="/20" /></button>
      <button className="cute-menu" onClick={() => setLobbyTab(lobbyTab === "menu" ? "kingdom" : "menu")} aria-label="開啟王都選單"><Menu size={19} /></button>
    </header>
    <button className="cute-story-progress cute-story-progress--stage-frame" type="button" onClick={() => { setPreviewChapterIndex(activeChapterIndex); setFocusedStageId(null); setChapterMapOpen(true); }} aria-label={`開啟第 ${storyChapter} 章地圖，目前 ${currentStoryStage.label}`}>
      <img className="cute-story-progress__frame" src={STORY_STAGE_FRAME_URL} alt="" aria-hidden="true" />
      <div className="cute-story-progress__copy"><span>主線 第 {storyChapter} 章</span><b>命運骰塔之門</b></div>
      <small>{weatherMeta.label} · WAVE {String(progress.bestWave).padStart(2, "0")}</small>
      {showChapterStamp && <span className="cute-story-progress__completion-stamp" aria-label="第 1 章完成"><Check size={12} /><b>完成</b></span>}
      <span className="cute-story-progress__hint" aria-hidden="true">點擊查看章節地圖</span>
    </button>
    <main className="cute-hub-standby" aria-label="王都遠征入口">
      <img className="castle-walkway-party" src={CASTLE_WALKWAY_PARTY_URL} alt="" aria-hidden="true" />
      <TeamEditFormation selectedHeroes={selectedHeroes} leaderId={leaderId} onEdit={() => setFormationManagerOpen(true)} />
      <button className="cute-expedition-button" disabled={departing} onClick={launchExpedition}><i><img src={ASTERVOW_ICON_URLS.castle} alt="" /></i><span><small>骰塔大門已開啟</small><b>{departing ? "隊伍啟程中" : "開始遠征"}</b></span><em>體力 -5</em></button>
    </main>
    {formationManagerOpen && <div className="lobby-team-manager-backdrop" role="dialog" aria-modal="true" aria-label="王都隊伍管理">
      <section className="lobby-team-manager">
        <header className="lobby-team-manager__header"><div><small>王都編組台 · 不啟動遠征</small><h2>管理目前隊伍</h2></div><button onClick={() => setFormationManagerOpen(false)} aria-label="關閉隊伍管理"><X size={20} /></button></header>
        <div className="lobby-team-manager__formation" aria-label="目前遠征編組">
          {Array.from({ length: 3 }, (_, index) => {
            const heroId = selectedHeroes[index];
            const hero = heroId ? HEROES[heroId] : undefined;
            return <button key={heroId ?? `manager-slot-${index}`} className={`lobby-team-manager__slot ${index === focusedFormationSlot ? "is-focused" : ""} ${heroId ? "is-filled" : "is-empty"}`} onClick={() => setFocusedFormationSlot(index)}>
              {heroId && <img src={HERO_PORTRAITS[heroId]} alt="" />}
              {heroId === leaderId && <span className="lobby-team-manager__crown" aria-label={`${hero?.name}為目前隊長`}><img src={FORMATION_LEADER_CROWN_URL} alt="" /></span>}
              <small>{hero ? hero.name : "空位"}</small>
              <b>{index === focusedFormationSlot ? "替換目標" : heroId === leaderId ? "目前隊長" : "上陣中"}</b>
            </button>;
          })}
        </div>
        <div className="lobby-team-manager__tip"><Target size={14} />選取上方位置後，點擊下方英雄即可替換；已上陣英雄可換位，點選目前位置可移除。</div>
        <div className="lobby-team-manager__roster" aria-label="已擁有英雄">
          {SELECTABLE_HERO_IDS.map((heroId) => {
            const hero = HEROES[heroId];
            const selected = selectedHeroes.includes(heroId);
            const isLeader = leaderId === heroId;
            const heroProgress = getHeroProgress(progress.heroProgress[heroId]);
            const requiredExperience = heroXpRequirement(heroProgress.level);
            const experiencePercent = Math.min(100, Math.round(heroProgress.experience / requiredExperience * 100));
            return <article key={heroId} className={`lobby-team-manager__hero ${selected ? "is-selected" : ""}`} style={{ "--manager-hero-color": hero.color } as React.CSSProperties}>
              <button className="lobby-team-manager__hero-main" onClick={() => editFormationHero(heroId)}><img src={HERO_PORTRAITS[heroId]} alt="" /><span><b>{hero.name}</b><small>{hero.classLabel}</small><strong>Lv.{heroProgress.level} · {heroProgress.experience}/{requiredExperience}</strong><i className="lobby-team-manager__xp"><b style={{ width: `${experiencePercent}%` }} /></i></span><i>{selected ? "已選" : selectedHeroes.length >= 3 ? "替換" : "加入"}</i></button>
              {selected && <button className={`lobby-team-manager__leader-choice ${isLeader ? "is-leader" : ""}`} onClick={() => chooseLeader(heroId)} aria-label={`指定 ${hero.name} 為隊長`}><img src={FORMATION_LEADER_CROWN_URL} alt="" /></button>}
            </article>;
          })}
        </div>
        <footer className="lobby-team-manager__footer"><span><Check size={15} />目前編組 {selectedHeroes.length}/3 · 隊長：{HEROES[leaderId].name}</span><button onClick={() => setFormationManagerOpen(false)}>完成編組</button></footer>
      </section>
    </div>}
    {chapterMapOpen && <div className="chapter-map-backdrop" role="dialog" aria-modal="true" aria-label={`第 ${previewChapter} 章完整地圖`}>
      <section className={`chapter-map-sheet chapter-map-sheet--${chapterTheme.id}`} style={{ "--chapter-map-background": `url(${chapterTheme.backgroundUrl})` } as React.CSSProperties}>
        <header className="chapter-map-sheet__header"><div><div className="chapter-map-sheet__chapter-nav"><button type="button" disabled={previewChapterIndex === 0} onClick={() => { setPreviewChapterIndex((index) => index - 1); setFocusedStageId(null); }} aria-label="查看上一章"><ChevronLeft size={17} /></button><small>王都主線 · 第 {previewChapter} / {unlockedChapterCount} 章 · {chapterTheme.label}</small><button type="button" disabled={previewChapterIndex >= unlockedChapterCount - 1} onClick={() => { setPreviewChapterIndex((index) => index + 1); setFocusedStageId(null); }} aria-label="查看下一章"><ChevronRight size={17} /></button></div><h2>{chapterTheme.title}</h2><p>點擊節點查看完整情報；遠征仍由王都的「開始遠征」啟動。</p></div><button type="button" onClick={() => setChapterMapOpen(false)} aria-label="關閉章節地圖"><X size={20} /></button></header>
        <div className="chapter-map-thumbnails" aria-label="章節快速跳轉">
          {CHAPTER_MAP_THEMES.map((theme, index) => {
            const locked = index >= unlockedChapterCount;
            const unlockWins = index * 4;
            const unlocking = unlockingChapterIndex === index;
            return <button key={theme.id} type="button" className={`${previewChapterIndex === index ? "is-selected " : ""}${locked ? "is-locked " : ""}${unlocking ? "is-unlocking" : ""}`} style={{ "--chapter-thumbnail": `url(${theme.backgroundUrl})` } as React.CSSProperties} onClick={() => selectChapterPreview(index)}><i aria-hidden="true" />{(locked || unlocking) && <em aria-hidden="true"><Lock size={10} /></em>}<span>第 {index + 1} 章</span><small>{locked ? `勝利 ${unlockWins} 場解鎖` : unlocking ? "章節解鎖！" : theme.label}</small></button>;
          })}
        </div>
        {lockedChapterMessage && <p className="chapter-map-lock-notice" role="status"><Lock size={12} />{lockedChapterMessage}</p>}
        <div className="chapter-map-sheet__route" aria-label={`第 ${previewChapter} 章關卡節點`}>
          {STORY_CHAPTER_STAGES.map((stage, index) => {
            const cleared = previewChapterIndex < activeChapterIndex || (previewingActiveChapter && progress.bestWave >= stage.wave);
            const current = previewingActiveChapter && !cleared && stage.id === currentStoryStage.id;
            const focused = focusedStageId === stage.id;
            const openingReward = rewardBurstStageId === stage.id;
            return <button key={stage.id} type="button" className={`chapter-stage ${cleared ? "is-cleared" : ""} ${current ? "is-current" : ""} ${focused ? "is-focused" : ""}`} onClick={() => focusChapterStage(stage.id, cleared)} aria-label={`${stage.label}，第 ${stage.wave} 波，${cleared ? "已通關" : current ? "目前關卡" : "尚未解鎖"}，獎勵 ${stage.reward}`}>
              {index > 0 && <span className="chapter-stage__path" aria-hidden="true" />}
              <span className="chapter-stage__orb">{cleared ? <span className="chapter-stage__marker-with-check"><StoryStageMarker marker={stage.marker} /><Check size={10} /></span> : current ? <StoryStageMarker marker={stage.marker} /> : <Lock size={13} />}</span>
              <span className="chapter-stage__name">{stage.label}</span><span className="chapter-stage__wave">WAVE {String(stage.wave).padStart(2, "0")}</span><span className="chapter-stage__power">戰力 {stage.power}</span>
              <span className="chapter-stage__tooltip" role="tooltip"><span className={`chapter-stage__chest ${cleared ? "is-unlocked" : ""} ${openingReward ? "is-opening" : ""}`}><Gift size={15} /></span><span><b>{stage.reward}</b><small>{cleared ? "首通寶箱已開啟" : stage.detail}</small></span></span>
            </button>;
          })}
        </div>
        <section className="chapter-stage-detail" aria-live="polite"><span className="chapter-stage-detail__icon"><StoryStageMarker marker={selectedStoryStage.marker} /></span><div><small>WAVE {String(selectedStoryStage.wave).padStart(2, "0")} · {selectedStageCleared ? "已通關" : previewingActiveChapter ? "目前可挑戰" : "章節紀錄"}</small><h3>{selectedStoryStage.label}</h3><p>{selectedStoryStage.enemy}</p><em>{selectedStoryStage.rule}</em></div><aside className={isUnderpowered ? "is-underpowered" : ""}><span>推薦戰力</span><b>{isUnderpowered && <AlertTriangle size={11} />}{selectedStoryStage.power}</b><small>隊伍戰力 {teamPower}<br />首通獎勵 {selectedStoryStage.reward}</small></aside></section>
        <footer className="chapter-map-sheet__footer"><div><Gift size={17} /><span>章節獎勵：命運碎晶 ×18</span></div>{previewingActiveChapter && chapterCompleted ? <span className="chapter-map__stamp" key={`stamp-${progress.bestWave}`}><Check size={21} /><b>章節完成</b></span> : <span>{previewingActiveChapter ? "完成 WAVE 10 取得守望印章" : "已完成章節紀錄"}</span>}</footer>
      </section>
    </div>}
    {lobbyTab === "menu" && <aside className="courtyard-dropdown" aria-label="王都功能選單"><button onClick={() => setLobbyTab("inbox")}><PackageOpen size={16} /><span>收件匣</span>{claimableQuests > 0 && <i />}</button><button onClick={() => setLobbyTab("settings")}><Settings2 size={16} /><span>設定</span></button><button onClick={() => openScreen("guide")}><Sparkles size={16} /><span>圖鑑</span></button><button onClick={() => setLobbyTab("announcements")}><Info size={16} /><span>公告</span></button></aside>}
    {lobbyTab === "inbox" && <aside className="cute-hub-sheet courtyard-info-sheet" aria-label="收件匣"><header><span><PackageOpen size={15} />收件匣</span><button onClick={() => setLobbyTab("kingdom")}>收起</button></header><article><b>每日任務進度</b><p>目前有 <strong>{claimableQuests}</strong> 項每日獎勵可領取。</p><button onClick={() => openScreen("daily")}>前往每日任務</button></article><article><b>命運商店</b><p>{progress.shop.freeRefreshAvailable ? "今日免費刷新可使用。" : "商店商品已準備完成。"}</p><button onClick={() => openScreen("shop")}>查看商店</button></article></aside>}
    {lobbyTab === "announcements" && <aside className="cute-hub-sheet courtyard-info-sheet" aria-label="公告"><header><span><Info size={15} />王都公告</span><button onClick={() => setLobbyTab("kingdom")}>收起</button></header><article><b>王都導覽更新</b><p>英雄、裝備、商店與副本已收整為底部四項導覽。</p></article><article><b>遠征隊集結</b><p>城堡前走道已成為冒險隊的出發集合點。</p></article></aside>}
    {lobbyTab === "settings" && <aside className="cute-hub-sheet" aria-label="設定與音效"><header><span><Settings2 size={15} />設定與音效</span><button onClick={() => setLobbyTab("kingdom")}>收起</button></header><div className="cute-scene-selector"><small>場景預覽</small><span><button className={scenePreviewMode === "auto" ? "is-selected" : ""} onClick={() => setScenePreviewMode("auto")}>自動</button><button className={scenePreviewMode === "day" ? "is-selected" : ""} onClick={() => setScenePreviewMode("day")}>白天</button><button className={scenePreviewMode === "night" ? "is-selected" : ""} onClick={() => setScenePreviewMode("night")}>夜晚</button></span></div><div className="cute-banner-selector"><small>遠征隊旗</small><span><button className={bannerStyle === "verdant" ? "is-selected verdant" : "verdant"} onClick={() => setBannerStyle("verdant")} /><button className={bannerStyle === "crimson" ? "is-selected crimson" : "crimson"} onClick={() => setBannerStyle("crimson")} /><button className={bannerStyle === "moon" ? "is-selected moon" : "moon"} onClick={() => setBannerStyle("moon")} /></span></div><div className="cute-audio-toggle"><button className={progress.settings.sfxEnabled ? "is-selected" : ""} onClick={() => setSetting("sfxEnabled", !progress.settings.sfxEnabled)}><Volume2 size={15} />音效 {progress.settings.sfxEnabled ? "開啟" : "關閉"}</button><button className={progress.settings.musicEnabled ? "is-selected" : ""} onClick={() => setSetting("musicEnabled", !progress.settings.musicEnabled)}><Music2 size={15} />音樂 {progress.settings.musicEnabled ? "開啟" : "關閉"}</button></div></aside>}
    <nav className="cute-hub-nav kingdom-footer-nav" aria-label="王都導覽"><button className="cute-nav-heroes" onClick={() => openScreen("team")}><span className="nav-emblem"><img src={ASTERVOW_ICON_URLS.guide} alt="" /></span><span>英雄</span></button><button className="cute-nav-equipment" onClick={() => openScreen("equipment")}><span className="nav-emblem"><img src={ASTERVOW_ICON_URLS.equipment} alt="" /></span><span>裝備</span>{actionNotice.equipment && <i />}</button><button className="cute-nav-kingdom" onClick={() => setLobbyTab("kingdom")}><span className="nav-emblem"><img src={ASTERVOW_ICON_URLS.castle} alt="" /></span><span>王都</span></button><button className="cute-nav-shop" onClick={() => openScreen("shop")}><span className="nav-emblem"><img src={ASTERVOW_ICON_URLS.shop} alt="" /></span><span>商店</span>{actionNotice.shop && <i />}</button><button className="cute-nav-dungeon" onClick={() => openScreen("dungeon")}><span className="nav-emblem"><img src={ASTERVOW_ICON_URLS.dungeon} alt="" /></span><span>副本</span>{actionNotice.dungeon && <i />}</button></nav>
    {departing && <div className="expedition-departure" role="status" aria-live="polite"><div className="departure-party">{selectedHeroes.map((heroId) => <span key={heroId} style={{ "--party-color": HEROES[heroId].color } as React.CSSProperties}>{HEROES[heroId].name.slice(0, 1)}</span>)}</div><div><small>命運骰塔</small><b>遠征隊伍，出發！</b><span>正踏上下一段命運……</span></div><i><Swords size={23} /></i></div>}
  </section>;
}

type CourtyardSignKind = LobbyModuleId | "guide" | "team" | "leader";

const MODULE_SIGN_META: Record<LobbyModuleId, { location: string; icon: React.ReactNode }> = {
  equipment: { location: "城堡工坊巷", icon: <Hammer size={26} /> },
  shop: { location: "庭院市集", icon: <Coins size={26} /> },
  daily: { location: "花園日誌亭", icon: <Gift size={26} /> },
  dungeon: { location: "月影符文門", icon: <Swords size={26} /> },
};

function CourtyardSignboard({ kind, location, title, summary, icon }: { kind: CourtyardSignKind; location: string; title: string; summary: string; icon: React.ReactNode }) {
  return <header className={`courtyard-signboard sign-${kind}`}><i className="sign-emblem" aria-hidden="true">{icon}</i><div className="sign-plaque"><span className="sign-nail sign-nail-left" /><span className="sign-nail sign-nail-right" /><p>{location}</p><h2>{title}</h2><small>{summary}</small></div></header>;
}

function ModuleHeader({ moduleId }: { moduleId: LobbyModuleId }) { const { openScreen } = useGameStore(); const module = LOBBY_MODULES[moduleId]; const sign = MODULE_SIGN_META[moduleId]; return <><button className="back-link" onClick={() => openScreen("title")}><ChevronLeft size={19} />返回大廳</button><CourtyardSignboard kind={moduleId} location={sign.location} title={module.title} summary={module.summary} icon={sign.icon} /></>; }

const SLOT_LABELS: Record<EquipmentSlot, string> = { weapon: "武器", armor: "護甲", relic: "遺物" };

function EquipmentScreen() {
  const { progress, equipItem, unequipItem, upgradeEquipment, dismantleEquipment, openScreen } = useGameStore(); const bonuses = getEquipmentBonuses(progress.equipped, progress.equipmentLevels);
  return <section className="lobby-module-screen accent-gold"><ModuleHeader moduleId="equipment" /><div className="equipment-bonus-strip"><span><Swords size={15} />攻擊 +{Math.round(bonuses.attackMultiplier * 100)}%</span><span><Shield size={15} />城堡 +{bonuses.castleBonus}</span><span><RotateCcw size={15} />重骰 +{bonuses.extraRerolls}</span></div><div className="equipment-slots">{(["weapon", "armor", "relic"] as EquipmentSlot[]).map((slot) => <button key={slot} className="equipment-slot" onClick={() => progress.equipped[slot] && unequipItem(slot)}><small>{SLOT_LABELS[slot]}</small><b>{progress.equipped[slot] ? EQUIPMENT[progress.equipped[slot]!].name : "尚未裝備"}</b><span>{progress.equipped[slot] ? "點擊卸下" : "背包內選擇"}</span></button>)}</div><div className="module-status"><span>背包 {progress.inventory.length} 件 · 鍛造銅礦 {progress.materials}</span><b>裝備在下一局生效</b></div><div className="inventory-list">{progress.inventory.map((equipmentId) => { const item = EQUIPMENT[equipmentId]; const equipped = progress.equipped[item.slot] === equipmentId; const level = progress.equipmentLevels[equipmentId] ?? 1; const upgradeCost = level * 8; return <article key={equipmentId} className={equipped ? "is-equipped" : ""}><i>{item.icon}</i><div><b>{item.name}</b><p>{item.description}</p><small>{SLOT_LABELS[item.slot]} · {item.rarity} · Lv.{level}/5</small></div><div className="equipment-actions"><button onClick={() => equipItem(equipmentId)}>{equipped ? <><Check size={14} />已裝備</> : "裝備"}</button><button disabled={level >= 5 || progress.materials < upgradeCost} onClick={() => upgradeEquipment(equipmentId)}><Hammer size={12} />升級 {level >= 5 ? "MAX" : upgradeCost}</button><button className="dismantle-button" onClick={() => dismantleEquipment(equipmentId)}><Trash2 size={12} />分解</button></div></article>; })}</div><button className="secondary-cta wide-cta" onClick={() => openScreen("title")}><PackageOpen size={17} />返回冒險大廳</button></section>;
}

function DailyScreen() {
  const { progress, claimDailyReward, openScreen } = useGameStore(); const [celebrating, setCelebrating] = useState(false); const values: Record<DailyQuestId, number> = { battle: progress.daily.battles, merge: progress.daily.merges, victory: progress.daily.victories };
  const claim = (questId: DailyQuestId) => { claimDailyReward(questId); setCelebrating(true); window.setTimeout(() => setCelebrating(false), 1500); };
  return <section className={`lobby-module-screen accent-coral ${celebrating ? "is-reward-celebrating" : ""}`}><div className="daily-celebration-flare" aria-hidden="true" /><ModuleHeader moduleId="daily" /><div className="module-status"><span>今日任務 {progress.daily.claimed.length} / {DAILY_QUESTS.length} 已領取</span><b>刷新於 00:00</b></div><div className="quest-list">{DAILY_QUESTS.map((quest) => { const value = values[quest.id]; const ready = value >= quest.target && !progress.daily.claimed.includes(quest.id); const claimed = progress.daily.claimed.includes(quest.id); return <article key={quest.id} className={claimed ? "is-claimed" : ready ? "is-ready" : ""}><div className="quest-top"><div><b>{quest.title}</b><p>{quest.description}</p></div><em>{value} / {quest.target}</em></div><div className="quest-progress"><i style={{ width: `${Math.min(100, value / quest.target * 100)}%` }} /></div><footer><span><Gift size={13} />命運碎晶 ×{quest.rewardCrystals}</span><button disabled={!ready} onClick={() => claim(quest.id)}>{claimed ? <><Check size={13} />已領取</> : ready ? "領取獎勵" : "進行中"}</button></footer></article>; })}</div><button className="secondary-cta wide-cta" onClick={() => openScreen("title")}><Sparkles size={17} />返回冒險大廳</button></section>;
}

function DungeonScreen() {
  const { progress, selectDungeon, openScreen } = useGameStore();
  return <section className="lobby-module-screen accent-violet"><ModuleHeader moduleId="dungeon" /><div className="dungeon-energy"><BatteryCharging size={17} /><b>體力 {progress.stamina} / 20</b><span>每次挑戰消耗對應體力</span></div><div className="dungeon-list">{DUNGEONS.map((dungeon, index) => { const unlocked = dungeon.unlocked || (index > 0 && (progress.dungeonClears[DUNGEONS[index - 1].id] ?? 0) > 0); const enoughEnergy = progress.stamina >= dungeon.energyCost; return <article key={dungeon.id} className={!unlocked ? "is-locked" : ""}><div className="dungeon-stage-number">{String(index + 1).padStart(2, "0")}</div><div><b>{dungeon.title}</b><p>{dungeon.description}</p><small>推薦戰力 {dungeon.recommendedPower} · 體力 {dungeon.energyCost}</small><strong className="dungeon-rule"><ShieldCheck size={11} />{dungeon.enemyRule.label}</strong></div><footer><span><Gift size={13} />{dungeon.reward.label} · ✦{dungeon.reward.crystals}</span><button disabled={!unlocked || !enoughEnergy} onClick={() => selectDungeon(dungeon.id)}>{!unlocked ? <><Lock size={13} />未解鎖</> : !enoughEnergy ? "體力不足" : "挑戰"}</button></footer></article>; })}</div><button className="secondary-cta wide-cta" onClick={() => openScreen("title")}><Sparkles size={17} />返回冒險大廳</button></section>;
}

const HIGH_VALUE_PRICE = 12;

function ShopScreen() {
  const { openScreen, progress, buyShopOffer, refreshShop } = useGameStore();
  const [pendingOfferId, setPendingOfferId] = useState<ShopOfferId | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const now = new Date(); const next = new Date(now); next.setHours(24, 0, 0, 0); return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  });
  useEffect(() => { const timer = window.setInterval(() => { const now = new Date(); const next = new Date(now); next.setHours(24, 0, 0, 0); setRemainingSeconds(Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))); }, 1000); return () => window.clearInterval(timer); }, []);
  const countdown = `${String(Math.floor(remainingSeconds / 3600)).padStart(2, "0")}:${String(Math.floor(remainingSeconds % 3600 / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  const purchase = (offerId: ShopOfferId) => { const offer = SHOP_OFFERS[offerId]; if (offer.price >= HIGH_VALUE_PRICE) setPendingOfferId(offerId); else buyShopOffer(offerId); };
  const pendingOffer = pendingOfferId ? SHOP_OFFERS[pendingOfferId] : undefined;
  return <section className="lobby-module-screen accent-teal"><ModuleHeader moduleId="shop" /><div className="shop-toolbar"><span>◈ {progress.sigils}</span><div className="shop-refresh-clock"><small>下次日更</small><b>{countdown}</b></div><button disabled={!progress.shop.freeRefreshAvailable} onClick={refreshShop}><RefreshCw size={14} />{progress.shop.freeRefreshAvailable ? "今日免費刷新" : "今日已刷新"}</button></div><div className="shop-list">{progress.shop.offers.map((offerId) => { const offer = SHOP_OFFERS[offerId]; const bought = progress.shop.purchased.includes(offerId); const canBuy = progress.sigils >= offer.price && !bought; return <article key={offerId} className={bought ? "is-bought" : ""}><i>{offer.icon}</i><div><b>{offer.title}</b><p>{offer.description}</p><small>{offer.reward.equipmentId ? "裝備獲得後可至工坊裝卸" : "立即獲得鍛造素材"}</small></div><button disabled={!canBuy} onClick={() => purchase(offerId)}>{bought ? <><Check size={13} />已購買</> : `◈ ${offer.price}`}</button></article>; })}</div><button className="secondary-cta wide-cta" onClick={() => openScreen("title")}><Sparkles size={17} />返回冒險大廳</button>{pendingOffer && <div className="dialog-backdrop shop-confirm-backdrop"><div className="shop-confirm-modal"><i>{pendingOffer.icon}</i><p className="screen-kicker">確認購買</p><h3>{pendingOffer.title}</h3><span>{pendingOffer.description}</span><div className="shop-confirm-cost"><span>需要支付</span><b>◈ {pendingOffer.price}</b><small>目前持有 ◈ {progress.sigils}</small></div><div className="shop-confirm-actions"><button className="secondary-cta" onClick={() => setPendingOfferId(null)}>取消</button><button className="primary-cta" onClick={() => { buyShopOffer(pendingOffer.id); setPendingOfferId(null); }}>確認購買</button></div></div></div>}</section>;
}

function LobbyModuleScreen({ moduleId }: { moduleId: LobbyModuleId }) {
  if (moduleId === "equipment") return <EquipmentScreen />;
  if (moduleId === "daily") return <DailyScreen />;
  if (moduleId === "dungeon") return <DungeonScreen />;
  return <ShopScreen />;
}

function TeamScreen() {
  const { openScreen, selectedHeroes, selectedDungeonId, toggleTeamHero } = useGameStore();
  const rosterPreviewParam = new URLSearchParams(window.location.search).get("rosterPreview");
  const rosterPreviewHero = SELECTABLE_HERO_IDS.find((heroId) => heroId === rosterPreviewParam);
  const displayedHeroIds = rosterPreviewHero ? [rosterPreviewHero] : SELECTABLE_HERO_IDS;
  return <section className="selection-screen">
    <button className="back-link" onClick={() => openScreen("title")}><ChevronLeft size={19} />回到舞台</button>
    <CourtyardSignboard kind="team" location="遠征旗亭 · 第一步" title="選擇三位登場英雄" summary="每局只會從此召喚池中呼喚英雄。你的組合，會決定可以走出的策略。" icon={<Swords size={26} />} />
    {selectedDungeonId && <div className="dungeon-launch-note"><ShieldCheck size={15} />即將挑戰：{DUNGEONS.find((dungeon) => dungeon.id === selectedDungeonId)?.title} · 進入命運舞台時扣除體力</div>}<div className="selection-count"><span>{selectedHeroes.length}</span>/3 已選</div>
    <div className="hero-choice-grid">{displayedHeroIds.map((heroId) => {
      const definition = HEROES[heroId]; const selected = selectedHeroes.includes(heroId);
      return <button key={heroId} className={`hero-choice ${selected ? "is-selected" : ""}`} style={{ "--hero-color": definition.color } as React.CSSProperties} onClick={() => toggleTeamHero(heroId)}><span className="hero-choice-art"><img src={HERO_PORTRAITS[heroId]} alt="" /><em>{definition.classLabel}</em></span><div><b>{definition.name}</b><small>{definition.tierNotes[1]}</small></div><i>{selected ? "已選" : "選擇"}</i></button>;
    })}</div>
    <button className="primary-cta wide-cta" disabled={selectedHeroes.length !== 3} onClick={() => openScreen("leader")}><Swords size={18} />決定隊長</button>
  </section>;
}

function LeaderScreen() {
  const { openScreen, selectedHeroes, leaderId, chooseLeader, startRun } = useGameStore();
  const previewAllLeaders = new URLSearchParams(window.location.search).get("leaderPreview") === "all";
  const leaderPreviewOffset = Math.max(0, Number.parseInt(new URLSearchParams(window.location.search).get("leaderPreviewOffset") ?? "0", 10) || 0);
  const displayedLeaderIds = previewAllLeaders ? SELECTABLE_HERO_IDS.slice(leaderPreviewOffset, leaderPreviewOffset + 5) : selectedHeroes;
  return <section className="selection-screen leader-screen">
    <button className="back-link" onClick={() => openScreen("team")}><ChevronLeft size={19} />重選隊伍</button>
    <CourtyardSignboard kind="leader" location="城門指揮旗 · 第二步" title="選一位帶領本局" summary="骰出四條時，隊長會立刻介入戰局；五條則由全隊合力展開必殺。" icon={<ShieldCheck size={26} />} />
    <div className="leader-list">{displayedLeaderIds.map((heroId) => {
      const definition = HEROES[heroId];
      const profile = LEADER_CARD_PROFILES[heroId];
      const cardStyle = { "--hero-color": definition.color, "--leader-accent": profile.accent, "--leader-glow": profile.glow } as React.CSSProperties;
      return <button key={heroId} className={`leader-option leader-card--${heroId} ${leaderId === heroId ? "is-selected" : ""}`} style={cardStyle} onClick={() => chooseLeader(heroId)}><LeaderHeroShowcase heroId={heroId} /><div className="leader-card-copy"><p className="leader-card-role"><i>{profile.emblem}</i>{profile.roleLabel}</p><b>{definition.name}</b><strong><Zap size={15} fill="currentColor" />{leaderSkill[heroId]}</strong></div><span>{leaderId === heroId ? "隊長" : "指定"}</span></button>;
    })}</div>
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
  return <button className={`hero-tile hero-${hero.heroId} tier-${hero.tier} ${selected ? "is-selected" : ""} ${previewing ? "is-previewing" : ""} ${displayAction === "skill" ? "is-casting" : ""} ${locked ? "is-locked" : ""}`} style={{ "--hero-color": definition.color } as React.CSSProperties} disabled={locked} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onPointerDown(index); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); onPointerUp(index); }} onPointerCancel={onPointerCancel} onContextMenu={(event) => event.preventDefault()} aria-label={`${definition.name} T${hero.tier}，生命 ${Math.ceil(hero.hp)}/${hero.maxHp}。長按可預覽攻擊動畫。`}><span className="hero-visual-zone">{characterVisual}</span><b className="tier-badge">T{hero.tier}</b>{hero.shield > 0 && <i className="shield-icon"><Shield size={10} fill="currentColor" /></i>}{displayAction === "skill" && <span className="preview-badge"><Sparkles size={9} />{isUltimateCast ? "必殺" : "技能"}</span>}{previewing && <span className="preview-badge"><Swords size={9} />預覽</span>}<em className="attack-orb" style={{ animationDuration: `${previewing ? .42 : Math.max(.45, hero.cooldown + .4)}s` }} /><span className="tile-hp"><i style={{ width: `${hp}%` }} /></span></button>;
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
  const previewingFixture = (hero: HeroInstance | null) => Boolean(previewFixture) && (
    previewFixture === "all" || hero?.heroId === previewFixture || (previewFixture === "3" && hero?.heroId === "fireMage")
  );
  return <section className="board-section"><div className="section-heading"><span><Swords size={15} />英雄舞台</span><small>點選 3 名同職同階後合成；拖曳可交換；長按預覽攻擊。</small></div><div className="hero-board">{run.board.map((hero, index) => <HeroTile key={hero?.id ?? `empty-${index}`} hero={hero} index={index} selected={selectedBoardIndexes.includes(index)} previewing={previewIndex === index || previewingFixture(hero)} onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={cancelPointer} />)}</div></section>;
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
  const { run, restartRun, openScreen, continueWave, progress } = useGameStore();
  if (!run || !["VICTORY", "DEFEAT", "WAVE_CLEAR"].includes(run.phase)) return null;
  if (run.phase === "WAVE_CLEAR") return <div className="wave-clear-banner"><Sparkles size={20} /><div><b>第 {run.wave} 波完成</b><span>{run.message}</span></div><button className="game-button teal" onClick={continueWave}>{run.wave >= 10 ? "揭開結局" : "下一波"}<ChevronLeft size={16} className="flip" /></button></div>;
  const won = run.phase === "VICTORY";
  const dungeon = run.dungeonId ? DUNGEONS.find((candidate) => candidate.id === run.dungeonId) : undefined;
  return <div className="dialog-backdrop"><div className={`result-modal ${won ? "is-victory" : "is-defeat"}`}><div className="result-seal">{won ? <Sparkles size={35} /> : <Shield size={35} />}</div><p>{won ? (dungeon ? "DUNGEON CLEARED" : "THE CURTAIN RISES") : "THE CASTLE FELL"}</p><h3>{won ? (dungeon ? `${dungeon.title} 通關！` : "勝利！") : "本局失利"}</h3><span>{run.message}</span>{won && dungeon && <div className="dungeon-reward-card"><small>副本獎勵</small><b><Gift size={16} />命運碎晶 +{dungeon.reward.crystals}</b><span>{dungeon.reward.label}{dungeon.reward.equipmentId && progress.inventory.includes(dungeon.reward.equipmentId) ? " · 已收錄背包" : ""}</span></div>}<div className="result-stats"><div><b>{run.wave}</b><small>抵達波次</small></div><div><b>{run.activeTalents.length}</b><small>取得天賦</small></div><div><b>{run.combat.castleHp}</b><small>城堡生命</small></div></div><button className="primary-cta wide-cta" onClick={restartRun}><RotateCcw size={17} />再玩一局</button><button className="text-button" onClick={() => openScreen("title")}>回到首頁</button></div></div>;
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
  return <section className="guide-screen"><button className="back-link" onClick={() => openScreen("title")}><ChevronLeft size={19} />首頁</button><CourtyardSignboard kind="guide" location="星圖檔案亭" title="一局的勝機，從留下一顆骰子開始。" summary="策略圖鑑 · 在出發前熟悉命運骰、召喚與守城規則。" icon={<img className="sign-logo-crest" src={LOGO_URL} alt="" />} /><div className="guide-cards"><article><span className="guide-icon dice-icon">⚄</span><h3>1. 留骰與重骰</h3><p>每波有五顆骰與兩次重骰。先點選鎖定值得保留的點數，再重骰其餘骰子。兩回合無組合後，下一回合會保證至少一對。</p></article><article><span className="guide-icon"><Sparkles size={24} /></span><h3>2. 召喚與合成</h3><p>骰型帶來召喚、隊長技或強化。三名同職、同階英雄點選後合成，T1 變 T2，T2 變 T3。棋盤滿時會轉成重整能量。</p></article><article><span className="guide-icon"><Swords size={24} /></span><h3>3. 守住十波</h3><p>英雄會自動迎敵。第 3、6、9 波後從三項天賦中選擇一項；第 10 波以雙階段 Boss 作為終幕。城堡生命歸零即失敗。</p></article></div><h3 className="dice-guide-heading">骰型一覽</h3><div className="combo-table">{Object.values(DICE_COMBINATIONS).slice().reverse().map((combo) => <div key={combo.kind}><b>{combo.label}</b><span>{combo.description}</span></div>)}</div><button className="primary-cta wide-cta" onClick={() => openScreen("team")}><Play size={17} fill="currentColor" />現在開演</button></section>;
}

export default function GameScreen() {
  const screen = useGameStore((state) => state.screen);
  const startDemo = useGameStore((state) => state.startDemo);
  const openScreen = useGameStore((state) => state.openScreen);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedModule = params.get("module");
    if (requestedModule && ["equipment", "shop", "daily", "dungeon"].includes(requestedModule)) {
      const timer = window.setTimeout(() => openScreen(requestedModule as LobbyModuleId), 0);
      return () => window.clearTimeout(timer);
    }
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
  return <main className="game-frame">{screen === "title" && <TitleScreen />}{screen === "team" && <TeamScreen />}{screen === "leader" && <LeaderScreen />}{screen === "game" && <BattleScreen />}{screen === "guide" && <GuideScreen />}{(["equipment", "shop", "daily", "dungeon"] as LobbyModuleId[]).includes(screen as LobbyModuleId) && <LobbyModuleScreen moduleId={screen as LobbyModuleId} />}</main>;
}
