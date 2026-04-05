## REMOVED Requirements

### Requirement: Synthesised buzz audio alert
**Reason**: Replaced by microphone-based mosquito detection. The output warning buzz is distracting and redundant when the user can see the circle overlay. The user explicitly requested its removal.
**Migration**: Remove `createAudioAlert()`, `updateAudio()`, `audioAlert` state variable, and all carrier/LFO/gain node code from `app.js`. The `<audio>` section comment block in the source file should be removed or replaced with the microphone detection section.
