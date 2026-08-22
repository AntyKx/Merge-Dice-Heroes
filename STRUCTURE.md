# Merge Dice Heroes：架構

## 執行分層

```text
React 畫面殼層
  ├─ App / Home（流程頁面與可存取介面）
  ├─ GameScreen（HUD、棋盤、骰盅、彈窗）
  └─ GameCanvas（背景與即時戰鬥視覺）

client/src/game（純 TypeScript 遊戲核心）
  ├─ config/        英雄、敵人、骰型、波次、天賦資料
  ├─ rules/         dice、merge、talent、damage 純規則
  ├─ engine/        run reducer、wave controller、combat simulator
  ├─ types.ts       所有對外資料型別
  └─ persistence.ts 設定與局外進度 localStorage
```

## 主要責任

| 模組 | 責任 | 不可負責的內容 |
| --- | --- | --- |
| `dice.ts` | 擲骰、鎖定、重骰、保底與骰型辨識 | UI 動畫與按鈕狀態 |
| `merge.ts` | 空位、召喚、三合驗證、合成和重整能量 | DOM 選取或視覺特效 |
| `combat.ts` | 敵人生成、目標搜尋、攻擊、治療、阻擋、Boss 行為與勝敗 | JSX 或 CSS |
| `run.ts` | 明確階段轉換、骰型效果、波次推進、天賦應用 | 視覺渲染細節 |
| `GameScreen.tsx` | 將 `RunState` 投影為可操作的直式 UI | 推算傷害或骰型規則 |
| `GameCanvas.tsx` | 顯示戰場、路徑、怪物、投射物與傷害事件 | 成為第二份遊戲狀態 |

## 資料流

玩家事件（擲骰、鎖定、重骰、結算、召喚、選人、合成、選天賦）進入 `run` 遊戲控制器。控制器先驗證 `GamePhase`，再以純規則修改不可變 `RunState`。戰鬥期間，由單一固定間隔呼叫 `advanceCombat`，並由回傳的新 `RunState` 同步 React UI 與場景視覺。這保證遊戲規則只存在一處。

## 戰鬥抽象

敵人在固定 S 型路徑上擁有 `pathProgress`。所有距離判定都使用對應的虛擬座標；騎士以阻擋名額將最接近的敵人固定在自己前方，其他英雄依職業目標規則發動攻擊。投射物、傷害數字和爆炸是視覺事件，不承擔傷害判定。

## 資產提示

`battlefield` 作為低調戰場襯底，四位英雄使用同一張角色素材表作為卡面插圖；真正棋盤與戰鬥單位以程式化色塊、職業徽章、血條、光圈和原創 CSS 圖形呈現，保持可讀性和後續替換彈性。

