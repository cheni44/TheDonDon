## 1. 設定 Schema 擴充

- [x] 1.1 在 `garmin-app/properties.xml` 新增六個欄位：`Height`（number, 0）、`Weight`（number, 0）、`BirthYear`（number, 0）、`BirthMonth`（number, 0）、`BirthDay`（number, 0）、`ArmSpan`（number, 0）

## 2. UserProfile 模組

- [x] 2.1 建立 `garmin-app/source/UserProfile.mc`，封裝六個 `Application.Properties` 欄位的讀取，提供 `getHeight()`、`getWeight()`、`getBirthYear()`、`getBirthMonth()`、`getBirthDay()`、`getArmSpan()` 方法
- [x] 2.2 實作範圍驗證：身高 100–250 cm、體重 20–300 kg、臂展 100–250 cm，超出範圍回傳 0；出生年驗證 1900–2026，超出回傳 0
- [x] 2.3 實作 `getAge()` 方法：回傳 `當前年份 − BirthYear`，BirthYear 為 0 時回傳 null
- [x] 2.4 實作 `getMaxHr()` 方法：回傳 `220 − age`，age 為 null 時回傳 null

## 3. 指標計算更新

- [x] 3.1 更新 `MetricsCalculator.calculateStrideLength()`：增加 `heightCm` 參數，GPS 不可用且 `heightCm > 0` 時回傳 `heightCm × 0.0045`
- [x] 3.2 在 `MetricsCalculator` 新增 `calculateStrokeEfficiency(strokeDistanceM, armSpanCm)`：armSpanCm > 0 時回傳 `(strokeDistanceM / (armSpanCm / 100.0)) × 100`，否則回傳 null
- [x] 3.3 在 `MetricsCalculator` 新增 `calculateHrZone(currentHr, maxHr)`：maxHr > 0 時依百分比回傳 1–5，否則回傳 null（Z1 < 60%、Z2 60–70%、Z3 70–80%、Z4 80–90%、Z5 ≥ 90%）

## 4. 顯示引擎更新

- [x] 4.1 更新 `AppView.initialize()`：增加 `userProfile as UserProfile` 參數，儲存為 `_userProfile`
- [x] 4.2 更新 `_drawRunningMetrics()`：將 `UserProfile.getHeight()` 傳入 `calculateStrideLength()` 作為 fallback
- [x] 4.3 更新 `_drawSwimmingMetrics()`：計算并顯示划距效率（`calculateStrokeEfficiency`），臂展未設定時略過該欄位
- [x] 4.4 在 METRICS 模式底部新增 HR Zone 列：顯示 `Z1`–`Z5` 標籤與當前心率百分比，出生年未設定時不渲染此列

## 5. 主流程串接

- [x] 5.1 更新 `SpatioInsightApp.onStart()`：建立 `UserProfile` 實例並傳入 `AppView`
- [x] 5.2 在 `garmin-app/resources/strings/strings.xml` 新增字串：`LabelHrZone`、`LabelStrokeEff`（`STR EFF`）、`UnitPercent`（`%`）

## 6. 模擬器驗證

- [ ] 6.1 驗證設定頁面出現六個新欄位，儲存後重啟數值保留
- [ ] 6.2 驗證跑步模式 GPS 關閉時，步幅以身高 × 0.0045 顯示（非 `---`）
- [ ] 6.3 驗證游泳模式臂展設定後顯示划距效率 %，臂展為 0 時不顯示
- [ ] 6.4 驗證 HR Zone 依出生年正確計算並顯示，出生年為 0 時不顯示
- [ ] 6.5 驗證各欄位輸入超出範圍時不崩潰，計算路徑回退正常
