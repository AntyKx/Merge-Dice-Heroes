# 王都大廳入口研究筆記

## 研究案例與觀察

| 案例 | 觀察 | 對《Merge Dice Heroes》的意義 |
| --- | --- | --- |
| Cookie Run: Kingdom | 王國本身是可閱讀的建築群；建築作為主要功能載體，UI 只負責資源、模式切換與少量任務提示。 | 我們應讓背景裡的工坊、市集、副本門本身成為入口，避免在其上再放一張完整按鈕牌。 |
| Guardian Tales Heavenhold | 官方描述把大廳視為可持續探索的動態空間，同時將核心按鈕保持明顯、低頻操作收進功能書或選單。 | 王都頁只留下「遠征」這個主動作與少量紅點；裝備、商店、日誌、副本等次級功能應透過建築熱區與極簡提示進入。 |
| 常見基地／王國型大廳 | 情境導向遊戲多使用「可點建築 + 近距離提示」；地圖語言在建築附近用小徽章、短標記或浮泡表達狀態，而不是每棟建築都使用完整卡片。 | 把目前五個入口收斂成無背景的短文字浮泡／小職能徽章，僅在有獎勵時再加紅點或小型布條。 |
| 環境敘事導航 | 遊戲導航可由 HUD 或環境地標承擔；長駐 HUD 有效率但會降低沉浸，地標、道路與建築特徵則能協助玩家在場景中定位。 | 保留中央城堡 CTA 與頂部資源 HUD；其餘入口以可見建築、路徑與門口短提示為主，避免每一處都成為完整按鈕。 |

## 建議的重設方向

採取「**建築熱區優先、提示按需顯示**」：移除目前所有完整木牌／布旗外框，只保留與建築位置對應的 44–52px 透明點擊熱區；正常狀態不長駐入口名稱，玩家觸碰或停留時才出現一枚小型職能浮泡。只有可領獎勵、免費刷新或可升級時，才在該建築屋頂／門口加紅點或極短的狀態旗標。

中央城堡仍保留唯一醒目的「組隊遠征」主 CTA，因為它是首頁主要行動。其餘入口不再與主 CTA 競爭視覺權重，讓王都地圖恢復可觀賞性與探索感。

## 來源

1. Polygon，Cookie Run: Kingdom beginner’s guide，2021-10-05，https://www.polygon.com/guides/22698450/cookie-run-kingdom-beginner-tips-tricks-server-toppings-treasure-soulstones-kingdom-arena/
2. Guardian Tales，2024 FEST RECAP: SEASON 3 TUNING UP，2024-03-27，https://www.guardiantales.com/news/4328
3. Game Developer，Navigating the maze using Environmental Narratives，2015-05-11，https://www.gamedeveloper.com/design/navigating-the-maze-using-environmental-narratives
