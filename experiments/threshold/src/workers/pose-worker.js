// MediaPipe Pose run in Web Worker to avoid blocking main thread

let poseDetector = null

self.onmessage = async (event) => {
  const { type, imageData, width, height } = event.data
  
  if (type === 'INIT') {
    try {
      // Load MediaPipe Pose via CDN importScripts
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
        smoothSegmentation: false, // Fixed: disabled when segmentation is off
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
  }
  
  if (type === 'DETECT' && poseDetector && imageData) {
    try {
      // Convert imageData to MediaPipe format and detect
      // Note: For 30fps, main thread should send webcam frame as imageData
      const imageElement = new Image()
      imageElement.src = imageData // Assuming imageData is a data URL or blob URL
      
      poseDetector.send({ image: imageElement })
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message })
    }
  }
}
