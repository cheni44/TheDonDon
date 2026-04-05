## 1. Constants (`app.js`)

- [ ] 1.1 Change `STABLE_MS = 2000` (was 1000)
- [ ] 1.2 Add `MIC_FFT_SIZE = 1024` — FFT size for AnalyserNode
- [ ] 1.3 Add `MIC_BAND_LOW = 200` and `MIC_BAND_HIGH = 800` — mosquito wing-beat frequency range (Hz)
- [ ] 1.4 Add `MIC_ENERGY_THRESHOLD = 60` — average bin energy (0–255) to count as mosquito sound
- [ ] 1.5 Add `MIC_ONSET_MS = 1000` — ms of sustained band energy required to activate audio detection
- [ ] 1.6 Add `MIC_RELEASE_MS = 500` — ms below threshold required to deactivate audio detection

## 2. Remove Output Audio Alert (`app.js`)

- [ ] 2.1 Delete the `createAudioAlert()` function and its entire audio graph setup (carrier, LFO, lfoGain, proximityGain, masterGain nodes)
- [ ] 2.2 Delete the `updateAudio()` function
- [ ] 2.3 Remove the `let audioAlert = null` state variable
- [ ] 2.4 Remove all calls to `createAudioAlert()` and `updateAudio()` in event handlers and animation loop
- [ ] 2.5 Update the section header comment from "5. Audio alert" to "5. Microphone detection"

## 3. Microphone Detection Module (`app.js`)

- [ ] 3.1 Add `let micDetector = null` module-level state — will hold `{ stream, audioCtx, analyser, freqData, active, onsetStartMs, belowSinceMs }`
- [ ] 3.2 Implement `async startMicDetector()` — calls `getUserMedia({ audio: true })`, creates `AudioContext`, creates `AnalyserNode` (fftSize = `MIC_FFT_SIZE`), connects `source → analyser` (NOT to destination), allocates `freqData = new Uint8Array(analyser.frequencyBinCount)`, returns the micDetector object; on error returns null silently
- [ ] 3.3 Implement `stopMicDetector(mic)` — stops all audio tracks in `mic.stream`, closes `mic.audioCtx`
- [ ] 3.4 Implement `updateMicDetector(mic)` — called every animation frame: (a) call `mic.analyser.getByteFrequencyData(mic.freqData)`, (b) compute low/high bin indices using `sampleRate = mic.audioCtx.sampleRate`, (c) average the bin values in range, (d) if average ≥ `MIC_ENERGY_THRESHOLD`: update `onsetStartMs` (set to `now` if was null), clear `belowSinceMs`; if sustained ≥ `MIC_ONSET_MS` set `mic.active = true`; (e) if average < threshold: set `belowSinceMs` (if null, set to now), clear `onsetStartMs`; if sustained ≥ `MIC_RELEASE_MS` set `mic.active = false`

## 4. Update Start/Stop/Flip Handlers (`app.js`)

- [ ] 4.1 In Start handler: call `micDetector = await startMicDetector()` after starting the camera (failure is silently ignored)
- [ ] 4.2 In Stop handler: call `stopMicDetector(micDetector)` then set `micDetector = null`; remove `updateAudio(audioAlert, 0)` call
- [ ] 4.3 In Flip Camera handler: do NOT stop/restart mic (mic has no facingMode); ensure no mic-related code in flip path
- [ ] 4.4 In Retry button handler: start mic after camera restarts, same as Start handler

## 5. Update Animation Loop (`app.js`)

- [ ] 5.1 Call `updateMicDetector(micDetector)` at the top of the `if (imageData)` block when `micDetector` is not null
- [ ] 5.2 Replace detection gate: `const isDetected = stableDetections.length > 0 || (micDetector?.active ?? false)`
- [ ] 5.3 Derive `topScore`: if `stableDetections.length > 0` use `stableDetections[0].blob.proximity`; else if `micDetector?.active` use `0.7`; else `0`
- [ ] 5.4 Pass `isDetected ? topScore : 0` to `updateProximityUI()`
- [ ] 5.5 Remove `lastDetectionTime` / `SILENCE_MS` audio fade logic (no more output audio)

## 6. Microphone Status Indicator (`index.html` + `app.js` + `style.css`)

- [ ] 6.1 Add a `<div id="micStatus">🎤</div>` element near the proximity bar in `index.html`; hidden by default
- [ ] 6.2 Add `.mic-listening` and `.mic-active` CSS classes in `style.css`: listening = visible neutral grey; active = red pulsing (reuse existing `.perm-banner` keyframe animation)
- [ ] 6.3 In `app.js`, implement `updateMicUI(mic)` — show `#micStatus` with `.mic-listening` when mic is running, add/remove `.mic-active` class based on `mic.active`; hide when mic is null
- [ ] 6.4 Call `updateMicUI(micDetector)` in the animation loop each frame

## 7. Validation

- [ ] 7.1 Run `node --check app.js` — confirm zero syntax errors
- [ ] 7.2 Verify in browser: static dark object held still for < 2 s → no circle appears
- [ ] 7.3 Verify in browser: static dark object held still for ≥ 2 s → red circle appears
- [ ] 7.4 Verify: hum/whistle at ~300–600 Hz near mic for 1 s → audio indicator turns red
- [ ] 7.5 Verify: stop humming → audio indicator returns to neutral after ~0.5 s
- [ ] 7.6 Verify: no buzz sound plays at any point
- [ ] 7.7 Verify: denying mic permission → app works in visual-only mode, no error shown for mic
