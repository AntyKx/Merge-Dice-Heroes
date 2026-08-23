# Merge Dice Heroes MVP：交付說明

## 已完成內容

此版本是一款可於瀏覽器操作的直式單局策略遊戲。流程從首頁開始，玩家可選擇三名英雄和一名隊長，接著在十波敵軍之間反覆執行擲骰、鎖骰、重骰、骰型結算、召喚、三合升階和自動戰鬥。城堡生命歸零會進入失敗畫面，擊敗第十波雙階段 Boss 後會進入勝利畫面，兩種結果都可直接重新開始。

| 功能區塊 | 完成內容 |
| --- | --- |
| 骰子策略 | 五骰、鎖定、最多兩次重骰、提前結算、九種骰型優先序、連續無組合保底、骰型效果與開發用指定骰型。 |
| 英雄與合成 | 4×4 棋盤、四名資料驅動英雄、每局三人召喚池、T1/T2/T3、三合確認、位置交換、滿盤重整能量與可用重整。 |
| 自動塔防 | 路徑前進、騎士阻擋、遠程／範圍／治療職業、投射與傷害視覺、敵人抵堡扣血、八類敵人、Boss 第二階段與棋盤封鎖。 |
| Roguelite | 第 3、6、9 波三選一天賦，內建 18 項資料驅動天賦及層數上限；四名隊長的四條技能與五條全場必殺。 |
| 畫面與設定 | 首頁、隊伍選擇、隊長選擇、戰鬥、天賦、暫停、圖鑑、勝利、失敗；手機直式框架、PixiJS 戰場、localStorage 設定與紀錄、音效／音樂／震動開關、PWA manifest。 |
| 開發工具 | 僅開發環境顯示的骰型、英雄、波次、城堡生命與 1×/2×/4× 戰鬥速度控制；`?demo` 進入可重現的自動戰鬥展示。 |

## 核心架構

React 負責頁面流程、觸控 UI 與彈窗；Zustand 持有前端狀態；`client/src/game/` 將資料定義、骰型、合成、戰鬥模擬、波次控制、儲存與音效事件分開。PixiJS 只將既有戰鬥狀態繪製成道路上的敵人、血條與傷害提示，並不持有第二份遊戲規則。這使得骰型判定、合成驗證與戰鬥可以獨立測試。

| 主要檔案 | 用途 |
| --- | --- |
| `client/src/game/types.ts` | HeroDefinition、HeroInstance、EnemyDefinition、EnemyInstance、DiceState、DiceCombination、TalentDefinition、ActiveTalent、WaveDefinition、CombatState、GamePhase、RunState、PlayerProgress 等型別。 |
| `client/src/game/config.ts` | 英雄、敵人、骰型、18 項天賦與十波資料。 |
| `client/src/game/rules/dice.ts`、`merge.ts` | 純骰型與棋盤合成規則。 |
| `client/src/game/engine/combat.ts`、`run.ts` | 固定 tick 戰鬥與明確遊戲階段控制器。 |
| `client/src/game/store.ts` | Zustand 動作、介面事件、局外進度與開發工具。 |
| `client/src/components/GameCanvas.tsx` | PixiJS 即時戰場繪製層。 |
| `client/src/pages/GameScreen.tsx` | 所有可見畫面、骰盅、棋盤與彈窗。 |
| `client/src/index.css` | 「精靈骰塔劇場」的紙雕舞台、職業徽記、階級光環與命運骰視覺。 |
| `ideas.md`、`PLAN.md`、`STRUCTURE.md`、`ASSETS.md`、`MEMORY.md` | 設計、風險、架構、素材與續作記錄。 |

## 遊玩方式

首頁按下「展開新一局」後，選擇三名英雄與一名隊長。戰鬥頁先點擊骰子進行鎖定，再重骰或提前結算。骰型效果完成後，在棋盤上以召喚能量補人；點選三名同職、同階英雄再按「合成」即可升階，長按後拖到另一格可交換位置。確認沒有待選英雄或免費升階後，按「開戰」進入自動戰鬥。波次完成後選擇天賦或進入下一波；暫停可調整戰鬥速度。

## 驗證結果

| 驗證項目 | 結果 |
| --- | --- |
| `pnpm lint` | 通過。檢查自訂遊戲、頁面與 PixiJS 元件，不允許顯式 `any`。 |
| `pnpm test` | 通過：3 個測試檔、18 項測試，涵蓋九種骰型、優先序、T1/T2 合成、不同職業／階級拒絕、滿盤、城堡失敗、波次結算、天賦上限、Boss 第二階段和勝利結算。 |
| `pnpm check` | 通過。TypeScript 無型別錯誤。 |
| `pnpm build` | 通過。Vite production build 與靜態伺服器 bundle 均成功。 |
| 瀏覽器檢查 | 已檢查直式 390×844 的首頁及 `/?demo` 即時戰鬥；近期 Console 未發現錯誤。 |

## 目前占位項目與已知限制

英雄、標誌與戰場使用原創生成素材；棋盤上的即時英雄以原創職業徽記、色彩和階級光環呈現，敵人以 PixiJS 的一致風格幾何剪影呈現。音效事件已保留並遵守瀏覽器自動播放限制，但 MVP 尚未內建實際音檔；音樂開關目前僅保存設定。戰鬥素材是輕量 2D 表現，尚未加入逐幀角色動畫或實體音樂。production build 有一項 JavaScript bundle 體積提示，主要來自 PixiJS；不影響建置或操作。

## 下一階段最值得優先改善的三項

1. 為四英雄和八類敵人製作分離的可替換 sprite／逐幀動畫，並增加投射物、燃燒和治療特效的職業差異。
2. 接入實際 Web Audio 音檔、背景音樂與可調整音量，將既有 `AudioEvent` 契約連到正式素材。
3. 以多次自動模擬校準十波怪物數值、天賦出現率與不同隊伍的勝率，並根據結果加入難度選擇。

## 執行指令

```bash
pnpm dev
pnpm lint
pnpm test
pnpm check
pnpm build
```

