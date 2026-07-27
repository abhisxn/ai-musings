# ADR 0009 — Ambient + Pulse + Bloom2 + Glitch2 sound textures

## Status

Accepted (Phase 6 PR3 REV 2).

## Context

Phase 5 shipped 3 sound textures (`glitch`, `bloom`, `bass`). User
feedback: an explicit "ambient atmospheric" option is missing (bloom is
musical, not atmospheric) and a "rhythmic pulse" option is missing (bass
is drone-only).

The PR3 REV 2 spec then extended the set further to 7 textures total
(`off`, `ambient`, `bloom`, `bloom2`, `glitch`, `glitch2`, `pulse`,
`bass`) to address two more user requests:
- A more aggressive noise variant of `glitch` (bit-crushing + spectral
  freeze) — users wanted more variety in the noise-style options.
- A variant of `bloom` with metallic chime arpeggios — the bell/pad
  character of bloom, with added chime accents every other bar.

## Decision

Add 4 new texture builders to `audio.ts`:

- `buildAmbientTexture(master)` — slow-drifting dual PolySynth pad,
  AutoFilter LFO at 0.1 Hz modulating a lowpass cutoff, heavy reverb
  (8s), no percussion. Carried by `PHASE_VOLUMES[phase].atmos`.
  - Maps from: `airy` mood (was `bloom`).
- `buildPulseTexture(master)` — rhythmic sub-bass MembraneSynth
  (`triggerAttackRelease('C1', '8n')`) plus a 16-step Tone.Sequence
  arpeggiator at 1/16 over `['C3', 'E3', 'G3', 'C4']`. No melody
  Markov chain.
- `buildBloom2Texture(master)` — like `buildBloomTexture` but with
  an additional `Tone.MetalSynth` for chime accents fired via
  `Tone.Sequence` on every other 8th-note.
- `buildGlitch2Texture(master)` — like `buildGlitchTexture` but the
  voice chain starts with a `Tone.BitCrusher(4)`.

Extend `SoundTexture` union (in `mood-config.ts`):
```ts
export type SoundTexture = 'off' | 'ambient' | 'bloom' | 'bloom2' | 'glitch' | 'glitch2' | 'pulse' | 'bass'
```

Extend `moodTextureToSoundTexture` mapping:
- `airy → ambient` (was `bloom`)
- `glitch → glitch2` (was `glitch`)
- `rumble → bass` (unchanged)

The `bloom` and `glitch` textures remain as manual Leva options for
non-ARC mode. The 5 moods still map to 3 distinct effective textures;
only LUMINOUS/SOLAR (airy) and DEEP (glitch) reshuffle their visual/
audible pair.

Update:
- Leva `Audio → Soundscape` dropdown — 8 options.
- `SessionHud.TEXTURE_DESC` — 8 entries.
- `triggerVoice` and `triggerClick` — handle the new texture values
  for the per-cell/click trigger paths.

## Consequences

- `Leva → Audio → Soundscape` grows from 4 to 8 options.
- `SessionHud` TEXTURE row grows from 4 to 8 entries.
- The mood→texture mapping now sends ARC users to `ambient` (was
  `bloom`) on LUMINOUS/SOLAR — audibly different (atmospheric drone
  vs bells-and-pads).
- ARC users on DEEP now hear `glitch2` (was `glitch`) — audibly more
  aggressive (bit-crusher).
- The 3 manually-selectable textures (`bloom`, `glitch`, `bass`)
  remain available for non-ARC mode (press `0` to disable ARC, then
  pick from the dropdown).

## Alternatives considered

- Keep `glitch` mapped from `glitch` mood and add `glitch2` only as a
  manual option. Rejected: the `glitch2` builder is the strictly more
  aggressive variant and there's no reason to keep the milder `glitch`
  as the mood-driven default.
- Single new texture (`ambient`) without the `bloom2` / `glitch2`
  variants. Rejected: REV 1 of the Phase 6 spec had only 5 textures;
  the user confirmed in REV 2 that 7 (with the variants) gives the
  variety they wanted.
