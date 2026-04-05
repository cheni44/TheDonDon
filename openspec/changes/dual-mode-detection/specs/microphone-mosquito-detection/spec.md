## ADDED Requirements

### Requirement: Microphone capture for mosquito sound detection
The system SHALL request microphone access via `getUserMedia({ audio: true })` when the user clicks Start. If microphone permission is denied or unavailable, the system SHALL silently fall back to visual-only detection and SHALL NOT display an error for the microphone failure.

#### Scenario: Microphone permission granted
- **WHEN** the user clicks Start and grants microphone permission
- **THEN** the system SHALL begin analysing microphone input for mosquito wing-beat frequencies within 1 second

#### Scenario: Microphone permission denied
- **WHEN** the user denies microphone permission or the device has no microphone
- **THEN** the system SHALL continue running in visual-only mode with no error message shown for the microphone

### Requirement: FFT band energy detection (200–800 Hz)
The system SHALL use a Web Audio API `AnalyserNode` connected to the microphone stream to compute FFT frequency data on each animation frame. It SHALL compute the average energy of all FFT bins falling within the 200–800 Hz range and compare it against `MIC_ENERGY_THRESHOLD = 60` (on a 0–255 scale).

#### Scenario: Mosquito sound present
- **WHEN** the average FFT band energy in 200–800 Hz exceeds `MIC_ENERGY_THRESHOLD` for at least `MIC_ONSET_MS = 1000` ms continuously
- **THEN** the system SHALL set the audio detection state to active (`micDetector.active = true`)

#### Scenario: Ambient noise below threshold
- **WHEN** the average band energy remains below `MIC_ENERGY_THRESHOLD`
- **THEN** the audio detection state SHALL remain inactive and SHALL NOT contribute to detection

### Requirement: Audio detection release hysteresis
Once the audio detection state is active, the system SHALL keep it active until the band energy has been below `MIC_ENERGY_THRESHOLD` continuously for at least `MIC_RELEASE_MS = 500` ms before resetting to inactive.

#### Scenario: Brief silence during mosquito sound
- **WHEN** the band energy drops below threshold for less than `MIC_RELEASE_MS`
- **THEN** the audio detection state SHALL remain active (hysteresis prevents jitter)

#### Scenario: Sustained silence
- **WHEN** the band energy stays below threshold for `MIC_RELEASE_MS` or more
- **THEN** the audio detection state SHALL be reset to inactive

### Requirement: Microphone stopped on app stop
The system SHALL stop all microphone audio tracks and close the `AudioContext` when the user clicks Stop, ensuring no background microphone capture continues.

#### Scenario: User clicks Stop
- **WHEN** the user clicks Stop
- **THEN** all microphone `MediaStreamTrack`s SHALL be stopped and the mic `AudioContext` SHALL be closed
