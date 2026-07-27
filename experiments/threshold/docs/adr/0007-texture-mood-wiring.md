# 0007 — Texture/mood wiring via a single effective-texture value

**Status:** accepted
**Date:** 2026-07-26

## Decision

`useAudio()` computes one `effectiveTexture` value per render (`moodEnabled ? moodTextureToSoundTexture(MOOD_CONFIGS[currentMood].textureType) : soundTexture`) and uses it consistently in the texture-build effect, `triggerVoice`, and `triggerClick` — replacing all direct reads of the raw `soundTexture` store value in those three sites.

## Why

`MoodConfig.textureType` (`'airy'|'glitch'|'rumble'`) and the store's `soundTexture` (`'off'|'glitch'|'bloom'|'bass'`) were two disconnected enums. A first-pass fix that wired the mapping only into the texture-build effect would have left `triggerVoice`/`triggerClick` still gating on the raw Leva `soundTexture` — meaning the audibly-built texture synth (bloom/glitch/bass) could mismatch the texture the trigger functions believed was active whenever `moodEnabled` was on and the Leva selector didn't happen to match the mood's implied texture. Computing `effectiveTexture` once and threading it through all three usage sites closes that gap at the source instead of patching each site's symptom separately.

## Consequences

Easier: mood mode and manual texture selection can never diverge — turning `moodEnabled` on always makes the currently-mood's texture the one actually heard, everywhere in the hook.

Harder: `soundTexture` (the raw Leva/store value) is no longer a reliable signal of "what texture is currently playing" from outside `useAudio()` — any future code that needs to know the *actual* playing texture (e.g. `SessionHud`) must either read `effectiveTexture` if it's exposed, or replicate the same `moodEnabled ? moodTextureToSoundTexture(...) : soundTexture` resolution rule.
