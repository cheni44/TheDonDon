## ADDED Requirements

### Requirement: 個人資料設定欄位
使用者 SHALL 可透過 `properties.xml` 設定頁面輸入六個個人資料欄位：`Height`（cm）、`Weight`（kg）、`BirthYear`（4 位整數）、`BirthMonth`（1–12）、`BirthDay`（1–31）、`ArmSpan`（cm）。所有欄位 SHALL 預設為 0。

#### Scenario: 設定頁面包含個人資料欄位
- **WHEN** 使用者在 Garmin Connect Mobile 開啟 SpatioInsight 設定頁面
- **THEN** 頁面除原有活動型態、取樣率、泳池長度外，另顯示身高、體重、出生年、出生月、出生日、臂展輸入欄位

#### Scenario: 個人資料欄位持久化
- **WHEN** 使用者儲存個人資料設定並重啟 App
- **THEN** `AppSettings` 讀取到的個人資料值與儲存時相同
