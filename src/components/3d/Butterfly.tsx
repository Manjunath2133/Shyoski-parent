import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ButterflyProps {
  initialAngle?: number;
  radius?: number;
  heightOffset?: number;
  speed?: number;
  scale?: number;
  color?: string;
}

export function Butterfly({
  initialAngle = 0,
  radius = 4.5,
  heightOffset = 1.0,
  speed = 0.4,
  scale = 1.5, // Increased default scale for visibility
  color = '#f59e0b' // Default to Amber/Gold matching the logo color
}: ButterflyProps) {
  const butterflyRef = useRef<THREE.Group>(null)
  const leftWingRef = useRef<THREE.Group>(null)
  const rightWingRef = useRef<THREE.Group>(null)

  // Refined butterfly wing shape for a more detailed, "flexing" low-poly appearance
  const wingGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    
    // Start at pivot point
    shape.moveTo(0, 0)
    // Large Upper Lobe (with smooth Bezier curves)
    shape.bezierCurveTo(0.2, 0.6, 0.7, 1.1, 1.1, 0.9)
    shape.bezierCurveTo(1.3, 0.7, 0.9, 0.3, 0.5, 0.05)
    
    // Sleek Lower Lobe
    shape.bezierCurveTo(0.8, -0.3, 0.5, -0.8, 0.3, -0.7)
    shape.bezierCurveTo(0.1, -0.6, 0.05, -0.2, 0, 0)

    return new THREE.ShapeGeometry(shape)
  }, [])

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime()

    // 1. Rapid wider wing flapping motion (flexing)
    const flapFrequency = 20
    // Increased amplitude from 0.55 to 0.85 for a more dramatic sweep
    const flapAngle = Math.sin(elapsed * flapFrequency) * 0.85

    if (leftWingRef.current) {
      leftWingRef.current.rotation.y = flapAngle
    }
    if (rightWingRef.current) {
      rightWingRef.current.rotation.y = -flapAngle
    }

    // 2. Trajectory movement (orbits the core)
    if (butterflyRef.current) {
      const angle = elapsed * speed + initialAngle
      
      const targetX = Math.cos(angle) * radius
      const targetZ = Math.sin(angle) * radius
      
      // Increased vertical hover amplitude for organic displacement
      const targetY = heightOffset + Math.sin(elapsed * 1.8 + initialAngle) * 0.9

      butterflyRef.current.position.set(targetX, targetY, targetZ)

      // Turn body to face direction of travel
      butterflyRef.current.rotation.y = -angle + Math.PI / 2
      
      // Dramatic bank tilt (roll) into flight trajectory curves
      butterflyRef.current.rotation.z = Math.sin(elapsed * 2.2 + initialAngle) * 0.2
      // Gentle pitch up and down
      butterflyRef.current.rotation.x = Math.sin(elapsed * 1.5) * 0.1
    }
  })

  return (
    <group ref={butterflyRef} scale={scale}>
      {/* 1. Main body cylinder */}
      <mesh>
        <cylinderGeometry args={[0.045, 0.045, 0.6, 8]} />
        <meshStandardMaterial
          color="#ffb300" // Glowing yellow-gold base
          emissive="#ff9800"
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* 2. Antennae */}
      <group position={[0, 0.25, 0.05]} rotation={[-Math.PI / 6, 0, 0]}>
        <mesh position={[-0.04, 0.12, 0]} rotation={[0, 0, 0.25]}>
          <cylinderGeometry args={[0.005, 0.005, 0.3]} />
          <meshBasicMaterial color="#ffb300" />
        </mesh>
        <mesh position={[0.04, 0.12, 0]} rotation={[0, 0, -0.25]}>
          <cylinderGeometry args={[0.005, 0.005, 0.3]} />
          <meshBasicMaterial color="#ffb300" />
        </mesh>
      </group>

      {/* 3. Left Wing */}
      <group ref={leftWingRef}>
        <mesh geometry={wingGeometry} rotation={[0, 0, 0.08]}>
          <meshPhysicalMaterial
            color={color}
            roughness={0.1}
            metalness={0.4}
            transmission={0.8} // Glassy translucency
            thickness={0.6}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* 4. Right Wing (Mirrored scale) */}
      <group ref={rightWingRef} scale={[-1, 1, 1]}>
        <mesh geometry={wingGeometry} rotation={[0, 0, 0.08]}>
          <meshPhysicalMaterial
            color={color}
            roughness={0.1}
            metalness={0.4}
            transmission={0.8}
            thickness={0.6}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Point Light to cast logo ambient colors */}
      <pointLight distance={4} intensity={2.5} color={color} />
    </group>
  )
}
