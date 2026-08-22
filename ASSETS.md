# Assets

**Art direction：** 精靈骰塔劇場。日式 Q 版 JRPG 與桌遊劇場結合；暖象牙紙材、霧藍舞台、苔綠地形、命運青綠互動色與琥珀金魔法光點。所有角色為原創輪廓，以深海軍藍線條和柔和賽璐珞明暗維持小尺寸辨識度。

## Backgrounds

| Name | Description | Size | Image |
| --- | --- | --- | --- |
| `visual_target` | 完整直式戰鬥畫面構圖參考，僅供畫面 QA | 390×844 px | `/manus-storage/merge-dice-heroes-visual-target_06be46d8.png` |
| `battlefield` | 直式 S 型道路與劇場紙雕地形背景 | 390×844 px，填滿遊戲視窗 | `/manus-storage/merge-dice-heroes-battlefield_1a6df969.png` |

## Sprites

| Name | Description | Size | Image |
| --- | --- | --- | --- |
| `hero_sheet` | 騎士、火焰法師、弓箭手、祭司四職業原創角色插圖 | 卡牌 72×72 px；棋盤 42×42 px | `/manus-storage/merge-dice-heroes-characters_e2aafd6a.png` |
| `brand_mark` | 上升箭頭骰面與四角星的原創命運骰符號 | 首頁 72×72 px；圖鑑 32×32 px | `/manus-storage/merge-dice-heroes-logo_260faa76.png` |

## User-Supplied Animated Sprites

| Name | Description | Size | Image |
| --- | --- | --- | --- |
| `fire_mage_idle` | 使用者提供的 6 格火焰法師待機序列；透明背景、角色面向右方 | 棋盤 54×54 px；戰場 72×72 px | `/manus-storage/fire_mage_idle_01_dd9c787a.png` 至 `/manus-storage/fire_mage_idle_06_ff80c5af.png` |
| `fire_mage_attack` | 使用者提供的 5 格火球攻擊序列；第 4 格為衝擊點 | 棋盤 54×54 px；戰場 72×72 px | `/manus-storage/fire_mage_attack_01_2e246144.png` 至 `/manus-storage/fire_mage_attack_05_a29906ca.png` |
| `fire_mage_skill` | 使用者提供的 3 格火焰環／火龍技能序列；第 2 格為效果高峰 | 棋盤 72×72 px；隊長技能 132×132 px | `/manus-storage/fire_mage_skill_01_5419226e.png` 至 `/manus-storage/fire_mage_skill_03_8116e215.png` |

**素材檢查記錄：** 使用者提供 20 格 PNG、711×493 px 的透明格畫布與 `anchor=(295,351)`。待機和移動各 6 格、攻擊 5 格、技能 3 格；角色造型為原創的紅黑服飾、銀髮與火焰法球的 Q 版火焰法師，輪廓和技能特效已足夠支援遊戲內呈現。

**統一逐影格播放器：** 十位有完整素材的英雄已重新編譯成 240×240 px 格的直列透明 WebP sprite sheet，並在前端使用同一個逐影格播放器、幀率、居中錨點與棋盤安全區。空白原始影格（祭司待機第 4 格、死亡騎士攻擊第 1 格、吟遊詩人技能第 3 格）會在編譯時略過。

**聖騎士替換素材：** 使用者新提供 20 格、768×600 px 的透明 PNG，包括 idle 6 格、attack 5 格、move 6 格、skill 3 格。待機影格為金髮藍披風、盾牌與長劍的完整輪廓；技能第 2 格具有大面積金白天使翼與法陣，重編譯時需要保留特效比例，但在棋盤可視區內裁切且不侵入生命條安全區。

## Floating Island Lobby Assets

| Name | Description | Runtime URL |
| --- | --- | --- |
| `dice_tower_island_map` | 原創直式浮島王國大廳主場景；中央骰塔與各入口的留白地標區 | `/manus-storage/dice-tower-island-map_a71cc5b2.png` |
| `dice_tower_castle_vignette` | 原創骰塔城堡小島，作為組隊遠征中央入口 | `/manus-storage/dice-tower-castle-vignette_54d9981d.png` |
| `dice_tower_dungeon_vignette` | 原創紫晶地城門小島，作為副本入口 | `/manus-storage/dice-tower-dungeon-vignette_d285c369.png` |

