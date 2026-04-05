## MODIFIED Requirements

### Requirement: 跑步步幅計算
系統 SHALL 以 GPS 速度除以步頻計算步幅（m/步）。若 GPS 速度不可用且使用者已設定身高（> 0），系統 SHALL 以 `身高（cm）× 0.0045` 作為步幅估算值（m）。GPS 速度不可用且身高未設定時，步幅 SHALL 回傳 `null`。

#### Scenario: GPS 可用時計算步幅
- **WHEN** 活動型態為跑步、步頻大於 0 且 GPS 速度可用
- **THEN** 步幅 = GPS 速度（m/s）/ (步頻 / 60)

#### Scenario: GPS 不可用且身高已設定
- **WHEN** GPS 信號遺失且身高設定為 175 cm
- **THEN** 步幅估算值 = 175 × 0.0045 = 0.79 m（靜態近似）

#### Scenario: GPS 不可用且身高未設定
- **WHEN** GPS 信號遺失且身高為 0（未設定）
- **THEN** 步幅回傳 `null`，UI 顯示 `---`

## ADDED Requirements

### Requirement: 游泳划距效率計算
當臂展已設定（> 0）時，系統 SHALL 計算游泳划距效率：`(划距（m）/ 臂展（m）) × 100`，單位 %。臂展未設定時，效率欄位 SHALL 回傳 `null` 且不顯示。

#### Scenario: 臂展已設定且有划距數據
- **WHEN** 臂展設定為 178 cm，當前划距為 1.60 m
- **THEN** 划距效率 = (1.60 / 1.78) × 100 ≈ 89.9%

#### Scenario: 臂展未設定
- **WHEN** 臂展為 0（未設定）
- **THEN** 效率回傳 `null`，METRICS 模式不顯示效率欄位

### Requirement: 心率區間顯示
METRICS 模式 SHALL 在出生年已設定（> 0）時，顯示當前心率所在區間（Zone 1–5），以最大心率（220 − 年齡）為基準，各區間百分比：Z1 < 60%、Z2 60–70%、Z3 70–80%、Z4 80–90%、Z5 ≥ 90%。出生年未設定或心率無讀數時，區間 SHALL 不顯示。

#### Scenario: 心率落在 Zone 3
- **WHEN** 最大心率 184 bpm，當前心率 138 bpm（138/184 = 75%）
- **THEN** 顯示 Zone 3

#### Scenario: 出生年未設定
- **WHEN** 出生年為 0
- **THEN** HR Zone 欄位不顯示，其他指標正常渲染
