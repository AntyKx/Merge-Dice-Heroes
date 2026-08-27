/** 精靈骰塔劇場：垂直舞台卷軸介面，命運青綠標示可操作決策，戰鬥規則完全由 game/ 引擎掌管。 */
/* Design reminder: a bright royal-blue chibi castle is the fixed scenic stage; mobile HUD, progress, and compact actions must stay legible without covering the focal castle. */
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
import "./asterVowUiSkin.css";
import "./profileScreen.css";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Coins, Cross, Flame, Gift, Hand, Hammer, Info, Lock, Menu, Music2, PackageOpen, Pencil, Play, ScrollText, Settings2, Shield, ShieldCheck, Skull, Snowflake, Sparkles, Swords, Target, Trash2, UserRound, Volume2, X, Zap } from "lucide-react";
import BattleScreenV2 from "./BattleScreenV2";
import { DAILY_QUESTS, DUNGEONS, EQUIPMENT, getEquipmentBonuses, HEROES, SELECTABLE_HERO_IDS, SHOP_OFFERS } from "@/game/config";
import { HERO_BOARD_LAYOUT } from "@/game/heroBoardLayout";
import { HERO_FRAME_SHEETS, HeroFrameSprite, type HeroAnimationAction } from "@/game/heroSprites";
import { getHeroProgress, heroXpRequirement } from "@/game/heroProgress";
import { LEADER_CARD_PROFILES } from "@/game/leaderCardProfiles";
import { useGameStore } from "@/game/store";
import type { DailyQuestId, EquipmentSlot, HeroId, ShopOfferId } from "@/game/types";

const LOGO_URL = "/manus-storage/merge-dice-heroes-logo_260faa76.png";
const BACKDROP_URL = "/manus-storage/merge-dice-heroes-battlefield_1a6df969.png";
const HEROES_URL = "/manus-storage/merge-dice-heroes-characters_e2aafd6a.png";
const CUTE_LOBBY_BACKGROUND_URL = "/manus-storage/merge-dice-heroes-chibi-castle-courtyard_9bec38cf.png";
const LOBBY_BACKGROUND_URL = "/manus-storage/royal-blue-castle_91f126b8.webp";
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
const ASTERVOW_UI_ICON_URLS = {
  equipmentAttack: "/ui-astervow/icons/equipment/attack.png",
  equipmentDefense: "/ui-astervow/icons/equipment/defense.png",
  equipmentReset: "/ui-astervow/icons/equipment/reset.png",
  equipmentWeapon: "/ui-astervow/icons/equipment/weapon.png",
  equipmentArmor: "/ui-astervow/icons/equipment/armor.png",
  equipmentRelic: "/ui-astervow/icons/equipment/relic.png",
  shopSigils: "/ui-astervow/icons/shop/sigils.png",
  shopResetTime: "/ui-astervow/icons/shop/reset-time.png",
  shopRefresh: "/ui-astervow/icons/shop/refresh.png",
  shopMaterials: "/ui-astervow/icons/shop/materials.png",
  shopWeaponOffer: "/ui-astervow/icons/shop/weapon-offer.png",
  shopRelicOffer: "/ui-astervow/icons/shop/relic-offer.png",
  dungeonStamina: "/ui-astervow/icons/dungeon/stamina.png",
  dungeonChallenge: "/ui-astervow/icons/dungeon/challenge.png",
  dungeonLocked: "/ui-astervow/icons/dungeon/locked.png",
  dungeonReward: "/ui-astervow/icons/dungeon/reward.png",
  dungeonRule: "/ui-astervow/icons/dungeon/rule.png",
  dungeonStageBadge: "/ui-astervow/icons/dungeon/stage-badge.png",
  teamRosterCount: "/ui-astervow/icons/team/roster-count.png",
  teamTank: "/ui-astervow/icons/team/tank.png",
  teamFire: "/ui-astervow/icons/team/fire.png",
  teamHeal: "/ui-astervow/icons/team/heal.png",
  teamPierce: "/ui-astervow/icons/team/pierce.png",
  teamEdit: "/ui-astervow/icons/team/edit.png",
} as const;
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

const DICE_CODEX_ENTRIES = [
  { label: "無組合", tag: "基礎", effect: "＋1 命運能量", note: "可投入隨機或指定召喚。" },
  { label: "一對", tag: "立即", effect: "隨機召喚 1 名英雄", note: "英雄會進入棋盤或待命區。" },
  { label: "兩對", tag: "立即", effect: "隨機召喚 2 名英雄", note: "快速補足戰線。" },
  { label: "三條", tag: "指定", effect: "指定召喚 1 名英雄", note: "從目前編組選擇職業。" },
  { label: "小順子", tag: "本波", effect: "攻速＋15%", note: "僅在本波自動戰鬥有效。" },
  { label: "大順子", tag: "本波", effect: "攻速＋20%、傷害＋10%", note: "僅在本波自動戰鬥有效。" },
  { label: "葫蘆", tag: "特殊", effect: "下次合成僅需 2 名", note: "需選相同職業、相同 T 階。" },
  { label: "四條", tag: "特殊", effect: "隊長爆發立即就緒", note: "依隊長爆發規則施放。" },
  { label: "五條", tag: "特殊", effect: "指定 T1／T2 直接升階", note: "同時讓隊長爆發就緒。" },
] as const;

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

