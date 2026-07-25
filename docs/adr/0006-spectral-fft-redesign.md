# 0006 — Spectral mode FFT redesign

**Status:** accepted
**Date:** 2026-07-26

## Decision

Spectral render mode is redriven from live FFT bin data (`fftData[binIdx] / 255`, bin-indexed by x-column) for both bar height and color, replacing the prior pixel-brightness-driven position/color plus random shimmer.

## Why

Spectral mode's prior implementation used the exact same brightness input as every other render mode, just with an added random shimmer — it didn't represent audio in any way despite the name, making it feel redundant next to the other 6 modes ("I don't know what is it really doing, feels redundant"). Binning FFT data across the x-axis is the natural mapping for a "spectral" visualization and makes it the one mode that's genuinely audio-native rather than webcam-native.

## Consequences

Easier: spectral mode now has a distinct reason to exist among the 7 render modes — it's the audio-reactive one; the FFT-to-color path reuses the same `getMoodGradientColor`/`getGradientColor` branch as Task A1's color-consistency fix, so mood-mode color stays consistent even here.

Harder: spectral mode's visual output now depends on `audioEnabled`/microphone permission in a way other modes don't — if audio is off or unavailable, spectral mode has no meaningful signal to render (bars flatten to the FFT array's silence-floor values), which should be communicated to the user rather than left as an unexplained flat grid.
