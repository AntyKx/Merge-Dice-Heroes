"""
One-off asset repair script (not part of the app runtime).

The Aug-25 "migrate to external storage" commit removed the locally-hosted
20-frame hero animation sprite sheets from the repo and pointed the app at
Manus's proprietary Forge storage proxy instead -- which only exists inside
Manus's own dev/preview environment, not on an independent Vercel deploy.
Result: every hero's animated sprite (home team formation, battle board)
silently fails to load in production.

The raw per-frame source PNGs are still sitting in 素材/英雄圖/<hero>/individual/
(untracked, kept out of git only because of size/CJK-path concerns, per
MEMORY.md). This script recomposites them into the exact single-file,
single-column, N-frames-stacked-vertically PNG that GameScreen.tsx's
HeroFrameSprite component expects, and writes them into
client/public/hero-sheets/ so Vite bundles them as ordinary static files --
no runtime proxy needed.

Frame size is 400x350 (2x downscale from the 800x700 source, half-res) --
raised from an original 200x175 once the home-screen lobby formation and
other display contexts started rendering heroes past ~150px tall, where the
4x-downscaled version visibly softened.

Usage: python3 scripts/build_hero_sheets.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "素材" / "英雄圖"
OUT = ROOT / "client" / "public" / "hero-sheets"

# heroId -> (source folder name, individual-frame filename prefix)
HEROES = {
    "knight": ("聖騎士", "holy_paladin"),
    "fireMage": ("火焰法師", "fire_mage"),
    "ranger": ("森林遊俠", "forest_ranger"),
    "deathKnight": ("死亡騎士", "death_knight"),
    "bard": ("吟遊詩人", "bard"),
    "assassin": ("刺客", "assassin"),
    "fighter": ("武鬥家", "martial_artist"),
    "priest": ("晨曦祭司", "dawn_priest"),
    "engineer": ("機關技師", "mechanist"),
    "frostQueen": ("皇家公主", "royal_princess"),
}

# Matches HeroFrameSprite's actions map in GameScreen.tsx exactly:
# idle:{start:0,count:6} attack:{start:6,count:5} skill:{start:11,count:3} move:{start:14,count:6}
ACTIONS = [("idle", 6), ("attack", 5), ("skill", 3), ("move", 6)]

FRAME_W, FRAME_H = 400, 350  # 8:7, matches the 800x700 source canvas, downscaled 2x for web delivery

OUT.mkdir(parents=True, exist_ok=True)
manifest = {}

for hero_id, (folder, prefix) in HEROES.items():
    individual_dir = SRC / folder / "individual"
    frames = []
    for action, count in ACTIONS:
        for i in range(1, count + 1):
            path = individual_dir / f"{prefix}_{action}_{i:02d}.png"
            if not path.exists():
                raise FileNotFoundError(f"missing frame: {path}")
            img = Image.open(path).convert("RGBA").resize((FRAME_W, FRAME_H), Image.LANCZOS)
            frames.append(img)
    assert len(frames) == 20, f"{hero_id}: expected 20 frames, got {len(frames)}"

    sheet = Image.new("RGBA", (FRAME_W, FRAME_H * len(frames)), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (0, FRAME_H * i))

    out_name = f"hero-sheet-{hero_id}.png"
    out_path = OUT / out_name
    sheet.save(out_path, optimize=True)
    size_kb = out_path.stat().st_size / 1024
    manifest[hero_id] = out_name
    print(f"{hero_id}: wrote {out_name} ({sheet.size[0]}x{sheet.size[1]}, {size_kb:.0f} KB)")

print()
print("HERO_SHEET_URLS entries:")
for hero_id, name in manifest.items():
    print(f'  {hero_id}: "/hero-sheets/{name}",')