type LobbyModuleId = "equipment" | "shop" | "daily" | "dungeon";

const LOBBY_MODULES: Record<LobbyModuleId, { label: string; title: string; eyebrow: string; summary: string; icon: string; accent: string; status: string; items: Array<{ title: string; detail: string; tag: string }> }> = {
  equipment: { label: "裝備", title: "裝備工坊", eyebrow: "鍛造與配置", summary: "替隊長配置遺物與徽記；裝備效果會在每局開始前生效。", icon: "✦", accent: "gold", status: "3 件可查看", items: [{ title: "晨星長劍", detail: "全隊起始攻速 +4%", tag: "稀有" }, { title: "守望者披風", detail: "城堡最大生命 +2", tag: "普通" }, { title: "命運骰匣", detail: "第一回合額外獲得 1 次重骰", tag: "史詩" }] },
  shop: { label: "商店", title: "命運商店", eyebrow: "本日輪替", summary: "使用命運碎晶交換招募券、裝備藍圖與限定素材。", icon: "◈", accent: "teal", status: "刷新：06:42:18", items: [{ title: "英雄招募券", detail: "下次冒險可指定一次召喚選項", tag: "120 ✦" }, { title: "鍛造銅礦", detail: "裝備升級材料 ×20", tag: "80 ✦" }, { title: "霜華紋章", detail: "冰霜女王專屬飾品藍圖", tag: "240 ✦" }] },
  daily: { label: "每日任務", title: "冒險者日誌", eyebrow: "每日進度", summary: "完成日常行動以累積命運印記；每日 00:00 刷新。", icon: "✓", accent: "coral", status: "2 / 3 已完成", items: [{ title: "完成 1 局遠征", detail: "獎勵：命運碎晶 ×30", tag: "已完成" }, { title: "合成 3 次英雄", detail: "獎勵：鍛造銅礦 ×10", tag: "已完成" }, { title: "擊敗 1 名精英敵人", detail: "獎勵：英雄招募券 ×1", tag: "進行中" }] },
  dungeon: { label: "試煉", title: "試煉之門", eyebrow: "常駐挑戰", summary: "選擇特殊規則的舞台，為裝備與英雄突破收集素材。", icon: "⚔", accent: "violet", status: "第 1 區已開放", items: [{ title: "廢墟迴廊", detail: "敵軍攻速提高；掉落守望者披風素材", tag: "推薦戰力 180" }, { title: "霜凍祭壇", detail: "持續冰緩；掉落霜華紋章素材", tag: "第 2 區解鎖" }, { title: "暮影試煉", detail: "精英連戰；掉落暗影系列素材", tag: "第 3 區解鎖" }] },
};

