## 1. 專案腳手架與 SDK 設定

- [x] 1.1 使用 Connect IQ SDK CLI (`connectiq`) 建立新 Activity app 專案，設定目標設備清單（Forerunner 945、Fenix 6）
- [x] 1.2 建立 `manifest.xml`，宣告 `sensor` permission，設定最低 API level 為 4.0（Connect IQ 4.x+）
- [x] 1.3 建立 `properties.xml`，定義設定 schema：活動型態（Running/Swimming）、取樣率（25/50/100）、泳池長度（25/50）
- [x] 1.4 建立 `strings.xml` 與 `drawables/` 目錄，準備基本資源

## 2. 感測器記錄模組（sensor-recording）

- [x] 2.1 建立 `SensorManager.mc`，實作 `initialize(sampleRate)` 方法，呼叫 `Sensor.setEnabledSensors` 啟用加速度計、陀螺儀
- [x] 2.2 實作 `Sensor.SensorDataListener` 回呼，接收 `accel`、`gyro`、`heartRate` 資料並加上時間戳記
- [x] 2.3 建立 `RingBuffer.mc`，實作固定大小（200 筆）Ring Buffer，支援 push / getLast / getAll 操作
- [x] 2.4 在 `SensorManager` 中為加速度計、陀螺儀、心率各建立獨立 RingBuffer 實例
- [x] 2.5 實作設備感測器可用性偵測，陀螺儀不支援時設 `gyroAvailable = false`
- [x] 2.6 實作 FIT developer data field 定義：為 `accel_x/y/z`（mg）、`gyro_x/y/z`（deg/s）建立 developer field definition，包含 `field_name`、`units`、`native_mesg_num`、`native_field_num`
- [x] 2.7 實作 FIT record message 寫入：活動結束時將 Buffer 資料以 developer data fields 格式寫入，確保 GoldenCheetah 可解析
- [x] 2.8 驗證陀螺儀不可用時，FIT 寫入僅包含 accel 欄位且不崩潰

## 3. 活動指標計算模組（activity-metrics）

- [x] 3.1 建立 `MetricsCalculator.mc`，實作 `calculateCadence(buffer, axis)` 峰值偵測邏輯（Z 軸，2 秒視窗）
- [x] 3.2 實作 `calculateStrideLength(gpsSpeed, cadence)`，GPS 不可用時回傳 null
- [x] 3.3 實作 `calculateVerticalOscillation(buffer)` — Z 軸峰谷差值平均（mm）
- [x] 3.4 實作 `calculateLateralOscillation(buffer)` — X 軸峰谷差值平均（mm）
- [x] 3.5 實作 `calculateStrokeRate(buffer)` — 合成向量峰值偵測（游泳）
- [x] 3.6 實作 `calculateStrokeDistance(totalDistance, strokeCount, poolLength, gpsAvailable)`，含室內 / 戶外邏輯
- [x] 3.7 建立 `RunningMetrics.mc` 與 `SwimmingMetrics.mc` 包裝對應計算方法，統一回傳格式

## 4. 顯示引擎（display-engine）

- [x] 4.1 建立 `AppView.mc` 繼承 `WatchUi.View`，實作 `onUpdate(dc)` 繪製主畫面
- [x] 4.2 實作 `displayMode` 狀態管理（`MODE_RAW` / `MODE_METRICS`），初始值為 `MODE_RAW`
- [x] 4.3 實作 RAW 模式佈局：分區顯示加速度計 XYZ（mg）、陀螺儀 XYZ（deg/s）、心率（BPM）、模式標籤
- [x] 4.4 實作 METRICS 模式佈局：依活動型態顯示 4 個指標欄位，資料不足時顯示 `---`
- [x] 4.5 建立 `AppDelegate.mc` 繼承 `WatchUi.BehaviorDelegate`，監聽 `KEY_UP` / `KEY_DOWN` 切換 `displayMode`
- [x] 4.6 確認 `onUpdate` 每秒觸發更新（透過 `timer` 或 activity update 回呼）

## 5. 設定與 App 主流程（app-settings）

- [x] 5.1 建立 `AppSettings.mc`，封裝 `Application.Properties` 讀寫，提供 `getActivityType()`、`getSampleRate()`、`getPoolLength()` 方法
- [x] 5.2 實作取樣率合法性檢查：低於 25Hz 時自動修正為 25Hz
- [x] 5.3 建立 `SpatioInsightApp.mc` 繼承 `Application.AppBase`，在 `onStart()` 讀取設定、初始化 `SensorManager` 與 `MetricsCalculator`
- [x] 5.4 在 `onStop()` 實作感測器停止與 FIT 資料寫入

## 6. 整合測試與模擬器驗證

- [ ] 6.1 在 Connect IQ 模擬器中驗證 RAW 模式顯示加速度計、陀螺儀、心率數值正確更新
- [ ] 6.2 模擬跑步場景，驗證步頻、步幅、振幅計算結果合理（步頻 150–200 spm）
- [ ] 6.3 模擬游泳場景，驗證划頻、划距計算結果合理
- [ ] 6.4 驗證按鈕切換模式功能正常
- [ ] 6.5 驗證設定頁面：切換活動型態後 METRICS 模式顯示對應指標
- [ ] 6.6 驗證陀螺儀不可用情境：陀螺儀欄位顯示 `N/A`，App 不崩潰
- [ ] 6.7 驗證活動結束後 FIT 檔案包含自訂感測器欄位
<!-- Tasks 6.1–6.7 require Connect IQ Simulator. See garmin-app/TESTING.md for steps. -->
