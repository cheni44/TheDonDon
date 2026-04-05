## Context

現有的 `AppSettings.mc` 透過 `Application.Properties` 讀取設定，已涵蓋活動型態、取樣率、泳池長度。`MetricsCalculator.mc` 的步幅計算在 GPS 不可用時回傳 `null`，游泳划距效率也無法標準化。加入身體測量資料可填補這兩個計算缺口，並開啟心率區間（HR zone）顯示。

Garmin Connect IQ `Application.Properties` 不支援 Date 型別，出生年月日需拆成三個獨立的 Number 欄位（BirthYear、BirthMonth、BirthDay）。臂展與身高的輸入單位均為整數 cm（設備端避免 float 字串輸入），體重為整數 kg。

## Goals / Non-Goals

**Goals:**
- 讓使用者可在設定頁面輸入身高、體重、出生年月日、臂展
- 無 GPS 時以身高推算跑步步幅（身高 × 係數）
- 以臂展標準化游泳每划效率（划距 / 臂展 × 100 = 效率 %）
- 從出生年推算年齡與最大心率（220 − 年齡），用於 METRICS 模式的 HR 區間顯示
- 所有欄位有合理預設值，未設定時不影響現有計算路徑

**Non-Goals:**
- 自動從 Garmin 用戶帳號同步個人資料（需第三方 API，超出設備端範圍）
- 公制 / 英制單位切換（統一使用公制）
- 身體組成（體脂率等）計算

## Decisions

### D1：出生年月日拆為三個 Number 欄位

**選擇**：`BirthYear`（4 位整數）、`BirthMonth`（1–12）、`BirthDay`（1–31）  
**理由**：Connect IQ `properties.xml` 僅支援 number、float、boolean、string、longNumber；無 Date 型別。三欄分開最易在設定 UI 中呈現為下拉選單。  
**替代方案**：用 string（"YYYY-MM-DD"）— 需額外解析，Connect IQ 字串操作成本較高，排除。

### D2：無 GPS 步幅使用身高比例係數

**公式**：`stride_length = height_cm × 0.0045`（單位 m）  
**理由**：運動生理學文獻顯示成年人跑步步幅約為身高的 40–50%，0.45 為合理中位值。此係數為靜態近似，精度遜於 GPS，但優於回傳 `null`。  
**替代方案**：依步頻動態調整係數 — 複雜度高，設備端計算成本增加，留待未來優化。

### D3：游泳划距效率以臂展標準化

**公式**：`stroke_efficiency = (stroke_distance_m / arm_span_m) × 100`（%）  
**理由**：臂展（wingspan）直接決定理論最大划程；效率百分比對用戶比原始划距更直觀。臂展未設定時（預設 0）略過效率計算，不顯示。  
**替代方案**：直接顯示划距 m — 已有，效率為額外資訊，並存顯示。

### D4：最大心率使用 220 − 年齡公式

**選擇**：`max_hr = 220 - age`，年齡 = 當年年份 − 出生年  
**理由**：最廣泛使用的估算公式，無需額外輸入。年齡從 BirthYear 推算（精確到年，不考慮月日以降低複雜度）。  
**替代方案**：Tanaka 公式（208 − 0.7 × age）— 研究顯示對中高齡更準，可設為未來可選項。

### D5：個人資料統一從 `UserProfile` 類別存取

**選擇**：新增 `UserProfile.mc`，作為 profile 資料的單一存取點，與 `AppSettings` 分開  
**理由**：`AppSettings` 負責 App 行為設定（活動型態、取樣率），`UserProfile` 負責人體測量資料，職責分離，日後各自演進不互相干擾。

## Risks / Trade-offs

- **[資料未填寫]** → 使用者未輸入身高 / 臂展時，對應計算路徑維持現有行為（步幅 null、效率不顯示）。預設值 0 作為「未設定」的旗標。
- **[年齡計算僅精確到年]** → 生日未到的情況下年齡差 1 歲，最大心率誤差 ±1 bpm，可接受。
- **[臂展輸入範圍錯誤]** → 使用者輸入極端值（如 999 cm）。緩解：`UserProfile` 加入合理範圍驗證（身高 100–250 cm、臂展 100–250 cm、體重 20–300 kg）。

## Migration Plan

無資料遷移需求。新增欄位有預設值 0，現有安裝的用戶在未修改設定前，計算行為與之前完全相同。

## Open Questions

（無）
