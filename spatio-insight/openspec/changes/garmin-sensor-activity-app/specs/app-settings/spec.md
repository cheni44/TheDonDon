## ADDED Requirements

### Requirement: 活動型態設定
使用者 SHALL 可在設定頁面選擇活動型態：`跑步（Running）` 或 `游泳（Swimming）`。預設值 SHALL 為 `跑步`。此設定 SHALL 持久化至設備儲存，重啟後保留。

#### Scenario: 選擇游泳模式
- **WHEN** 使用者在設定頁面將活動型態改為游泳
- **THEN** App 重新啟動後，METRICS 模式顯示游泳指標，感測器計算邏輯切換為游泳模式

#### Scenario: 設定持久化
- **WHEN** 使用者儲存設定後重啟 App
- **THEN** 活動型態設定保持上次選擇的值

### Requirement: 感測器取樣率設定
使用者 SHALL 可設定加速度計與陀螺儀的取樣率，可選值為 25Hz、50Hz、100Hz。預設值 SHALL 為 25Hz。心率取樣率固定（由設備決定），不開放設定。

#### Scenario: 設定高取樣率
- **WHEN** 使用者將取樣率設定為 100Hz
- **THEN** 加速度計與陀螺儀以 100Hz 取樣，Ring Buffer 消耗速度對應增加

#### Scenario: 低取樣率保護
- **WHEN** 取樣率設定低於 25Hz（非法值）
- **THEN** 系統自動修正為 25Hz

### Requirement: 游泳泳池長度設定
當活動型態為游泳時，使用者 SHALL 可設定泳池長度（25m 或 50m）。預設值 SHALL 為 25m。此設定僅在室內游泳（無 GPS）時影響划距計算。

#### Scenario: 設定 50m 泳池
- **WHEN** 使用者設定泳池長度為 50m
- **THEN** 划距計算使用 50m 作為每趟基準長度

#### Scenario: 戶外游泳時泳池長度不影響結果
- **WHEN** GPS 可用（戶外游泳）
- **THEN** 划距計算使用 GPS 距離，泳池長度設定被忽略

### Requirement: 設定頁面存取
使用者 SHALL 可透過 Garmin Connect Mobile app 或設備設定選單存取並修改所有設定項目。

#### Scenario: 透過 Garmin Connect Mobile 修改設定
- **WHEN** 使用者在 Garmin Connect Mobile 修改 App 設定並同步
- **THEN** 設備端 App 下次啟動時套用新設定
