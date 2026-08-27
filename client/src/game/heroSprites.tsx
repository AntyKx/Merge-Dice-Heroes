/**
 * Shared animated hero sprite rendering -- used by both GameScreen.tsx (lobby
 * team formation, leader select) and BattleScreenV2.tsx (the Run Engine board),
 * so a summoned hero looks the same in both places. Pulled out of GameScreen.tsx
 * into its own module specifically so BattleScreenV2.tsx can import it without
 * creating a circular import between the two page components.
 *
 * Assets are bundled locally under client/public/hero-sheets/hero-sheet-*.png
 * (git-tracked, regenerated via scripts/build_hero_sheets.py from the raw
 * per-frame source PNGs in the untracked 素材/英雄圖/<hero>/individual/ folders).
 * They used to live on Manus's "external storage" instead, reached through a
 * dev-only Vite proxy (manus-storage-proxy in vite.config.ts) that only exists
 * inside Manus's own environment -- on an independent Vercel deploy those URLs
 * silently resolved to the SPA's index.html fallback instead of image bytes, so
 * every animated hero sprite rendered blank in production.
 */
import { useEffect, useState } from "react";
import type { HeroBoardLayout } from "./heroBoardLayout";
import type { HeroId } from "./types";

export type HeroAnimationAction = "idle" | "attack" | "skill" | "move";

type FrameRange = { start: number; count: number };
type HeroFrameSheet = { source: string; totalFrames: number; actions: Record<HeroAnimationAction, FrameRange> };

type ExternalHeroSheetId = Exclude<HeroId, "archer">;
const HERO_SHEET_URLS: Record<ExternalHeroSheetId, string> = {
  assassin: "/hero-sheets/hero-sheet-assassin.png",
  bard: "/hero-sheets/hero-sheet-bard.png",
  deathKnight: "/hero-sheets/hero-sheet-deathKnight.png",
  engineer: "/hero-sheets/hero-sheet-engineer.png",
  fighter: "/hero-sheets/hero-sheet-fighter.png",
  fireMage: "/hero-sheets/hero-sheet-fireMage.png",
  frostQueen: "/hero-sheets/hero-sheet-frostQueen.png",
  knight: "/hero-sheets/hero-sheet-knight.png",
  priest: "/hero-sheets/hero-sheet-priest.png",
  ranger: "/hero-sheets/hero-sheet-ranger.png",
};
const heroSheet = (heroId: ExternalHeroSheetId): HeroFrameSheet => ({ source: HERO_SHEET_URLS[heroId], totalFrames: 20, actions: { idle: { start: 0, count: 6 }, attack: { start: 6, count: 5 }, skill: { start: 11, count: 3 }, move: { start: 14, count: 6 } } });

export const HERO_FRAME_SHEETS: Partial<Record<HeroId, HeroFrameSheet>> = {
  fireMage: heroSheet("fireMage"),
  knight: heroSheet("knight"),
  frostQueen: heroSheet("frostQueen"),
  assassin: heroSheet("assassin"),
  bard: heroSheet("bard"),
  priest: heroSheet("priest"),
  ranger: heroSheet("ranger"),
  engineer: heroSheet("engineer"),
  fighter: heroSheet("fighter"),
  deathKnight: heroSheet("deathKnight"),
};

export function HeroFrameSprite({ heroId, action, animationSignal = 0, boardLayout }: { heroId: HeroId; action: HeroAnimationAction; animationSignal?: number; boardLayout?: HeroBoardLayout }) {
  const frameSheet = HERO_FRAME_SHEETS[heroId];
  const [frame, setFrame] = useState(0);
  const range = frameSheet?.actions[action];
  const frameCount = range?.count ?? 0;
  const attackFrameParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("attackFrame") : null;
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
