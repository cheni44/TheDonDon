## ADDED Requirements

### Requirement: 雙模式顯示切換
表面 SHALL 支援兩種顯示模式：`RAW`（原始感測器數值）與 `METRICS`（活動指標）。使用者 SHALL 可透過設備實體按鈕（UP / DOWN）在兩種模式間切換。

#### Scenario: 切換至 RAW 模式
- **WHEN** 使用者按下 DOWN 按鈕且目前為 METRICS 模式
- **THEN** 表面切換為 RAW 模式，顯示加速度計、陀螺儀原始數值與心率

#### Scenario: 切換至 METRICS 模式
- **WHEN** 使用者按下 UP 按鈕且目前為 RAW 模式
- **THEN** 表面切換為 METRICS 模式，顯示當前活動型態對應的計算指標

### Requirement: RAW 模式顯示內容
RAW 模式 SHALL 顯示最新一筆感測器資料：
- 加速度計：X, Y, Z 軸數值（mg 單位）
- 陀螺儀：X, Y, Z 軸數值（deg/s）（若不支援則顯示 `N/A`）
- 心率：BPM（若無讀數顯示 `---`）
- 當前模式標籤：`RAW`

#### Scenario: 有完整感測器資料
- **WHEN** RAW 模式且三種感測器均有資料
- **THEN** 畫面顯示最新一筆加速度計 XYZ、陀螺儀 XYZ、心率數值

#### Scenario: 陀螺儀不可用
- **WHEN** RAW 模式且陀螺儀標記為不可用
- **THEN** 陀螺儀欄位顯示 `N/A`，其他欄位正常顯示

### Requirement: METRICS 模式顯示內容
METRICS 模式 SHALL 依活動型態顯示對應指標，跑步顯示：步頻（spm）、步幅（m）、上下幅度（mm）、左右幅度（mm）；游泳顯示：划頻（spm）、划距（m）、上下幅度（mm）、左右幅度（mm）。指標計算中或數據不足時顯示 `---`。

#### Scenario: 跑步模式有足夠資料
- **WHEN** METRICS 模式、活動型態為跑步、已累積足夠感測器資料（≥2 秒）
- **THEN** 顯示步頻、步幅、上下幅度、左右幅度的計算結果

#### Scenario: 游泳模式有足夠資料
- **WHEN** METRICS 模式、活動型態為游泳、已累積足夠感測器資料（≥2 秒）
- **THEN** 顯示划頻、划距、上下幅度、左右幅度的計算結果

#### Scenario: 資料不足以計算
- **WHEN** METRICS 模式但感測器資料累積不足 2 秒
- **THEN** 所有指標欄位顯示 `---`

### Requirement: 畫面更新頻率
表面 SHALL 每秒重繪至少一次（`onUpdate` 回呼），確保數值即時性。

#### Scenario: 正常運作中更新
- **WHEN** 活動進行中
- **THEN** 畫面每秒至少刷新一次，顯示最新數值
