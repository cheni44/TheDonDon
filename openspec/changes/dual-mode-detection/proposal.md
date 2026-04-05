## Why

The current app only detects mosquitoes visually using frame differencing, which misses stationary mosquitoes and still generates false positives from any small dark moving object. Adding a second trigger — detecting the characteristic wing-beat frequency of a mosquito via the microphone — provides a complementary signal. Either trigger alone is sufficient to confirm detection, making the system more robust. Additionally, the existing output buzz sound is distracting and unnecessary once the user is already watching the screen.

## What Changes

- **Raise visual stable threshold to 2 000 ms** (from 1 000 ms): a black spot must persist for 2 seconds before being counted as a visual detection
- **New: microphone-based audio detection** — continuously analyse microphone input via `AnalyserNode` FFT; if energy in the mosquito wing-beat band (200–800 Hz) exceeds a threshold for ≥ 1 second, trigger an audio detection event
- **Detection logic becomes OR** — a detection is confirmed when EITHER (a) a stable visual blob ≥ 2 s is present OR (b) the audio detector is active; the red circle and proximity UI activate under either condition
- **BREAKING: Remove output buzz audio** — the synthesised 600 Hz buzz warning sound is removed entirely; the `createAudioAlert()`, `updateAudio()` and all related audio graph code are deleted

## Capabilities

### New Capabilities

- `microphone-mosquito-detection`: Continuously capture microphone input and analyse FFT energy in the 200–800 Hz band; report a boolean "mosquito sound detected" state when band energy exceeds a configurable threshold for ≥ 1 s, and resets after 500 ms of quiet

### Modified Capabilities

- `stable-detection-tracker`: Raise `STABLE_MS` from 1 000 ms to 2 000 ms — visual blob must be present for 2 s before being promoted
- `web-audio-alert`: **BREAKING** — remove the output buzz alert entirely; the audio subsystem is replaced by the microphone input pipeline
- `web-detection-ui`: Detection circle and proximity meter now activate under either visual OR audio trigger; show a distinct indicator when the audio trigger is active

## Impact

- `mosquito-detector-web/app.js` — remove `createAudioAlert()`, `updateAudio()`, `audioAlert` state; add `MicDetector` class using `getUserMedia({audio:true})` + `AnalyserNode`; update animation loop and UI logic
- `mosquito-detector-web/index.html` — remove audio-related UI elements if any; add microphone permission handling
- No CSS changes expected
- **New browser permission required**: microphone (`audio: true` in getUserMedia)
- No new dependencies; uses built-in Web Audio API `AnalyserNode`
