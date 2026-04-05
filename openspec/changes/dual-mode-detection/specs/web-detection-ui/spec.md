## MODIFIED Requirements

### Requirement: Detection overlay activation condition
The system SHALL display the red circle overlay when EITHER a stable visual detection exists (blob present ≥ 2 000 ms) OR the microphone audio detector is active (`micDetector.active = true`). Both conditions independently trigger the overlay.

#### Scenario: Visual detection only
- **WHEN** a stable visual blob is present but no mosquito sound is detected
- **THEN** the red circle overlay SHALL appear at the blob's location

#### Scenario: Audio detection only
- **WHEN** the microphone audio detector is active but no stable visual blob is present
- **THEN** the system SHALL show a visual indicator that audio detection is active (e.g., a pulsing border or icon); the proximity meter SHALL display a fixed score of 70%

#### Scenario: Both detections active simultaneously
- **WHEN** both a stable visual blob and audio detection are active
- **THEN** the red circle SHALL be drawn at the visual blob location; the proximity score SHALL be derived from the visual blob

#### Scenario: Neither detection active
- **WHEN** no stable visual blob and no active audio detection
- **THEN** the overlay SHALL be cleared and proximity meter SHALL show "—"

## ADDED Requirements

### Requirement: Audio detection status indicator
The system SHALL display a visible microphone activity indicator (e.g., a 🎤 icon or pulsing element) when the microphone is initialised and listening, and SHALL highlight or animate it when the audio detector is active.

#### Scenario: Mic listening but no mosquito sound
- **WHEN** the microphone is capturing but band energy is below threshold
- **THEN** the mic indicator SHALL be visible but in a neutral/inactive state

#### Scenario: Mosquito sound detected via mic
- **WHEN** `micDetector.active` becomes true
- **THEN** the mic indicator SHALL change to an active/highlighted state (e.g., red or pulsing)
