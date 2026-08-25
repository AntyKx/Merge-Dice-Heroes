# Merge Dice Heroes：架構

> Run Engine 重構（Phase 2–9c）後改寫。局外／大廳架構不變，局內核心玩法已
> 全面換成 `client/src/game/run-engine/**` 與 `BattleScreenV2.tsx`。

## 執行分層

```text
React 畫面殼層
  ├─ App / Home（流程頁面與可存取介面）
  ├─ GameScreen.tsx（大廳、隊伍、裝備、商店、每日任務、試煉之門）
  └─ BattleScreenV2.tsx（局內：Dice/Board/Combat/Reward，新引擎專用）

client/src/game/run-engine（純 TypeScript 局內規則引擎，新）
  ├─ types.ts             HeroInstance、EnemyInstance、BoardState、RunState 等所有型別
  ├─ config.ts             Tier 倍率、命運能量、調度、Wave 長度等 Config
  ├─ heroes.ts / enemies.ts / waves.ts / leaders.ts / talents.ts / blessings.ts  內容資料
  ├─ rules/                dice、merge、pending、energy、board、targeting、block、wave、
  │                        castle、status、skill、combat、talent、blessing、leader、
  │                        equipment、relic、signatureWeapon（皆為純函式，逐一單元測試）
  ├─ orchestrator.ts       組成 WAVE_PREVIEW → …→ COMBAT_RUNNING → REWARD_RESOLVE →
  │                        下一波／RUN_WIN／RUN_LOSE 的完整 Wave 生命週期
  └─ metaAdapter.ts        MetaProgressionAdapter 介面（局外資料的唯一讀取窗口）

client/src/game（局外／Meta 核心，未變動）
  ├─ config.ts             英雄／裝備／商店／每日任務／副本／舊局內資料（沿用於顯示）
  ├─ heroProgress.ts、persistence.ts   英雄經驗、localStorage 進度
  ├─ store.ts               Zustand：局外狀態不變，局內 action 已改接 run-engine/orchestrator.ts
  ├─ defaultMetaAdapter.ts  新舊系統唯一銜接點，實作 MetaProgressionAdapter
  └─ engine/、rules/        舊版局內引擎，保留但已不再被 store 呼叫（可回退用）
```

## 主要責任

| 模組 | 責任 | 不可負責的內容 |
| --- | --- | --- |
| `run-engine/rules/*.ts` | 各自獨立的純規則（骰子、合成、阻擋、目標、戰鬥傷害…） | 彼此互相依賴、UI、React、Pixi |
| `run-engine/orchestrator.ts` | 組合所有 rules 成一次可玩的 Wave 生命週期；`advanceCombat()` 是唯一逐 tick 入口 | Hero/Enemy 專屬數值（來自 heroes.ts/enemies.ts） |
| `metaAdapter.ts` / `defaultMetaAdapter.ts` | 新引擎與局外進度（等級、裝備）之間唯一的資料橋接 | 直接操作 `store.ts`／`persistence.ts` |
| `BattleScreenV2.tsx` | 將新 `RunState` 投影為可操作畫面，呼叫 orchestrator 函式 | 推算傷害、骰型或戰鬥規則 |
| `GameScreen.tsx` | 大廳／局外流程頁的畫面殼層與路由 | 局內戰鬥規則 |

## 資料流

局內玩家事件（擲骰、鎖定、重骰、確認命運、選骰型效果、召喚、合成、調度、回收、確認陣型、選天賦／祝福）都透過 `store.ts` 呼叫 `run-engine/orchestrator.ts` 對應函式，函式驗證 `RunState.phase` 後回傳新的不可變 `RunState`。戰鬥中由固定 tick 呼叫 `advanceCombat()`，其內部依序處理出怪、阻擋、移動、城堡傷害、被阻擋敵人反擊、英雄普攻／技能／特性、狀態清理、隊長爆發，最後偵測清波／敗北並可能直接轉換到 `REWARD_RESOLVE`／`RUN_LOSE`。整局規則只存在 `run-engine/**` 一處，`BattleScreenV2.tsx` 只讀取回傳的 `RunState` 更新畫面。

## 戰鬥抽象

敵人存在於棋盤「之外」的 4 條 Route 上，以 `pathProgress`（0–1）表示沿路進度；棋盤是獨立的 4×4 純英雄格局，怪物在型別層級上不可能出現在棋盤裡（`BoardState.cells` 只能存放 `HeroInstance`）。英雄的攻擊涵蓋範圍由 `DefenseZone` 決定，阻擋（Block）依 Zone/Row 計算容量並每 tick 重新分配；被阻擋的敵人與其阻擋者互相攻擊，直到其中一方陣亡或敵人不再被阻擋為止。
