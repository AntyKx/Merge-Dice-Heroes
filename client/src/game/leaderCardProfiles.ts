import type { HeroId } from "./types";

export type LeaderCardProfile = {
  stageLabel: string;
  roleLabel: string;
  emblem: string;
  sky: string;
  ground: string;
  glow: string;
  accent: string;
  frameScale: number;
  shiftX: number;
  shiftY: number;
  usePortrait?: boolean;
};

/**
 * 隊長卡的構圖語言：每位英雄都以武器方向、輪廓高度與職業意象設定獨立錨點。
 * 數值以既有棋盤 idle 基準為母座標，避免改變戰鬥精靈的安全縮放。
 */
export const LEADER_CARD_PROFILES: Record<HeroId, LeaderCardProfile> = {
  knight: {
    stageLabel: "盾誓前庭", roleLabel: "前列守護", emblem: "◆", sky: "#9bd4ef", ground: "#477e97", glow: "#fff0a6", accent: "#e5b34b", frameScale: 1, shiftX: 12, shiftY: 0,
  },
  fireMage: {
    stageLabel: "燼焰觀星台", roleLabel: "爆燃術式", emblem: "✦", sky: "#f4a56f", ground: "#8a3f45", glow: "#fff0b3", accent: "#ed744f", frameScale: 1.04, shiftX: 7, shiftY: -2,
  },
  archer: {
    stageLabel: "翠羽瞭望塔", roleLabel: "遠距狙擊", emblem: "➹", sky: "#a7d98e", ground: "#36795f", glow: "#e5ffbc", accent: "#64b36f", frameScale: 1.03, shiftX: -6, shiftY: -1,
  },
  priest: {
    stageLabel: "晨曦祈願所", roleLabel: "全隊祝福", emblem: "✧", sky: "#e8c3ef", ground: "#80689b", glow: "#fff5ce", accent: "#b886cf", frameScale: 1, shiftX: 2, shiftY: 0,
  },
  ranger: {
    stageLabel: "森語密徑", roleLabel: "獵手標記", emblem: "❈", sky: "#9ccf9b", ground: "#356f58", glow: "#eaffba", accent: "#5aa26d", frameScale: 1.04, shiftX: -7, shiftY: -2,
  },
  engineer: {
    stageLabel: "齒輪工坊", roleLabel: "機關超載", emblem: "✹", sky: "#f1c78a", ground: "#8d603d", glow: "#fff1af", accent: "#d99842", frameScale: 1.15, shiftX: 4, shiftY: 0, usePortrait: true,
  },
  deathKnight: {
    stageLabel: "冥衛壁壘", roleLabel: "暗甲護陣", emblem: "✠", sky: "#9b8ab8", ground: "#453963", glow: "#d9c4ff", accent: "#7968b3", frameScale: 1.01, shiftX: 5, shiftY: -1,
  },
  bard: {
    stageLabel: "潮音亭", roleLabel: "和鳴支援", emblem: "♬", sky: "#94dce0", ground: "#3f8892", glow: "#e1ffff", accent: "#56adb7", frameScale: 1.02, shiftX: -1, shiftY: 0,
  },
  fighter: {
    stageLabel: "裂地競技場", roleLabel: "近戰連擊", emblem: "✸", sky: "#e9a079", ground: "#8e4e43", glow: "#ffe4a7", accent: "#d75e49", frameScale: 1.03, shiftX: 2, shiftY: 0,
  },
  frostQueen: {
    stageLabel: "王室冰晶廳", roleLabel: "凍結領域", emblem: "♕", sky: "#b8e5f0", ground: "#4d8296", glow: "#f4fcce", accent: "#6fb6d5", frameScale: 1.02, shiftX: -2, shiftY: -1,
  },
  assassin: {
    stageLabel: "暮影迴廊", roleLabel: "雙刃處決", emblem: "✦", sky: "#b68fcb", ground: "#503d6e", glow: "#f0c6ff", accent: "#9566b5", frameScale: 1.03, shiftX: -5, shiftY: 0,
  },
};
