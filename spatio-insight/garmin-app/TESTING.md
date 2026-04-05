# Integration Testing Checklist

Run these tests in the Connect IQ Simulator (or on a physical device).

## Build

```bash
cd garmin-app
monkeyc -d fr955 -f monkey.jungle -o bin/SpatioInsight.prg -y developer_key.der
```

Launch simulator:
```bash
connectiq
# then: File > Run > select SpatioInsight.prg on fr955
```

---

## 6.1 RAW mode — sensor values update

- Start app → confirm mode label shows **RAW**
- In simulator Sensor panel, inject accel values (e.g. X=100, Y=50, Z=980)
- **Expected**: displayed values update within 1 second

## 6.2 Running mode — cadence/stride plausibility

- Set ActivityType = Running in simulator settings
- Switch to METRICS mode (UP button)
- In Sensor panel inject Z-axis accel oscillation at ~3 Hz (180 spm)
- Set GPS speed = 3.0 m/s
- **Expected**: Cadence ~180 spm, Stride ~1.0 m

## 6.3 Swimming mode — stroke/distance plausibility

- Set ActivityType = Swimming, PoolLength = 25
- Switch to METRICS mode
- Inject composite accel oscillation at ~1.2 Hz (72 spm)
- **Expected**: Stroke Rate ~72 spm, Stroke Distance appears after ≥1 lap

## 6.4 Button toggle

- Press DOWN → mode switches RAW ↔ METRICS
- Press UP → same behaviour
- **Expected**: mode label changes on screen within 1 frame

## 6.5 Settings propagation

- In simulator: change ActivityType to Swimming → restart app
- **Expected**: METRICS shows STR RATE / STR DIST labels instead of CADENCE / STRIDE

## 6.6 Gyro unavailable

- In simulator: disable gyroscope sensor (or test on fr955 which lacks gyro)
- **Expected**: RAW mode shows "GYRO N/A" row, app does not crash

## 6.7 FIT file — developer data fields

- Complete a short activity and save
- Export FIT file from simulator
- Open in GoldenCheetah or use `fitdump` CLI:
  ```
  fitdump SpatioInsight.fit | grep -E "accel_|gyro_"
  ```
- **Expected**: Records contain `accel_x`, `accel_y`, `accel_z` fields with mg units;
  `gyro_*` fields present only when gyro was available

---

## 7.1 User profile settings persist

- In simulator app settings, set:
  - Height = 175
  - Weight = 70
  - BirthYear = 1990
  - BirthMonth = 6
  - BirthDay = 15
  - ArmSpan = 178
- Restart app
- **Expected**: values remain set after restart

## 7.2 Running stride fallback without GPS

- Set ActivityType = Running
- Set Height = 175
- In simulator, ensure GPS speed is unavailable (or 0)
- Switch to METRICS mode
- Feed accel data so cadence is detectable (e.g. periodic Z oscillation)
- **Expected**: STRIDE is shown (not `---`) using height fallback, near `0.79 m` (`175 * 0.0045`)

## 7.3 Swimming stroke efficiency from arm span

- Set ActivityType = Swimming
- Set ArmSpan = 178
- Switch to METRICS mode
- Feed swim-like accel and distance so stroke distance is computed
- **Expected**: `STR EFF` row appears with `%` value
- Set ArmSpan = 0 and restart
- **Expected**: `STR EFF` row is not shown

## 7.4 HR zone rendering rule

- Set BirthYear = 1990 and restart
- Feed HR data (for example 150 bpm)
- Switch to METRICS mode
- **Expected**: bottom row appears as `HR ZONE Zx (yy%)`
- Set BirthYear = 0 and restart
- **Expected**: HR zone row is not rendered

## 7.5 Out-of-range profile values fallback

- Set invalid values in settings:
  - Height = 999
  - Weight = 999
  - ArmSpan = 999
  - BirthYear = 1800
- Restart app
- **Expected**:
  - app does not crash
  - stride fallback is disabled when GPS unavailable (`STRIDE` may show `---`)
  - stroke efficiency is hidden when ArmSpan invalid
  - HR zone row is hidden when BirthYear invalid