function TitleScreen() {
  const { openScreen, progress, setSetting, selectedHeroes, leaderId, setTeamSlot, chooseLeader, startRun } = useGameStore();
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
  const launchExpedition = () => { if (departing || selectedHeroes.length !== 3) return; setDeparting(true); window.setTimeout(() => startRun(), 1100); };
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
    <div className="cute-hub-art" style={{ backgroundImage: `url(${LOBBY_BACKGROUND_URL})` }} aria-hidden="true" />
    <header className="cute-hub-hud" aria-label="玩家資源">
      <button className="cute-level cute-level--has-avatar" onClick={() => openScreen("profile")} aria-label={`${progress.playerName}，等級 ${playerLevel}，查看玩家檔案`}>
        <span className="cute-level__avatar">{HERO_PORTRAITS[leaderId] ? <img src={HERO_PORTRAITS[leaderId]} alt="" /> : <UserRound size={16} />}</span>
        <span>LV.</span><b>{String(playerLevel).padStart(2, "0")}</b><i><em style={{ width: `${levelProgress / 3 * 100}%` }} /></i>
      </button>
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

type CourtyardSignKind = LobbyModuleId | "guide" | "team" | "leader" | "profile";

const MODULE_SIGN_META: Record<LobbyModuleId, { location: string; icon: React.ReactNode }> = {
  equipment: { location: "城堡工坊巷", icon: <Hammer size={26} /> },
  shop: { location: "庭院市集", icon: <Coins size={26} /> },
  daily: { location: "花園日誌亭", icon: <Gift size={26} /> },
  dungeon: { location: "月影符文門", icon: <Swords size={26} /> },
};

function CourtyardSignboard({ kind, location, title, summary, icon }: { kind: CourtyardSignKind; location: string; title: string; summary: string; icon: React.ReactNode }) {
  return <header className={`courtyard-signboard sign-${kind}`}><i className="sign-emblem" aria-hidden="true">{icon}</i><div className="sign-plaque"><span className="sign-nail sign-nail-left" /><span className="sign-nail sign-nail-right" /><p>{location}</p><h2>{title}</h2><small>{summary}</small></div></header>;
}

const ASSET_SKINNED_MODULES = new Set<LobbyModuleId>(["equipment", "shop", "dungeon"]);

function BakedBannerCopy({ location, title, summary }: { location: string; title: string; summary: string }) {
  return <div className="baked-banner-copy"><p>{location}</p><h2>{title}</h2><small>{summary}</small></div>;
}

function ModuleHeader({ moduleId }: { moduleId: LobbyModuleId }) {
  const { openScreen } = useGameStore();
  const module = LOBBY_MODULES[moduleId];
  const sign = MODULE_SIGN_META[moduleId];
  const backLabel = "返回大廳";
  if (ASSET_SKINNED_MODULES.has(moduleId)) {
    return <><button className="back-link" onClick={() => openScreen("title")}><ChevronLeft size={19} />{backLabel}</button><BakedBannerCopy location={sign.location} title={module.title} summary={module.summary} /></>;
  }
  return <><button className="back-link" onClick={() => openScreen("title")}><ChevronLeft size={19} />{backLabel}</button><CourtyardSignboard kind={moduleId} location={sign.location} title={module.title} summary={module.summary} icon={sign.icon} /></>;
}

const SLOT_LABELS: Record<EquipmentSlot, string> = { weapon: "武器", armor: "護甲", relic: "遺物" };

const EQUIPMENT_SLOT_ICON_URLS: Record<EquipmentSlot, string> = { weapon: ASTERVOW_UI_ICON_URLS.equipmentWeapon, armor: ASTERVOW_UI_ICON_URLS.equipmentArmor, relic: ASTERVOW_UI_ICON_URLS.equipmentRelic };

// Design reminder: equipment effects belong with their matching slot, keeping the parchment
// plaque clear for the workshop title and the backpack list focused on item management.
function EquipmentScreen() {
  const { progress, equipItem, unequipItem, upgradeEquipment, dismantleEquipment } = useGameStore();
  const bonuses = getEquipmentBonuses(progress.equipped, progress.equipmentLevels);
  const [showEquipmentHelp, setShowEquipmentHelp] = useState(() => new URLSearchParams(window.location.search).get("equipmentHelp") === "1");
  const slotBonuses: Record<EquipmentSlot, { label: string; value: string }> = {
    weapon: { label: "攻擊", value: `+${Math.round(bonuses.attackMultiplier * 100)}%` },
    armor: { label: "城堡", value: `+${bonuses.castleBonus}` },
    relic: { label: "重骰", value: `+${bonuses.extraRerolls}` },
  };

  return <section className="lobby-module-screen accent-gold skin-equipment">
    <ModuleHeader moduleId="equipment" />
    <section className="equipment-loadout" aria-label="裝備配置">
      <header className="equipment-section-heading"><span>裝備配置</span><button className={`equipment-help ${showEquipmentHelp ? "is-open" : ""}`} type="button" onClick={() => setShowEquipmentHelp((open) => !open)} aria-expanded={showEquipmentHelp} aria-controls="equipment-help-panel" aria-label="查看裝備工坊用途">?</button></header>
      {showEquipmentHelp && <aside id="equipment-help-panel" className="equipment-help-panel" role="note"><button type="button" onClick={() => setShowEquipmentHelp(false)} aria-label="關閉說明"><X size={13} /></button><b>裝備工坊用途</b><p>在這裡裝備、升級或分解物件。每個欄位顯示它已帶來的本局加成；裝備效果會在下一局開始時套用。</p></aside>}
      <div className="equipment-slots">{(["weapon", "armor", "relic"] as EquipmentSlot[]).map((slot) => <button key={slot} className="equipment-slot astervow-slot" onClick={() => progress.equipped[slot] && unequipItem(slot)}><img className="astervow-icon equipment-slot-icon" src={EQUIPMENT_SLOT_ICON_URLS[slot]} alt="" /><small>{SLOT_LABELS[slot]}</small><b>{progress.equipped[slot] ? EQUIPMENT[progress.equipped[slot]!].name : "尚未裝備"}</b><em className="equipment-slot-bonus">{slotBonuses[slot].label}<strong>{slotBonuses[slot].value}</strong></em><span>{progress.equipped[slot] ? "點擊卸下" : "背包內選擇"}</span></button>)}</div>
    </section>
    <div className="module-status"><span>背包 {progress.inventory.length} 件 · 鍛造銅礦 {progress.materials}</span><b>本局養成</b></div>
    <div className="astervow-divider" aria-hidden="true" />
    <section className="equipment-inventory" aria-label="背包收藏"><header className="equipment-section-heading"><span>背包收藏</span><small>{progress.inventory.length} 件可管理</small></header><div className="inventory-list">{progress.inventory.map((equipmentId) => { const item = EQUIPMENT[equipmentId]; const equipped = progress.equipped[item.slot] === equipmentId; const level = progress.equipmentLevels[equipmentId] ?? 1; const upgradeCost = level * 8; return <article key={equipmentId} className={`astervow-card ${equipped ? "is-equipped" : ""}`}><i><img className="astervow-icon item-row-icon" src={EQUIPMENT_SLOT_ICON_URLS[item.slot]} alt="" /></i><div><b>{item.name}</b><p>{item.description}</p><small>{SLOT_LABELS[item.slot]} · Lv.{level}/5<em className="astervow-badge">{item.rarity}</em></small></div><div className="equipment-actions"><button className="astervow-btn is-cream" onClick={() => equipItem(equipmentId)}>{equipped ? <><Check size={14} />已裝備</> : "裝備"}</button><button className="astervow-btn is-green" disabled={level >= 5 || progress.materials < upgradeCost} onClick={() => upgradeEquipment(equipmentId)}><Hammer size={12} />升級 {level >= 5 ? "MAX" : upgradeCost}</button><button className="dismantle-button astervow-btn is-red" onClick={() => dismantleEquipment(equipmentId)}><Trash2 size={12} />分解</button></div></article>; })}</div></section>
  </section>;
}

function DailyScreen() {
  const { progress, claimDailyReward, openScreen } = useGameStore(); const [celebrating, setCelebrating] = useState(false); const values: Record<DailyQuestId, number> = { battle: progress.daily.battles, merge: progress.daily.merges, victory: progress.daily.victories };
  const claim = (questId: DailyQuestId) => { claimDailyReward(questId); setCelebrating(true); window.setTimeout(() => setCelebrating(false), 1500); };
  return <section className={`lobby-module-screen accent-coral ${celebrating ? "is-reward-celebrating" : ""}`}><div className="daily-celebration-flare" aria-hidden="true" /><ModuleHeader moduleId="daily" /><div className="module-status"><span>今日任務 {progress.daily.claimed.length} / {DAILY_QUESTS.length} 已領取</span><b>刷新於 00:00</b></div><div className="quest-list">{DAILY_QUESTS.map((quest) => { const value = values[quest.id]; const ready = value >= quest.target && !progress.daily.claimed.includes(quest.id); const claimed = progress.daily.claimed.includes(quest.id); return <article key={quest.id} className={claimed ? "is-claimed" : ready ? "is-ready" : ""}><div className="quest-top"><div><b>{quest.title}</b><p>{quest.description}</p></div><em>{value} / {quest.target}</em></div><div className="quest-progress"><i style={{ width: `${Math.min(100, value / quest.target * 100)}%` }} /></div><footer><span><Gift size={13} />命運碎晶 ×{quest.rewardCrystals}</span><button disabled={!ready} onClick={() => claim(quest.id)}>{claimed ? <><Check size={13} />已領取</> : ready ? "領取獎勵" : "進行中"}</button></footer></article>; })}</div><button className="secondary-cta wide-cta" onClick={() => openScreen("title")}><Sparkles size={17} />返回冒險大廳</button></section>;
}

// Design reminder: keep the built-in gate plaque isolated for its title; present stamina
// preparation first, then trial cards, so players can scan cost, unlock path, and rewards in order.
function DungeonScreen() {
  const { progress, selectDungeon } = useGameStore();
  const [showDungeonHelp, setShowDungeonHelp] = useState(() => new URLSearchParams(window.location.search).get("dungeonHelp") === "1");
  const rewardPreviewIcon = (equipmentId?: "morningBlade" | "watcherCloak" | "fateDiceBox") => equipmentId === "watcherCloak" ? ASTERVOW_UI_ICON_URLS.equipmentArmor : equipmentId === "fateDiceBox" ? ASTERVOW_UI_ICON_URLS.equipmentRelic : ASTERVOW_UI_ICON_URLS.dungeonReward;
  return <section className="lobby-module-screen accent-violet skin-dungeon">
    <ModuleHeader moduleId="dungeon" />
    <section className="dungeon-prep" aria-label="挑戰準備"><header className="dungeon-section-heading"><span>挑戰準備</span><button className={`dungeon-help ${showDungeonHelp ? "is-open" : ""}`} type="button" onClick={() => setShowDungeonHelp((open) => !open)} aria-expanded={showDungeonHelp} aria-controls="dungeon-help-panel" aria-label="查看試煉之門用途">?</button></header><div className="dungeon-energy"><img className="astervow-icon" src={ASTERVOW_UI_ICON_URLS.dungeonStamina} alt="" /><b>體力 {progress.stamina} / 20</b><span>每次挑戰消耗對應體力</span></div></section>
    <div className="astervow-divider" aria-hidden="true" />
    <section className="dungeon-trials" aria-label="試煉關卡"><header className="dungeon-section-heading"><span>試煉關卡</span><small>{DUNGEONS.length} 道門扉</small></header><div className="dungeon-list">{DUNGEONS.map((dungeon, index) => { const previousDungeon = DUNGEONS[index - 1]; const unlocked = dungeon.unlocked || (Boolean(previousDungeon) && (progress.dungeonClears[previousDungeon.id] ?? 0) > 0); const enoughEnergy = progress.stamina >= dungeon.energyCost; const clears = progress.dungeonClears[dungeon.id] ?? 0; const unlockCondition = index === 0 ? "首道門扉已開放" : `完成「${previousDungeon.title}」1 次後解鎖`; return <article key={dungeon.id} className={`astervow-card ${!unlocked ? "is-locked" : ""}`}><div className="dungeon-stage-number"><img className="astervow-icon dungeon-stage-badge" src={ASTERVOW_UI_ICON_URLS.dungeonStageBadge} alt="" /><span>{String(index + 1).padStart(2, "0")}</span></div><div><b>{dungeon.title}</b><p>{dungeon.description}</p><small>推薦戰力 {dungeon.recommendedPower} · 體力 {dungeon.energyCost}</small><strong className="dungeon-rule"><img className="astervow-icon" src={ASTERVOW_UI_ICON_URLS.dungeonRule} alt="" />{dungeon.enemyRule.label}</strong>{!unlocked && <p className="dungeon-unlock-note"><Lock size={11} />{unlockCondition}</p>}<div className="dungeon-drop-preview"><img className="astervow-icon" src={rewardPreviewIcon(dungeon.reward.equipmentId)} alt="" /><span><small>可能掉落</small><b>{dungeon.reward.label}</b></span><em>{clears ? `已通關 ${clears} 次` : "首通獎勵"}</em></div></div><footer><span><img className="astervow-icon" src={ASTERVOW_UI_ICON_URLS.dungeonReward} alt="" />碎晶 ✦{dungeon.reward.crystals}</span><button className="astervow-btn is-purple" disabled={!unlocked || !enoughEnergy} onClick={() => selectDungeon(dungeon.id)}>{!unlocked ? <><img className="astervow-icon" src={ASTERVOW_UI_ICON_URLS.dungeonLocked} alt="" />未解鎖</> : !enoughEnergy ? "體力不足" : <><img className="astervow-icon" src={ASTERVOW_UI_ICON_URLS.dungeonChallenge} alt="" />挑戰</>}</button></footer></article>; })}</div></section>
    {showDungeonHelp && <div className="dungeon-help-overlay" role="presentation" onClick={() => setShowDungeonHelp(false)}><aside id="dungeon-help-panel" className="dungeon-help-panel" role="dialog" aria-modal="true" aria-label="試煉之門用途" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setShowDungeonHelp(false)} aria-label="關閉說明"><X size={13} /></button><b>試煉之門用途</b><p>在這裡挑戰帶有特殊規則的關卡，消耗對應體力並取得英雄與裝備養成素材。完成前一道試煉即可解鎖下一道門扉。</p></aside></div>}
  </section>;
}

