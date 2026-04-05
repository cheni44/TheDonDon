## Why

Garmin 設備擁有豐富的感測器（加速度計、陀螺儀、心率），但 Connect IQ 生態系缺乏能夠同時記錄原始感測器資料並即時轉換為活動指標的開放工具。開發此 app 讓運動科學研究者與進階用戶能在設備端完整掌握感測器數據，無需依賴雲端後處理。

## What Changes

- 新增 Garmin Connect IQ 設備端 app（Data Field 或 Activity app 類型）
- 實作雙顯示模式切換：原始感測器資料 / 活動指標資料
- 實作跑步與游泳兩種活動的指標計算邏輯
- 實作感測器取樣與記錄模組（加速度計、陀螺儀、心率）
- 提供設定頁面：活動型態選擇、感測器取樣率設定

## Capabilities

### New Capabilities

- `sensor-recording`: 以可設定取樣率持續讀取並儲存加速度計、陀螺儀、心率感測器原始數據
- `display-engine`: 雙模式表面渲染——原始數據模式與活動指標模式，支援手勢切換
- `activity-metrics`: 依活動型態（跑步 / 游泳）將感測器原始資料轉換為步頻、步幅、上下幅度、左右幅度 / 划頻、划距等指標
- `app-settings`: 使用者可設定活動型態（跑步 / 游泳）與各感測器取樣率

### Modified Capabilities

## Impact

- 目標平台：Garmin Connect IQ SDK（Monkey C 語言），需設備支援 `Sensor` API（加速度計、陀螺儀）
- 新增依賴：Connect IQ SDK `Toybox.Sensor`、`Toybox.Activity`、`Toybox.WatchUi`、`Toybox.Application`
- 不影響任何現有程式碼（全新 app）
- 需要 Garmin 設備模擬器或支援的實體裝置進行測試
