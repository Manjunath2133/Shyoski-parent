import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CameraControllerProps {
  scrollProgressRef: React.RefObject<number>;
  mousePosRef: React.RefObject<{ x: number; y: number }>;
}

// 5 Key scroll stop coordinates [X, Y, Z]
const cameraStops: [number, number, number][] = [
  [0, 1.5, 14],      // Stop 0: Intro (Shyoski Core focus)
  [-7, 4.5, 0],      // Stop 1: Internships World
  [7, -1, -2],       // Stop 2: Talk World
  [-1, -6.5, 11],    // Stop 3: AI World
  [6, 8.5, 11]       // Stop 4: Innovations World
]

const targetStops: [number, number, number][] = [
  [0, 0, 0],         // Target 0: Core center
  [-10, 3, -4],      // Target 1: Internships world center
  [10, -2, -6],      // Target 2: Talk world center
  [-4, -8, 8],       // Target 3: AI world center
  [8, 6, 8]          // Target 4: Innovations world center
]

export function CameraController({ scrollProgressRef, mousePosRef }: CameraControllerProps) {
  const currentPos = useRef(new THREE.Vector3())
  const currentTarget = useRef(new THREE.Vector3())
  const tempPos = useRef(new THREE.Vector3())
  const tempTarget = useRef(new THREE.Vector3())

  // Easing curve (Cubic Ease In Out)
  const easeInOutCubic = (t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  useFrame((state) => {
    const progress = Math.max(0, Math.min(1, scrollProgressRef.current ?? 0))
    const mouse = mousePosRef.current ?? { x: 0, y: 0 }

    // Identify current segment
    // Segment size is 0.25 (since there are 4 intervals between 5 stops)
    const segmentSize = 0.25
    const segmentIdx = Math.min(3, Math.floor(progress / segmentSize))
    
    // Local interpolation parameter (0 to 1 within the segment)
    const rawT = (progress - segmentIdx * segmentSize) / segmentSize
    const easedT = easeInOutCubic(Math.max(0, Math.min(1, rawT)))

    // Get current and next stops
    const startPos = cameraStops[segmentIdx]
    const endPos = cameraStops[segmentIdx + 1]
    const startTgt = targetStops[segmentIdx]
    const endTgt = targetStops[segmentIdx + 1]

    // Interpolated camera position
    tempPos.current.set(
      THREE.MathUtils.lerp(startPos[0], endPos[0], easedT),
      THREE.MathUtils.lerp(startPos[1], endPos[1], easedT),
      THREE.MathUtils.lerp(startPos[2], endPos[2], easedT)
    )

    // Interpolated camera target
    tempTarget.current.set(
      THREE.MathUtils.lerp(startTgt[0], endTgt[0], easedT),
      THREE.MathUtils.lerp(startTgt[1], endTgt[1], easedT),
      THREE.MathUtils.lerp(startTgt[2], endTgt[2], easedT)
    )

    // Add subtle mouse parallax reactive drift
    // Horizontal mouse moves camera side-to-side, vertical mouse moves it up/down
    const parallaxX = mouse.x * 0.65
    const parallaxY = mouse.y * 0.65
    tempPos.current.x += parallaxX
    tempPos.current.y += parallaxY

    // Smoothly damp the actual camera position and target
    currentPos.current.lerp(tempPos.current, 0.08)
    currentTarget.current.lerp(tempTarget.current, 0.08)

    // Apply to ThreeJS camera
    state.camera.position.copy(currentPos.current)
    state.camera.lookAt(currentTarget.current)
  })

  return null
}
