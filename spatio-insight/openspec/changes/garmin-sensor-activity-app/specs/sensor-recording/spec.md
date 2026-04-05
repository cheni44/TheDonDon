## ADDED Requirements

### Requirement: 感測器初始化
App 啟動時 SHALL 依照使用者設定的取樣率初始化加速度計、陀螺儀與心率感測器。若某感測器不被設備支援，SHALL 跳過該感測器並在 UI 標記為不可用。

#### Scenario: 成功初始化所有感測器
- **WHEN** App 啟動且設備支援加速度計、陀螺儀與心率
- **THEN** 三種感測器均以設定取樣率開始回報資料

#### Scenario: 設備不支援陀螺儀
- **WHEN** App 啟動且設備無陀螺儀
- **THEN** 加速度計與心率正常初始化，陀螺儀標記為 `N/A`，不拋出錯誤

### Requirement: 持續感測器取樣
活動進行中，系統 SHALL 以設定的取樣率（25Hz、50Hz、100Hz 之一）持續讀取感測器原始資料（加速度計 XYZ、陀螺儀 XYZ、心率 BPM）。

#### Scenario: 正常取樣
- **WHEN** 活動已開始且感測器已初始化
- **THEN** 每個取樣間隔收到一筆包含時間戳記的感測器資料

#### Scenario: 取樣中斷後恢復
- **WHEN** 感測器暫時回報空值後恢復正常
- **THEN** 系統繼續記錄，不丟棄 Buffer 中已有的資料

### Requirement: Ring Buffer 管理
系統 SHALL 以固定大小 Ring Buffer（每種感測器 200 筆）暫存感測器資料於記憶體中。Buffer 滿時，最舊資料 SHALL 被覆寫。

#### Scenario: Buffer 未滿
- **WHEN** 累積筆數小於 200
- **THEN** 新資料依序寫入 Buffer，不覆寫任何資料

#### Scenario: Buffer 已滿
- **WHEN** 第 201 筆資料到達
- **THEN** 最舊一筆資料被覆寫，Buffer 維持 200 筆

### Requirement: FIT 自訂記錄
活動結束時，系統 SHALL 將 Buffer 中所有感測器資料寫入 FIT 檔案，使用 **FIT developer data fields**（非 manufacturer-specific message），以確保 GoldenCheetah 等第三方工具可解析。每筆 record message SHALL 包含：`timestamp`（FIT epoch）、`accel_x`（mg）、`accel_y`（mg）、`accel_z`（mg）、`gyro_x`（deg/s）、`gyro_y`（deg/s）、`gyro_z`（deg/s）。Developer field definition SHALL 包含 `field_name`、`units`、`native_mesg_num`、`native_field_num`。

#### Scenario: 活動正常結束
- **WHEN** 使用者停止活動
- **THEN** FIT 檔案包含符合 FIT developer data field 規範的感測器記錄，可被 GoldenCheetah 識別

#### Scenario: 陀螺儀不可用時的 FIT 記錄
- **WHEN** 設備不支援陀螺儀，活動結束
- **THEN** FIT 記錄中不包含 gyro 欄位定義，僅寫入 accel 與心率欄位

#### Scenario: 感測器資料為空
- **WHEN** 活動期間無任何感測器資料被收集
- **THEN** FIT 檔案仍可正常儲存，developer data 欄位為空
