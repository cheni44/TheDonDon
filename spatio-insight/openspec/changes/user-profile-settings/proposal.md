## Why

目前的指標計算（步幅、划距、振幅等）完全依賴感測器訊號推導，缺乏使用者身體參數作為基準，導致跨用戶的計算精度參差不齊。加入身高、體重、出生年月日、臂展等個人資料後，可顯著提升步幅估算（無 GPS 時）、游泳效率指標、心率區間判斷等的準確性。

## What Changes

- 新增使用者個人資料設定：身高（cm）、體重（kg）、出生年月日、臂展（cm）
- 更新 `properties.xml` 加入對應設定欄位
- 更新 `AppSettings.mc` 提供 profile 讀取方法
- 更新 `MetricsCalculator` 在計算步幅（無 GPS）及游泳划距時納入身高 / 臂展
- 新增年齡推算與最大心率（220 − 年齡）計算，供 HR 區間顯示使用

## Capabilities

### New Capabilities

- `user-profile`: 儲存並驗證使用者身體測量資料（身高、體重、出生年月日、臂展），提供年齡與最大心率推算

### Modified Capabilities

- `app-settings`: 新增個人資料設定欄位（身高、體重、出生年月日、臂展）至設定頁面
- `activity-metrics`: 步幅估算（無 GPS 時）改用身高回推；游泳划距效率以臂展作為標準化基準；最大心率由年齡計算

## Impact

- 修改 `garmin-app/properties.xml`：加入 Height、Weight、BirthYear、BirthMonth、BirthDay、ArmSpan 欄位
- 修改 `garmin-app/source/AppSettings.mc`：加入 `getUserProfile()` 方法
- 修改 `garmin-app/source/MetricsCalculator.mc`：`calculateStrideLength` 增加 height fallback；新增 `calculateStrokeEfficiency`
- 修改 `garmin-app/source/AppView.mc`：METRICS 模式可顯示 HR 區間（需年齡）
- 無 breaking change，所有新欄位均有合理預設值
