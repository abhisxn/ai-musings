// Tone.js init patterns

export async function startAudio() {
  const { default: Tone } = await import('https://cdn.jsdelivr.net/npm/tone@14/build/Tone.js');
  await Tone.start();
  return Tone;
}
