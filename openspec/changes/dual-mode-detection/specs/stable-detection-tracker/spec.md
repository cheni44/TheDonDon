## MODIFIED Requirements

### Requirement: Stable blob promotion threshold
A detected blob SHALL be promoted to "stable" status (eligible to trigger the circle overlay and detection state) only after it has been continuously present for at least `STABLE_MS = 2000` ms (raised from 1 000 ms). Blobs disappearing for more than `EVICT_MS = 500` ms SHALL be evicted from the tracker.

#### Scenario: Blob present for less than 2 seconds
- **WHEN** a dark blob is detected continuously for fewer than 2 000 ms
- **THEN** it SHALL NOT appear as a stable detection and SHALL NOT activate the overlay or audio trigger

#### Scenario: Blob present for 2 seconds or more
- **WHEN** a dark blob is detected continuously for 2 000 ms or more
- **THEN** it SHALL be promoted to stable status and SHALL activate the detection overlay

#### Scenario: Blob disappears and reappears
- **WHEN** a blob disappears for more than `EVICT_MS = 500` ms and then reappears
- **THEN** the timer SHALL reset and the blob must accumulate another 2 000 ms before being considered stable