const HIGH_VALUE_PRICE = 12;

function ShopScreen() {
  // Design reminder: keep the marketplace plaque clear for its title; place currency and
  // refresh timing in one concise supply band, then let the offer cards stand on their own.
  const { progress, buyShopOffer, refreshShop } = useGameStore();
  const [pendingOfferId, setPendingOfferId] = useState<ShopOfferId | null>(null);
  const [showShopHelp, setShowShopHelp] = useState(() => new URLSearchParams(window.location.search).get("shopHelp") === "1");
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const now = new Date(); const next = new Date(now); next.setHours(24, 0, 0, 0); return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  });
  useEffect(() => { const timer = window.setInterval(() => { const now = new Date(); const next = new Date(now); next.setHours(24, 0, 0, 0); setRemainingSeconds(Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))); }, 1000); return () => window.clearInterval(timer); }, []);
  const countdown = `${String(Math.floor(remainingSeconds / 3600)).padStart(2, "0")}:${String(Math.floor(remainingSeconds % 3600 / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  const purchase = (offerId: ShopOfferId) => { const offer = SHOP_OFFERS[offerId]; if (offer.price >= HIGH_VALUE_PRICE) setPendingOfferId(offerId); else buyShopOffer(offerId); };
  const pendingOffer = pendingOfferId ? SHOP_OFFERS[pendingOfferId] : undefined;
  const offerIcon = (offerId: ShopOfferId): string => offerId === "forgeBundle" ? ASTERVOW_UI_ICON_URLS.shopMaterials : offerId === "morningBladeOffer" ? ASTERVOW_UI_ICON_URLS.shopWeaponOffer : ASTERVOW_UI_ICON_URLS.shopRelicOffer;
  return <section className="lobby-module-screen accent-teal skin-shop">
    <ModuleHeader moduleId="shop" />
    <section className="shop-supply" aria-label="今日補給"><header className="shop-section-heading"><span>今日補給</span><button className={`shop-help ${showShopHelp ? "is-open" : ""}`} type="button" onClick={() => setShowShopHelp((open) => !open)} aria-expanded={showShopHelp} aria-controls="shop-help-panel" aria-label="查看命運商店用途">?</button></header>{showShopHelp && <aside id="shop-help-panel" className="shop-help-panel" role="note"><button type="button" onClick={() => setShowShopHelp(false)} aria-label="關閉說明"><X size={13} /></button><b>命運商店用途</b><p>使用命運符印交換今日商品。每日可免費刷新一次；高價商品會在購買前再次確認。</p></aside>}<div className="shop-toolbar"><span className="astervow-chip"><img className="astervow-icon" src={ASTERVOW_UI_ICON_URLS.shopSigils} alt="" />{progress.sigils}</span><div className="shop-refresh-clock"><img className="astervow-icon" src={ASTERVOW_UI_ICON_URLS.shopResetTime} alt="" /><small>下次日更</small><b>{countdown}</b></div><button className="astervow-btn is-teal" disabled={!progress.shop.freeRefreshAvailable} onClick={refreshShop}><img className="astervow-icon" src={ASTERVOW_UI_ICON_URLS.shopRefresh} alt="" />{progress.shop.freeRefreshAvailable ? "今日免費刷新" : "今日已刷新"}</button></div></section>
    <div className="astervow-divider" aria-hidden="true" />
    <section className="shop-offers" aria-label="本日商店"><header className="shop-section-heading"><span>本日商店</span><small>{progress.shop.offers.length} 件商品</small></header><div className="shop-list">{progress.shop.offers.map((offerId) => { const offer = SHOP_OFFERS[offerId]; const bought = progress.shop.purchased.includes(offerId); const canBuy = progress.sigils >= offer.price && !bought; return <article key={offerId} className={`astervow-card ${bought ? "is-bought" : ""}`}><i><img className="astervow-icon item-row-icon" src={offerIcon(offerId)} alt="" /></i><div><b>{offer.title}</b><p>{offer.description}</p><small>{offer.reward.equipmentId ? "裝備獲得後可至工坊裝卸" : "立即獲得鍛造素材"}</small></div><button className="astervow-btn is-teal" disabled={!canBuy} onClick={() => purchase(offerId)}>{bought ? <><Check size={13} />已購買</> : <><img className="astervow-icon" src={ASTERVOW_UI_ICON_URLS.shopSigils} alt="" />{offer.price}</>}</button></article>; })}</div></section>
    {pendingOffer && <div className="dialog-backdrop shop-confirm-backdrop"><div className="shop-confirm-modal"><i>{pendingOffer.icon}</i><p className="screen-kicker">確認購買</p><h3>{pendingOffer.title}</h3><span>{pendingOffer.description}</span><div className="shop-confirm-cost"><span>需要支付</span><b>◈ {pendingOffer.price}</b><small>目前持有 ◈ {progress.sigils}</small></div><div className="shop-confirm-actions"><button className="secondary-cta astervow-btn is-cream" onClick={() => setPendingOfferId(null)}>取消</button><button className="primary-cta astervow-btn is-teal" onClick={() => { buyShopOffer(pendingOffer.id); setPendingOfferId(null); }}>確認購買</button></div></div></div>}
  </section>;
}

function LobbyModuleScreen({ moduleId }: { moduleId: LobbyModuleId }) {
  if (moduleId === "equipment") return <EquipmentScreen />;
  if (moduleId === "daily") return <DailyScreen />;
  if (moduleId === "dungeon") return <DungeonScreen />;
  return <ShopScreen />;
}

function TeamScreen() {
  // Design reminder: this route is a read-only Hero Codex. Team formation and expedition
  // controls belong exclusively to the Royal Court so the catalogue stays exploratory.
  const { openScreen, progress } = useGameStore();
  const requestedHero = new URLSearchParams(window.location.search).get("codexHero");
  const initialHero = SELECTABLE_HERO_IDS.includes(requestedHero as HeroId) ? requestedHero as HeroId : "knight";
  const [focusedHeroId, setFocusedHeroId] = useState<HeroId>(initialHero);
  const collectionPageSize = 10;
  const [collectionPage, setCollectionPage] = useState(() => Math.floor(SELECTABLE_HERO_IDS.indexOf(initialHero) / collectionPageSize));
  const [showCodexHelp, setShowCodexHelp] = useState(() => new URLSearchParams(window.location.search).get("codexHelp") === "1");
  const hero = HEROES[focusedHeroId];
  const heroProgress = getHeroProgress(progress.heroProgress[focusedHeroId]);
  const nextExperience = heroXpRequirement(heroProgress.level);
  const attackSpeed = (1 / hero.attackInterval).toFixed(2);
  const roleLabel = { tank: "前線守護", area: "範圍壓制", single: "精準輸出", support: "支援回復" }[hero.role];
  const collectionPageCount = Math.ceil(SELECTABLE_HERO_IDS.length / collectionPageSize);
  const collectionPageStart = collectionPage * collectionPageSize;
  const visibleHeroIds = SELECTABLE_HERO_IDS.slice(collectionPageStart, collectionPageStart + collectionPageSize);
  const focusCatalogueHero = (heroId: HeroId) => {
    setFocusedHeroId(heroId);
    setCollectionPage(Math.floor(SELECTABLE_HERO_IDS.indexOf(heroId) / collectionPageSize));
  };

  return <section className="selection-screen skin-team hero-codex-screen">
    <button className="back-link" onClick={() => openScreen("title")}><ChevronLeft size={19} />回到大廳</button>
    <BakedBannerCopy location="王城藏書室 · 英雄圖鑑" title="英雄檔案館" summary="閱讀已解鎖英雄的戰鬥資料、成長紀錄與技能檔案。" />
    <button className={`hero-codex-help ${showCodexHelp ? "is-open" : ""}`} type="button" onClick={() => setShowCodexHelp((open) => !open)} aria-expanded={showCodexHelp} aria-controls="hero-codex-help-panel" aria-label="查看英雄圖鑑用途">?</button>
    {showCodexHelp && <aside id="hero-codex-help-panel" className="hero-codex-help-panel" role="note"><button type="button" onClick={() => setShowCodexHelp(false)} aria-label="關閉說明"><X size={13} /></button><b>英雄圖鑑用途</b><p>這裡用來查看英雄的成長、戰鬥數值與技能檔案。隊伍編組與遠征請回到王都操作。</p></aside>}

    <article className="hero-codex-feature" style={{ "--codex-color": hero.color } as React.CSSProperties}>
      <div className="hero-codex-feature__art"><img className="hero-codex-feature__portrait" src={HERO_PORTRAITS[focusedHeroId] ?? HEROES_URL} alt="" /><span>{hero.classLabel}</span></div>
      <div className="hero-codex-feature__identity"><small>{roleLabel} · 已解鎖</small><h2>{hero.name}</h2><p>{hero.tierNotes[1]}</p><div className="hero-codex-level"><b>Lv.{heroProgress.level}</b><span><i style={{ width: `${Math.min(100, Math.round(heroProgress.experience / nextExperience * 100))}%` }} />{heroProgress.experience} / {nextExperience} EXP</span></div></div>
      <div className="hero-codex-stats" aria-label={`${hero.name}基礎數值`}>
        <span><small>攻擊</small><b>{hero.attack}</b></span><span><small>生命</small><b>{hero.maxHp}</b></span><span><small>射程</small><b>{Math.round(hero.range * 10)}</b></span><span><small>攻速</small><b>{attackSpeed}</b></span>
      </div>
    </article>

    <section className="hero-codex-skills" aria-label={`${hero.name}技能檔案`}>
      <header><span><Sparkles size={15} />戰術檔案</span><small>資料會隨未來養成系統持續擴充</small></header>
      <article><i>01</i><div><small>T1 特性</small><b>{hero.tierNotes[1]}</b></div></article>
      <article><i>02</i><div><small>隊長技能</small><b>{leaderSkill[focusedHeroId]}</b></div></article>
      <article><i>03</i><div><small>T3 終階</small><b>{hero.tierNotes[3]}</b></div></article>
    </section>

    <section className="hero-codex-collection" aria-label="已解鎖英雄收藏">
      <header><span>已解鎖英雄</span><span className="hero-codex-page-status"><small>{collectionPage + 1} / {collectionPageCount}</small><button type="button" aria-label="上一頁英雄" disabled={collectionPage === 0} onClick={() => setCollectionPage((page) => page - 1)}>‹</button><button type="button" aria-label="下一頁英雄" disabled={collectionPage === collectionPageCount - 1} onClick={() => setCollectionPage((page) => page + 1)}>›</button></span></header>
      <div>{visibleHeroIds.map((heroId) => {
        const entry = HEROES[heroId]; const entryProgress = getHeroProgress(progress.heroProgress[heroId]);
        return <button type="button" key={heroId} className={heroId === focusedHeroId ? "is-active" : ""} style={{ "--catalogue-hero-color": entry.color } as React.CSSProperties} onClick={() => focusCatalogueHero(heroId)}><img className="hero-codex-collection__portrait" src={HERO_PORTRAITS[heroId] ?? HEROES_URL} alt="" /><span><b>{entry.name}</b><small>{entry.classLabel} · Lv.{entryProgress.level}</small></span></button>;
      })}</div>
    </section>

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

function ProfileScreen() {
  // Design reminder: the LV. HUD entry now leads here instead of straight to the Hero
  // Codex. Play history reads real progress data; avatar rewards are still a
  // placeholder -- see the user's own "以後" framing -- so this screen doesn't
  // silently promise avatar unlocks that don't exist yet. Account login (Google via
  // Firebase Auth) is real, cloud-syncing this same PlayerProgress through the
  // separate Cloudflare Worker in cloud/. Apple sign-in isn't wired up yet.
  const { openScreen, progress, setPlayerName, leaderId, user, signInGoogle, signOutUser, cloudSyncError } = useGameStore();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(progress.playerName);
  const [signingIn, setSigningIn] = useState(false);
  const avatarUrl = HERO_PORTRAITS[leaderId];
  const totalGames = progress.wins + progress.losses;
  const winRate = totalGames > 0 ? Math.round((progress.wins / totalGames) * 100) : 0;
  const commitName = () => { setPlayerName(nameDraft); setEditingName(false); };
  return <section className="selection-screen profile-screen">
    <button className="back-link" onClick={() => openScreen("title")}><ChevronLeft size={19} />首頁</button>
    <CourtyardSignboard kind="profile" location="王都名冊閣" title="玩家檔案" summary="查看遊玩履歷、頭像與基本資料設定。" icon={<UserRound size={26} />} />

    <div className="profile-identity">
      <span className="profile-identity__avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={30} />}</span>
      <div className="profile-identity__info">
        {editingName
          ? <div className="profile-name-edit">
              <input value={nameDraft} maxLength={12} onChange={(event) => setNameDraft(event.target.value)} aria-label="輸入新的玩家 ID" />
              <button onClick={commitName} aria-label="儲存 ID"><Check size={14} /></button>
              <button onClick={() => { setNameDraft(progress.playerName); setEditingName(false); }} aria-label="取消修改"><X size={14} /></button>
            </div>
          : <button className="profile-name" onClick={() => setEditingName(true)} aria-label={`修改玩家 ID，目前為 ${progress.playerName}`}><span>{progress.playerName}</span><Pencil size={12} /></button>}
        <small>目前隊長：{HEROES[leaderId].name}</small>
      </div>
    </div>

    <section className="profile-section" aria-label="遊玩履歷">
      <header><ScrollText size={14} /><span>遊玩履歷</span></header>
      <div className="profile-stats">
        <div><b>{progress.wins}</b><small>勝場</small></div>
        <div><b>{progress.losses}</b><small>敗場</small></div>
        <div><b>{winRate}%</b><small>勝率</small></div>
        <div><b>{progress.bestWave}</b><small>最高波次</small></div>
      </div>
    </section>

    <section className="profile-section" aria-label="頭像獎勵">
      <header><Sparkles size={14} /><span>頭像獎勵</span></header>
      <p className="profile-placeholder">敬請期待——之後會依成就與活動解鎖更多可更換的頭像。</p>
    </section>

    <section className="profile-section" aria-label="帳號登入">
      <header><Settings2 size={14} /><span>帳號登入</span></header>
      {user
        ? <div className="profile-account">
            <p className="profile-account__status"><Check size={13} />已登入：{user.email ?? user.displayName ?? "Google 帳號"}</p>
            <button className="profile-account__signout" onClick={() => signOutUser()}>登出</button>
          </div>
        : <>
            <p className="profile-placeholder">登入 Google 帳號即可在不同裝置間同步遊玩進度。（Apple 登入尚未開放）</p>
            <button className="profile-account__signin" disabled={signingIn} onClick={async () => { setSigningIn(true); await signInGoogle(); setSigningIn(false); }}>{signingIn ? "登入中…" : "使用 Google 登入"}</button>
          </>}
      {cloudSyncError && <p className="profile-account__error"><AlertTriangle size={12} />{cloudSyncError}</p>}
    </section>
  </section>;
}

function GuideScreen() {
  const { openScreen } = useGameStore();
  return <section className="guide-screen"><button className="back-link" onClick={() => openScreen("title")}><ChevronLeft size={19} />首頁</button><CourtyardSignboard kind="guide" location="星圖檔案亭" title="命運骰收藏圖鑑" summary="策略圖鑑 · 選擇前了解每種骰型的立即效果、持續效果與操作條件。" icon={<img className="sign-logo-crest" src={LOGO_URL} alt="" />} /><div className="guide-cards"><article><span className="guide-icon dice-icon">⚄</span><h3>1. 留骰與重骰</h3><p>每波有五顆骰與兩次重骰。先點選鎖定值得保留的點數，再重骰其餘骰子。兩回合無組合後，下一回合會保證至少一對。</p></article><article><span className="guide-icon"><Sparkles size={24} /></span><h3>2. 召喚與合成</h3><p>骰型帶來召喚、隊長技或強化。三名同職、同階英雄點選後合成，T1 變 T2，T2 變 T3。棋盤滿時會轉成重整能量。</p></article><article><span className="guide-icon"><Swords size={24} /></span><h3>3. 守住十波</h3><p>英雄會自動迎敵。第 3、6、9 波後從三項天賦中選擇一項；第 10 波以雙階段 Boss 作為終幕。城堡生命歸零即失敗。</p></article></div><h3 className="dice-guide-heading">全部骰型 · 效果收藏</h3><div className="combo-table dice-codex-table">{DICE_CODEX_ENTRIES.map((combo) => <div key={combo.label}><b>{combo.label}<i>{combo.tag}</i></b><span><strong>{combo.effect}</strong>{combo.note}</span></div>)}</div><button className="primary-cta wide-cta" onClick={() => openScreen("team")}><Play size={17} fill="currentColor" />現在開演</button></section>;
}

export default function GameScreen() {
  const screen = useGameStore((state) => state.screen);
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
  }, [openScreen]);
  return <main className="game-frame">{screen === "title" && <TitleScreen />}{screen === "team" && <TeamScreen />}{screen === "leader" && <LeaderScreen />}{screen === "game" && <BattleScreenV2 />}{screen === "guide" && <GuideScreen />}{screen === "profile" && <ProfileScreen />}{(["equipment", "shop", "daily", "dungeon"] as LobbyModuleId[]).includes(screen as LobbyModuleId) && <LobbyModuleScreen moduleId={screen as LobbyModuleId} />}</main>;
}
