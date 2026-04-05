## Context

Garmin Connect IQ 使用 Monkey C 語言開發，設備端資源（記憶體、CPU）受嚴格限制。感測器 API（`Toybox.Sensor`）提供加速度計（`accel`）、陀螺儀（`gyro`）、心率（`heartRate`）資料，取樣率可透過 `SensorOptions` 設定。UI 由 `WatchUi.DataField` 或 `Activity` app 類型負責渲染，每次 `onUpdate()` 回呼重繪表面。設定頁面透過 `Application.Properties` 持久化。

目標設備：支援 Connect IQ **4.x+**（最新 SDK）且有加速度計 / 陀螺儀的中高階 Garmin 設備（如 Forerunner 955、Fenix 7 系列）。不支援 Connect IQ 2.x / 3.x，可使用最新 API（如 `SensorHistory`）。

## Goals / Non-Goals

**Goals:**
- 以可設定取樣率同時讀取加速度計、陀螺儀、心率
- 將原始感測器數值即時轉換為跑步 / 游泳活動指標
- 雙模式表面顯示，支援按鈕切換
- 設定頁面持久化活動型態與取樣率選項
- 活動結束後可將感測器資料記錄至 FIT 檔案（自訂 FIT message）

**Non-Goals:**
- 雲端同步或 Bluetooth 串流原始資料
- 三種以上活動型態（僅跑步 / 游泳）
- 離線機器學習推論
- 與 Garmin Connect Mobile 的客製化儀表板整合

## Decisions

### D1：App 類型選擇 Activity app 而非 Data Field

**選擇**：`Activity` app  
**理由**：Data Field 僅能存取已有活動時才可讀感測器；Activity app 可完整控制感測器生命週期、自訂 FIT 記錄、以及獨立的設定頁面。  
**替代方案**：Data Field — 較受限，無法自訂 FIT message，排除。

### D2：感測器資料以 Ring Buffer 暫存於記憶體

**選擇**：固定大小 Ring Buffer（每種感測器各自維護，預設 200 筆）  
**理由**：設備端記憶體有限（約 128–256 KB heap），Ring Buffer 避免無限增長；顯示僅需最近一筆，計算指標只需最近 N 筆（步幅計算約需 2 秒資料）。  
**替代方案**：直接寫入 FIT — 無法用於即時顯示計算，排除。

### D3：指標計算使用滑動視窗 + 峰值偵測

**跑步指標計算方式：**
- 步頻（cadence）：加速度計垂直軸峰值偵測，統計每分鐘週期數
- 步幅（stride length）：速度（GPS）/ 步頻
- 上下幅度（vertical oscillation）：加速度計 Z 軸峰谷差值，單位 mm
- 左右幅度（lateral oscillation）：加速度計 X 軸峰谷差值，單位 mm

**游泳指標計算方式：**
- 划頻（stroke rate）：加速度計複合峰值偵測，統計每分鐘周期數
- 划距（stroke distance）：距離 / 划數（需 GPS 或池長設定）
- 上下 / 左右幅度：同跑步軸向計算

### D4：顯示切換透過 UP/DOWN 按鈕實作

**選擇**：監聽 `KEY_UP` / `KEY_DOWN` 切換 `displayMode` 狀態變數（`RAW` / `METRICS`）  
**理由**：Garmin 設備普遍有實體按鈕，不依賴觸控（部分設備無觸控螢幕）。

### D5：設定透過 `Application.Properties` + Connect IQ Settings XML 管理

**選擇**：`properties.xml` 定義設定 schema，`Application.Properties` 讀寫  
**理由**：原生 Connect IQ 設定機制，可透過 Garmin Connect Mobile 同步修改，無需自製 UI。

### D6：游泳池長度以設定方式輸入

**選擇**：泳池長度納入 `properties.xml` 設定（25m / 50m 選項），不自動偵測回轉  
**理由**：回轉偵測需要額外加速度計特徵工程，易誤觸；設定方式簡單可靠，用戶明確知道泳池長度。  
**替代方案**：自動偵測 flip turn — 複雜度高、準確率不穩定，排除。

### D7：FIT 自訂 fields 格式相容 GoldenCheetah

**選擇**：使用 FIT protocol 的 **developer data fields**（而非 manufacturer-specific message），欄位名稱與 unit 遵循 FIT SDK 標準命名  
**理由**：GoldenCheetah 可解析標準 developer data fields；proprietary message 需要額外 profile 支援。  
**實作細節：**
- Developer field definition 須包含：`field_name`（ASCII）、`units`（ASCII）、`native_mesg_num`、`native_field_num`
- 感測器欄位命名：`accel_x`（mg）、`accel_y`（mg）、`accel_z`（mg）、`gyro_x`（deg/s）、`gyro_y`（deg/s）、`gyro_z`（deg/s）
- 每筆記錄附帶 `timestamp`（FIT epoch）
- Record message 頻率與取樣率一致（不降頻）

## Risks / Trade-offs

- **[記憶體超限]** → 高取樣率 + 長時間活動可能耗盡 heap。緩解：Ring Buffer 上限固定，提供設定讓用戶降低取樣率。
- **[GPS 不可用時步幅 / 划距計算失準]** → 游泳室內池無 GPS。緩解：游泳模式改用使用者設定的泳池長度計算划距；跑步模式若無 GPS 則顯示 `---`。
- **[峰值偵測對低取樣率不準確]** → 取樣率低於 25Hz 時步頻誤差大。緩解：設定頁面最低取樣率限制為 25Hz；說明文件說明建議值。
- **[設備相容性]** → 部分舊設備不支援陀螺儀。緩解：啟動時偵測感測器可用性，不支援的感測器欄位顯示 `N/A`。

## Migration Plan

此為全新 app，無現有資料遷移需求。部署流程：
1. 使用 Connect IQ SDK 編譯 `.prg` 檔
2. 透過 Garmin Express 或 Connect IQ Store sideload 至設備
3. 設備模擬器完成功能測試後再推至實體裝置

## Open Questions

~~- 是否需要支援 Connect IQ 2.x（較舊設備）？~~ → **已決定：不支援，目標 Connect IQ 4.x+**  
~~- 游泳池長度是否以設定方式輸入，還是偵測回轉自動計算？~~ → **已決定：設定輸入（25m / 50m）**  
~~- FIT 自訂 message 格式是否需要相容 GoldenCheetah？~~ → **已決定：使用 developer data fields，相容 GoldenCheetah（見 D7）**
