## 1. Stable Detection Tracker (`app.js`)

- [x] 1.1 Add module-level constants: `STABLE_MS = 1000` (promotion threshold) and `EVICT_MS = 500` (eviction timeout) and `TRACKER_GRID = 8` (centroid quantisation in px at processing resolution)
- [x] 1.2 Add module-level `stableTracker = new Map()` alongside existing state variables
- [x] 1.3 Implement `trackerKey(blob)` — returns `"${Math.round(blob.cx / TRACKER_GRID)},${Math.round(blob.cy / TRACKER_GRID)}"` as the blob identity key
- [x] 1.4 Implement `updateTracker(detectedBlobs)` — for each detected blob, upsert `stableTracker` (insert with `firstSeenMs = now` if new, update `lastSeenMs = now` if existing); then evict all entries where `now - lastSeenMs > EVICT_MS`
- [x] 1.5 Implement `getStableDetections()` — returns an array of tracker entries where `now - firstSeenMs >= STABLE_MS`, each including the latest `blob` data
- [x] 1.6 Add `stableTracker.clear()` calls alongside existing `prevBlobs = []` resets in the Stop button handler and the Flip Camera handler

## 2. Circle Overlay (`app.js`)

- [x] 2.1 Replace the existing `renderOverlay(detections)` function signature with `renderOverlay(stableEntries)` — takes the array returned by `getStableDetections()`
- [x] 2.2 Remove the `ctx.strokeRect(...)` drawing logic; replace with `ctx.arc(cx * scaleX, cy * scaleY, radius, 0, Math.PI * 2)` where `radius = Math.max(blob.bbox.w, blob.bbox.h) / 2 * 1.3 * Math.max(scaleX, scaleY)`
- [x] 2.3 Style the circle: `strokeStyle = 'rgba(255, 40, 40, 0.9)'`, `lineWidth = 3`, use `ctx.beginPath()` / `ctx.stroke()` per entry

## 3. Audio Gate (`app.js`)

- [x] 3.1 In `animationLoop()`, replace the current audio-update block with: call `updateAudio(audioAlert, topScore)` only when `stableDetections.length > 0`; when `stableDetections.length === 0`, let the existing `SILENCE_MS` timeout handle fade-out (no change to timeout logic needed)
- [x] 3.2 Update `lastDetectionTime` to be set only on stable detections (not every detected blob)

## 4. Wire Everything in the Animation Loop (`app.js`)

- [x] 4.1 In `animationLoop()`, after `detect(...)`, call `updateTracker(result.detections)` to update the tracker map
- [x] 4.2 Call `getStableDetections()` and store result as `stableDetections`
- [x] 4.3 Derive `topScore` from `stableDetections[0]?.blob` proximity (not from all detections)
- [x] 4.4 Pass `stableDetections` (not raw `detections`) to `renderOverlay()`
- [x] 4.5 Pass `stableDetections.length > 0 ? topScore : 0` to `updateProximityUI()`

## 5. Validation

- [ ] 5.1 Verify in browser: hold a small dark object still for < 1 s — confirm NO circle and NO sound appear
- [ ] 5.2 Verify: hold object still for ≥ 1 s — confirm red circle appears and buzz sound starts
- [ ] 5.3 Verify: remove object — confirm circle disappears and sound fades out within ~1 s
- [ ] 5.4 Verify: click Flip Camera — confirm circle and sound immediately stop (tracker cleared)
