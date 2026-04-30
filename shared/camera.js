// getUserMedia + canvas pixel sampler

export async function initCamera(videoEl, constraints = { video: true }) {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

export function samplePixels(videoEl, canvas, ctx) {
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
