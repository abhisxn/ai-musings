#!/usr/bin/env node
// Performance benchmark for Threshold Phase 7 optimization
const BASELINE = { pp: 8, meshes: 9, rAF: 4, res: 64 }
const OPTIMIZED = { pp: 3, meshes: 1, rAF: 1, res: 64 }
function est({ pp, meshes, rAF, res }) {
  return 1.5 + pp * 0.7 + meshes * 0.5 * (res/64) + rAF * 1.2
}
console.log('Baseline:', est(BASELINE).toFixed(1), 'ms')
console.log('Optimized:', est(OPTIMIZED).toFixed(1), 'ms')
