# Merge Dice Heroes：交付說明

> 本文件於「Run Engine 重構」（Phase 2–9c）完成後全面改寫，取代原先描述舊版
> MVP 戰鬥迴圈的版本。大廳／局外系統（隊伍、裝備、商店、每日任務、試煉之
> 門、英雄等級）維持原有內容不變，僅局內核心玩法（骰子、召喚、合成、佈陣、
> 自動戰鬥、天賦／祝福）整套換成新引擎。

## 目前狀態總覽

| 層級 | 狀態 | 說明 |
| --- | --- | --- |
| 局外／大廳（Meta） | 沿用原架構 | 隊伍編組、隊長選擇、裝備、商店、每日任務、試煉之門、英雄等級／經驗，皆維持 `client/src/game/config.ts`、`heroProgress.ts`、`persistence.ts` 原有實作與資料，本輪未變動。 |
| 局內核心玩法（Run） | **全新引擎** | Dice → Summon → Merge → Formation → Auto Combat → Talent/Blessing 已依《玩法核心.txt》重新設計並實作，見下方「新 Run Engine」。 |
| 銜接層 | `defaultMetaAdapter.ts` | 新引擎透過 `MetaProgressionAdapter` 介面讀取英雄等級與裝備加成，從不直接引用 `store.ts`／`persistence.ts`，局外系統可獨立演進。 |

## 新 Run Engine（`client/src/game/run-engine/`）

| 功能區塊 | 完成內容 |
| --- | --- |
| 骰子 | 五骰、鎖定、重骰、確認命運；同一骰型結果可能同時符合多種組合，一律列出全部選項讓玩家自選效果（絕不自動挑「最優」）。 |
| 召喚 | 骰型效果（隨機／指定召喚）、命運能量（合併原召喚／重整能量）花費召喚、待命區（滿版時暫存，上限 2，絕不無聲丟棄英雄）。 |
| 棋盤 | 4×4 純英雄棋盤，以 DefenseZone（1–4）× BoardRow（front/midFront/midBack/back）定位；敵軍道路獨立於棋盤之上，怪物永遠不會進入棋盤（型別層級保證）。 |
| 合成 | T1→T2→T3（Run 內限定，出局不保留）；同英雄同階最多需 3 名，「葫蘆」骰型可讓下一次合成僅需 2 名。 |
| 調度／回收 | 每波基礎 2 次免費調度（可花命運能量加購）；回收棋盤英雄換取命運能量。 |
| 自動戰鬥 | 每 tick：出怪 → 阻擋分配（每 tick 重算）→ 移動（含減速上限）→ 抵城扣血 → 被阻擋敵人反擊 → 英雄普攻／技能觸發／被動特性 → 效果套用（傷害／治療／護盾／增益／減益）→ 清理過期狀態 → 隊長爆發自動觸發。 |
| 隊長 | 全程生效的被動（傷害或城堡加成），四條骰觸發爆發技能就緒、五條骰額外附贈升階與爆發。 |
| 天賦／祝福 | 每波清完提供 3 選 1 天賦（起始 8 項，含通用與英雄專屬），每 3 波額外提供祝福（起始 6 項）；效果皆以 opaque effectId 透過 registry 解析，內容量預留擴充。 |
| 裝備／聖物銜接 | Phase 8 已建立 `rules/equipment.ts`／`rules/relic.ts`／`rules/signatureWeapon.ts` 擴充點，銜接既有裝備系統與未來的英雄突破／簽名武器系統，但尚未有實際新內容。 |

## 局內畫面（`client/src/pages/BattleScreenV2.tsx`）

取代舊版 `GameScreen.tsx` 內建的 Header／EnemyStrip／Board／DiceTray 等元件，改為一組直接對應新引擎狀態機的畫面：波次預覽、骰子決策、多重骰型選擇、準備階段（召喚／合成／調度／回收／待命區）、4 車道敵軍路徑視覺化＋4×4 棋盤、即時戰鬥、天賦／祝福獎勵、暫停、結算。此階段刻意不做逐幀角色動畫或手繪背景，優先確保規則正確與流程完整。