| Name | Description | Runtime Asset |
| --- | --- | --- |
| `knight` | 神聖騎士：守護／阻擋（更新既有職業視覺） | `/manus-storage/knight_idle_cea764bb.webp`、`knight_attack_f691c2ef.webp` |
| `priest` | 神聖祭司：治療／加速（更新既有職業視覺） | `/manus-storage/priest_idle_e4e1739a.webp`、`priest_attack_606c0b85.webp` |
| `ranger` | 森林遊俠：狙擊／穿透 | `/manus-storage/ranger_idle_69cb4ae3.webp`、`ranger_attack_7c5d6d0e.webp` |
| `engineer` | 機關技師：範圍／連鎖 | `/manus-storage/engineer_idle_b65c12de.webp`、`engineer_attack_ed6c113b.webp` |
| `deathKnight` | 死亡騎士：冥衛／阻擋 | `/manus-storage/deathKnight_idle_5b21f9c4.webp`、`deathKnight_attack_975d6920.webp` |
| `bard` | 水樂吟遊詩人：治療／加速 | `/manus-storage/bard_idle_0d9f3cfe.webp`、`bard_attack_993ced97.webp` |
| `fighter` | 武鬥家：近戰／連擊 | `/manus-storage/fighter_idle_662fa570.webp`、`fighter_attack_2be794f0.webp` |
| `frostQueen` | 冰霜女王：範圍／寒霜 | `/manus-storage/frostQueen_idle_c9e01bcf.webp`、`frostQueen_attack_82aef509.webp` |
| `assassin` | 暗影刺客：瞬擊／處決 | `/manus-storage/assassin_idle_c1304b96.webp`、`assassin_attack_7c9fb49a.webp` |

| Name | Skill asset |
| --- | --- |
| 火焰法師、聖騎士、神聖祭司 | `/manus-storage/fireMage_skill_54e072aa.webp`、`knight_skill_94ec2e6c.webp`、`priest_skill_f4c26695.webp` |
| 森林遊俠、機關技師、死亡騎士 | `/manus-storage/ranger_skill_09f45d09.webp`、`engineer_skill_329d1bb1.webp`、`deathKnight_skill_1a823946.webp` |
| 吟遊詩人、武鬥家、冰霜女王、暗影刺客 | `/manus-storage/bard_skill_d629e30d.webp`、`fighter_skill_e2e370f1.webp`、`frostQueen_skill_acd6e1d5.webp`、`assassin_skill_8f67f386.webp` |

## User-Supplied Selection Portraits

使用者提供十張方形職業肖像，已以 440×440 px WebP 最佳化並專用於「選擇登場英雄」卡片；這些肖像不會取代棋盤上的逐幀動畫。

| Roles | Portrait assets |
| --- | --- |
| 聖騎士、火焰法師、神官祭司 | `/manus-storage/knight_e04e7edb.webp`、`fire-mage_69098bcc.webp`、`priest_cdb9439c.webp` |
| 暗影刺客、皇家公主、森林遊俠 | `/manus-storage/assassin_6dc251bd.webp`、`frost-queen_9e2ac060.webp`、`ranger_c3a1fc95.webp` |
| 吟遊詩人、死亡騎士、機關技師、武鬥家 | `/manus-storage/bard_2a50639e.webp`、`death-knight_8d85600c.webp`、`engineer_6fba977b.webp`、`fighter_9eaee4ec.webp` |

## Code-drawn Assets

| Name | Description | Size |
| --- | --- | --- |
| `dice` | 象牙骰面、圓角黑藍點數、青綠鎖定環 | 54×54 px |
| `board_tile` | 舞台底座格、各階級外框與增益徽記 | 62×62 px |
| `monsters` | 史萊姆、狼、盾兵、弓手、薩滿、自爆怪、精英、Boss 的原創簡化輪廓 | 20–44 px |
| `effects` | 投射物、治療、火焰、護盾、傷害數字、合成星芒 | 10–120 px |
