// experiments/threshold/src/workers/pose-worker.ts
// MediaPipe Pose run in Web Worker to avoid blocking main thread

let poseDetector: any = null

// Dynamic import of MediaPipe (loaded from CDN to avoid bundle size)
importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js')

self.onmessage = async (event) => {
  const { type, imageData, width, height } = event.data
  
  if (type === 'INIT') {
    try {
      const { Pose } = (self as any).window || (self as any)
      poseDetector = new Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        }
      })
      
      poseDetector.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })
      
      poseDetector.onResults((results: any) => {
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
  }
  
  if (type === 'DETECT' && poseDetector) {
    // Convert imageData to MediaPipe format and detect
    // ... implementation for 30fps pose detection
  }
}