## 核心架構

```
React 畫面殼層
  ├─ Home / App（局外流程頁）
  ├─ GameScreen.tsx（大廳／隊伍／裝備／商店／每日任務／試煉之門，維持原樣）
  └─ BattleScreenV2.tsx（局內：新 Run Engine 專用畫面）

client/src/game/run-engine（純 TypeScript 規則引擎，新）
  ├─ types.ts             所有新引擎型別（HeroInstance、EnemyInstance、RunState…）
  ├─ config.ts             Tier 倍率、命運能量、調度、Wave 長度等數值設定
  ├─ heroes.ts / enemies.ts / waves.ts / leaders.ts / talents.ts / blessings.ts
  │                        10 名英雄、8 種敵人、10 波、10 位隊長、天賦／祝福內容
  ├─ rules/                dice、merge、pending、energy、board、targeting、block、
  │                        wave、castle、status、skill、combat、talent、blessing、
  │                        leader、equipment、relic、signatureWeapon（皆為純函式）
  ├─ orchestrator.ts       將以上規則組成完整可玩的 Wave 生命週期
  └─ metaAdapter.ts        MetaProgressionAdapter 介面定義

client/src/game（原局外／Meta 核心，未變動）
  ├─ config.ts / heroProgress.ts / persistence.ts / store.ts（Run 相關 action 已改接新引擎）
  ├─ engine/ 、rules/（舊版局內引擎，保留但已不再被 store 呼叫）
  └─ defaultMetaAdapter.ts 新舊系統唯一銜接點
```

## 玩法流程

大廳選擇三名英雄與隊長、按下「開始遠征」後進入 `BattleScreenV2`：擲出命運骰 → 鎖骰／重骰 → 確認命運 → 選擇一項骰型效果 → 準備階段（召喚、合成、調度、回收，處理完待命區與待選英雄後）→ 確認陣型開戰 → 自動戰鬥直到清波或城堡陷落 → 清波後選一項天賦（每 3 波額外選一項祝福）→ 前往下一波，第 10 波清完即勝利。

## 驗證結果

| 驗證項目 | 結果 |
| --- | --- |
| `pnpm check` | 通過，TypeScript 無型別錯誤。 |
| `pnpm lint` | 通過（`client/src/game`、`GameScreen.tsx`、`BattleScreenV2.tsx`、`GameCanvas.tsx`、`App.tsx`）。 |
| `pnpm test` | 通過，30 個測試檔、166 項測試，涵蓋新引擎每個純規則模組、orchestrator 端到端整合測試、局外進度／獎勵測試。 |
| `pnpm build` | 通過，Vite production build 與伺服器 bundle 皆成功。 |
| 瀏覽器人工驗證 | 以 Chrome 走完整黃金流程：大廳 → 遠征 → 擲骰 → 骰型選擇 → 召喚＋調度 → 開戰 → 即時戰鬥（出怪／移動／阻擋／攻擊／擊殺／反擊）→ 城堡受損／戰敗 → 重新開始 → 清波 → 天賦選擇 → 下一波，過程中發現並修正一個坦克阻擋後打不到被擋敵人的實質規則錯誤。 |

## 已知限制與下一步

局外系統（商店、每日任務、試煉之門專屬敵人數值加成、英雄圖鑑動畫）本輪未變動，其中試煉之門的敵人強化倍率尚未接上新引擎（沿用固定波次內容）。新版局內畫面沒有逐幀角色動畫、沒有 Debug 面板；新手指南（`GuideScreen`）文字仍描述舊版規則，尚待更新。Boss 階段腳本、戰場事件、硬控制（暈眩／凍結）皆為明確保留的後續項目。舊版 `game/engine/**`、`game/rules/**` 引擎程式碼與測試仍保留在專案中但已不被呼叫，屬刻意保留的可回退選擇。

## 執行指令

```bash
pnpm dev
pnpm lint
pnpm test
pnpm check
pnpm build
```
