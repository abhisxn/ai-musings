// MediaPipe Pose run in Web Worker — accepts ImageBitmap via transferable for zero-copy 30fps

let poseDetector = null

self.onmessage = async (event) => {
  const { type, imageData, imageBitmap, width, height } = event.data

  if (type === 'INIT') {
    try {
      self.importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js')

      const { Pose } = self
      poseDetector = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        }
      })

      poseDetector.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      poseDetector.onResults((results) => {
        self.postMessage({
          type: 'POSE_RESULTS',
          keypoints: results.poseLandmarks || [],
          timestamp: Date.now()
        })
      })

      self.postMessage({ type: 'INIT_DONE' })
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message })
    }
    return
  }

  if (type === 'DETECT') {
    if (!poseDetector) {
      self.postMessage({ type: 'ERROR', error: 'Pose detector not initialized. Send INIT first.' })
      return
    }

    if (!imageBitmap && !imageData) {
      self.postMessage({ type: 'ERROR', error: 'DETECT requires imageBitmap or imageData payload.' })
      return
    }

    try {
      if (imageBitmap) {
        poseDetector.send({ image: imageBitmap })
      } else if (imageData) {
        const img = await createImageBitmap(imageData)
        poseDetector.send({ image: img })
      }
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message })
    }
    return
  }
}