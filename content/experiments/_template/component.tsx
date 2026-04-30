'use client'

import { useEffect, useRef } from 'react'

export default function ExperimentComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Mount your vanilla JS / p5 / Three.js logic here
    // Cleanup: return () => { /* teardown */ }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
    />
  )
}
