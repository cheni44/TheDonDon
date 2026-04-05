## Context

The current app has one detection path: visual frame differencing → stable tracker → circle overlay + buzz output. The buzz output plays through the speaker when a mosquito is visually detected. This change replaces that single-path model with a dual-trigger model:

1. **Visual trigger** — stable blob ≥ 2 s (raised from 1 s)
2. **Audio trigger** — microphone FFT energy in 200–800 Hz band sustained ≥ 1 s

The buzz output is removed entirely. The detection state drives only the overlay and proximity UI.

The app currently holds `audioAlert = { ctx, proximityGain }` for the output buzz. This will become `micDetector = { stream, analyser, ... }` for the microphone input.

## Goals / Non-Goals

**Goals:**
- Two independent detection signals; either alone confirms detection
- Microphone capture via `getUserMedia({ audio: true })`
- FFT-based band energy analysis (200–800 Hz) using `AnalyserNode`
- 1 s onset / 0.5 s release hysteresis on the audio trigger
- Remove all output audio code (carrier oscillator, LFO, master gain)
- Raise visual `STABLE_MS` to 2 000 ms

**Non-Goals:**
- Machine-learning mosquito audio classifier
- Recording or storing microphone audio
- User-tunable frequency band
- Visual waveform display

## Decisions

### Decision 1 — FFT band energy for audio detection

Use `AnalyserNode.getByteFrequencyData()` on each animation frame. Sum the FFT bins corresponding to 200–800 Hz and compare against a configurable `MIC_ENERGY_THRESHOLD`. This is O(FFT_SIZE / 2) ≈ O(512) per frame — negligible.

Bin index for frequency f: `binIndex = Math.round(f / (sampleRate / fftSize))`.

`MIC_ENERGY_THRESHOLD = 60` (0–255 scale per bin average) — tunable constant.

**Alternative considered:** Autocorrelation pitch detection — too complex, fragile with background noise, unnecessary since we only need a band energy gate, not exact pitch.

### Decision 2 — Separate micDetector lifecycle from camera

The mic stream is started when the user clicks Start (alongside the camera), and stopped when they click Stop or Flip. It is independent of the camera track. Flip camera does NOT restart the mic (mic has no facingMode).

`micDetector` state: `{ stream: MediaStream, analyser: AnalyserNode, freqData: Uint8Array, active: boolean }`

`active` is set to `true` when band energy exceeds threshold for ≥ `MIC_ONSET_MS = 1000` ms, and reset to `false` after `MIC_RELEASE_MS = 500` ms below threshold.

### Decision 3 — OR logic for detection confirmation

```
isDetected = stableDetections.length > 0 || micDetector.active
```

The circle and proximity UI render when `isDetected` is true. `topScore` comes from visual stable blobs if present, otherwise a fixed score of `0.7` when audio-only triggered.

### Decision 4 — Remove output audio entirely

The `createAudioAlert()`, `updateAudio()`, and all oscillator/gain nodes are deleted. No replacement output sound is introduced. The `audioAlert` module-level variable is removed.

**Alternative considered:** Keep buzz but gate it on audio trigger — rejected; user explicitly asked to remove it.

### Decision 5 — Microphone permission handling

Request mic alongside camera in Start handler. If mic permission is denied, the app falls back to visual-only mode (no error shown for mic — it's an enhancement). If camera is denied, the existing camera error flow handles it. This avoids requiring two permissions before the app can start.

## Risks / Trade-offs

- **[Risk]** Background noise (music, voices) in 200–800 Hz triggers false audio detections → Mitigation: `MIC_ONSET_MS = 1000` ms gate + relatively high `MIC_ENERGY_THRESHOLD`; user can move to a quieter environment
- **[Risk]** Safari iOS delays `AudioContext` resume until user gesture — mic AnalyserNode may not produce data until after first interaction → Mitigation: `AudioContext` is created inside the Start button click handler (already a user gesture)
- **[Risk]** Some browsers (Firefox) may require an explicit `getUserMedia({ audio: true })` separate from the video stream → Mitigation: request audio and video in separate `getUserMedia` calls; handle audio rejection gracefully (visual-only fallback)
- **[Trade-off]** Removing the buzz output means the user has no audio confirmation — accepted per user request; the circle overlay is sufficient feedback
