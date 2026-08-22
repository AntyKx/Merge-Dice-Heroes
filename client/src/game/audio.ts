/**
 * 音效事件集中管理。MVP 未隨附音檔，因此此模組安全地保留事件契約，
 * 後續只需替換 emitAudio 的實作即可接入 Web Audio 或檔案資產。
 */
import type { PlayerProgress } from "./types";

export type AudioEvent =
  | "roll"
  | "lock"
  | "reroll"
  | "dice_result"
  | "summon"
  | "merge"
  | "attack"
  | "skill"
  | "enemy_hit"
  | "enemy_defeat"
  | "castle_hit"
  | "boss_enter"
  | "victory"
  | "defeat";

export function emitAudio(event: AudioEvent, settings: PlayerProgress["settings"]): AudioEvent | undefined {
  if (!settings.sfxEnabled) return undefined;
  // 音檔與 Web Audio 節點會在正式音效資產到位後於此處掛接；不自動播放避免瀏覽器權限錯誤。
  return event;
}

