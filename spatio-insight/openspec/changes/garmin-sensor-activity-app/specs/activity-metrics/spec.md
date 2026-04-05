## ADDED Requirements

### Requirement: 跑步步頻計算
系統 SHALL 透過加速度計垂直軸（Z 軸）峰值偵測計算步頻，單位為每分鐘步數（spm）。計算視窗 SHALL 為最近 2 秒的感測器資料。

#### Scenario: 正常跑步步頻計算
- **WHEN** 活動型態為跑步，且 Buffer 中有至少 2 秒加速度計資料
- **THEN** 計算 Z 軸峰值間隔，換算為每分鐘步數並回傳

#### Scenario: 資料不足
- **WHEN** Buffer 中加速度計資料不足 2 秒
- **THEN** 步頻回傳 `null`，UI 顯示 `---`

### Requirement: 跑步步幅計算
系統 SHALL 以 GPS 速度除以步頻計算步幅（m/步）。若 GPS 速度不可用，步幅 SHALL 回傳 `null`。

#### Scenario: GPS 可用時計算步幅
- **WHEN** 活動型態為跑步、步頻大於 0 且 GPS 速度可用
- **THEN** 步幅 = GPS 速度（m/s）/ (步頻 / 60)

#### Scenario: GPS 不可用
- **WHEN** GPS 信號遺失或速度為 0
- **THEN** 步幅回傳 `null`，UI 顯示 `---`

### Requirement: 上下幅度計算（跑步與游泳共用）
系統 SHALL 以加速度計 Z 軸（垂直方向）最近 2 秒的峰谷差值平均作為上下幅度，單位 mm。

#### Scenario: 正常計算上下幅度
- **WHEN** Buffer 中有至少 2 秒加速度計 Z 軸資料
- **THEN** 計算峰谷差值並回傳平均上下幅度（mm）

### Requirement: 左右幅度計算（跑步與游泳共用）
系統 SHALL 以加速度計 X 軸（側向方向）最近 2 秒的峰谷差值平均作為左右幅度，單位 mm。

#### Scenario: 正常計算左右幅度
- **WHEN** Buffer 中有至少 2 秒加速度計 X 軸資料
- **THEN** 計算峰谷差值並回傳平均左右幅度（mm）

### Requirement: 游泳划頻計算
系統 SHALL 透過加速度計複合向量（XYZ 合成）峰值偵測計算划頻，單位為每分鐘划次（spm）。

#### Scenario: 正常游泳划頻計算
- **WHEN** 活動型態為游泳，且 Buffer 中有至少 2 秒加速度計資料
- **THEN** 計算合成向量峰值間隔，換算為每分鐘划次並回傳

### Requirement: 游泳划距計算
系統 SHALL 以總距離除以划次計算划距（m/划）。室內游泳模式下，距離由泳池長度乘以回轉次數計算；有 GPS 時使用 GPS 距離。

#### Scenario: 室內游泳（無 GPS）
- **WHEN** 活動型態為游泳、無 GPS 且已設定泳池長度
- **THEN** 划距 = (泳池長度 × 已完成趟數) / 累積划次

#### Scenario: 戶外游泳（有 GPS）
- **WHEN** 活動型態為游泳且 GPS 可用
- **THEN** 划距 = GPS 累積距離 / 累積划次

#### Scenario: 划次為零
- **WHEN** 划次為 0 或無法計算
- **THEN** 划距回傳 `null`，UI 顯示 `---`
