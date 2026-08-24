# Legacy UI Asset Manifest

This directory restores the 13 original UI files that were referenced by the game but omitted from the first Claude handoff. When deploying outside Manus, upload these files to the static asset host and replace the matching `/manus-storage/...` paths in `client/src/pages/GameScreen.tsx` with the resulting public URLs.

| Local file | Original runtime path | Interface use |
|---|---|---|
| `logo.png` | `/manus-storage/merge-dice-heroes-logo_260faa76.png` | Game logo |
| `battlefield.png` | `/manus-storage/merge-dice-heroes-battlefield_1a6df969.png` | Battle-stage background |
| `characters.png` | `/manus-storage/merge-dice-heroes-characters_e2aafd6a.png` | Legacy character illustration |
| `courtyard-background.png` | `/manus-storage/merge-dice-heroes-chibi-castle-courtyard_9bec38cf.png` | Castle courtyard background |
| `castle-walkway-party-transparent.png` | `/manus-storage/castle-walkway-party-transparent_1070719d.png` | Castle walkway party illustration |
| `nav-equipment.png` | `/manus-storage/equipment_b47d9ea9.png` | Equipment entry icon |
| `nav-shop.png` | `/manus-storage/shop_410470c0.png` | Shop entry icon |
| `nav-daily.png` | `/manus-storage/daily_5ebf446e.png` | Daily entry icon |
| `nav-guide.png` | `/manus-storage/guide_4803f3b1.png` | Guide entry icon |
| `nav-dungeon.png` | `/manus-storage/dungeon_540de8ab.png` | Dungeon entry icon |
| `nav-castle.png` | `/manus-storage/castle_6220a0fb.png` | Castle/Kingdom entry icon |
| `nav-expedition.png` | `/manus-storage/expedition_a43a1129.png` | Expedition entry icon |
| `nav-forge.png` | `/manus-storage/forge_195bcb52.png` | Forge entry icon |
