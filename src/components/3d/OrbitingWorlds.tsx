import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Line, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

// 1. Shyoski Internships World Component
export function InternshipsWorld({ position }: { position: [number, number, number] }) {
  const connectionRef = useRef<THREE.Group>(null)
  
  // Nodes representing the certification ecosystem
  const nodes = useMemo(() => [
    { pos: [0, 1.2, 0], size: 0.35, color: '#3b82f6' }, // Central university tower
    { pos: [-0.9, -0.2, 0.9], size: 0.2, color: '#10b981' }, // Certification node
    { pos: [0.9, -0.2, 0.9], size: 0.2, color: '#8b5cf6' }, // Industry link node
    { pos: [0, -0.6, -1.0], size: 0.25, color: '#06b6d4' } // Career gate node
  ], [])

  // Floating platform mesh rotation
  useFrame((state) => {
    if (connectionRef.current) {
      connectionRef.current.rotation.y = state.clock.getElapsedTime() * 0.3
    }
  })

  return (
    <group position={position}>
      <Float speed={1.5} rotationIntensity={0.6} floatIntensity={0.8}>
        {/* Transparent Base Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
          <ringGeometry args={[1.2, 1.6, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>

        {/* Central Skyscraper Block (Futuristic Campus) */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.35, 0.45, 1.4, 6]} />
          <meshPhysicalMaterial
            color="#eff6ff"
            roughness={0.1}
            metalness={0.1}
            transmission={0.9} // Glass rendering
            thickness={1.2}
            transparent
            opacity={0.7}
          />
        </mesh>

        {/* Connecting Lines & Ecosystem Nodes */}
        <group ref={connectionRef}>
          {nodes.map((node, i) => (
            <mesh key={i} position={node.pos as [number, number, number]}>
              <sphereGeometry args={[node.size, 16, 16]} />
              <meshStandardMaterial
                color={node.color}
                roughness={0.2}
                metalness={0.8}
                emissive={node.color}
                emissiveIntensity={0.5}
              />
            </mesh>
          ))}

          {/* Linking paths */}
          <Line
            points={[[0, 1.2, 0], [-0.9, -0.2, 0.9], [0, -0.6, -1.0], [0.9, -0.2, 0.9], [0, 1.2, 0]]}
            color="#a855f7"
            lineWidth={1.5}
            transparent
            opacity={0.6}
          />
          <Line
            points={[[0, 1.2, 0], [0, -0.6, -1.0]]}
            color="#06b6d4"
            lineWidth={1.5}
            transparent
            opacity={0.6}
          />
        </group>
      </Float>
    </group>
  )
}

// 2. ShyoskiTalk World Component
export function TalkWorld({ position }: { position: [number, number, number] }) {
  const sphereRef = useRef<THREE.Mesh>(null)
  const wavesRef = useRef<THREE.Group>(null)

  // Language translation particle clouds
  const particles = useMemo(() => {
    const count = 120
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      const radius = 1.3 + Math.random() * 0.4
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = radius * Math.cos(phi)
    }
    return arr
  }, [])

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime()
    if (sphereRef.current) {
      sphereRef.current.rotation.y = elapsed * 0.4
    }
    if (wavesRef.current) {
      // Wave pulse sizes
      wavesRef.current.children.forEach((child, idx) => {
        const pulse = 1.1 + Math.sin(elapsed * 2.5 - idx * 0.5) * 0.15
        child.scale.set(pulse, pulse, pulse)
      })
    }
  })

  return (
    <group position={position}>
      <Float speed={2.0} rotationIntensity={0.8} floatIntensity={1.0}>
        {/* Main Communication Sphere (distorted glass) */}
        <mesh ref={sphereRef}>
          <sphereGeometry args={[0.85, 32, 32]} />
          <MeshDistortMaterial
            color="#effbfa"
            distort={0.25}
            speed={2}
            roughness={0.1}
            metalness={0.2}
            transmission={0.8}
            thickness={1}
            clearcoat={1}
          />
        </mesh>

        {/* Pulsating Audio Waves */}
        <group ref={wavesRef}>
          {[0, 1, 2].map((idx) => (
            <mesh key={idx} rotation={[Math.PI / 2, idx * 0.5, 0]}>
              <torusGeometry args={[1.1, 0.015, 8, 48]} />
              <meshBasicMaterial
                color="#06b6d4"
                transparent
                opacity={0.5 - idx * 0.15}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          ))}
        </group>

        {/* Surrounding Translation Cloud */}
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particles, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.045}
            color="#8b5cf6"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
            depthWrite={false}
          />
        </points>
      </Float>
    </group>
  )
}

// 3. Shyoski AI World Component
export function AIWorld({ position }: { position: [number, number, number] }) {
  const brainRef = useRef<THREE.Points>(null)
  
  // Custom neural pathways (interconnected spiderweb mesh)
  const [nodes, links] = useMemo(() => {
    const nodeCount = 18
    const positions: [number, number, number][] = []
    const linkPositions: number[] = []

    // Place points inside a sphere shape
    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      const radius = 0.7 + Math.random() * 0.4
      positions.push([
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      ])
    }

    // Connect nodes that are close to each other
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = positions[i][0] - positions[j][0]
        const dy = positions[i][1] - positions[j][1]
        const dz = positions[i][2] - positions[j][2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 1.1) {
          linkPositions.push(...positions[i], ...positions[j])
        }
      }
    }

    return [positions, new Float32Array(linkPositions)]
  }, [])

  // Morphing neural particles
  const particleBuffer = useMemo(() => {
    const count = 300
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 0.5 + Math.random() * 0.4
      arr[i * 3] = Math.cos(angle) * radius
      arr[i * 3 + 1] = Math.sin(angle) * radius
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.8
    }
    return arr
  }, [])

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime()
    if (brainRef.current) {
      brainRef.current.rotation.y = elapsed * 0.3
      brainRef.current.rotation.x = Math.sin(elapsed * 0.1) * 0.2
    }
  })

  return (
    <group position={position}>
      <Float speed={1.8} rotationIntensity={0.5} floatIntensity={1.0}>
        {/* Core brain nodes */}
        <group ref={brainRef}>
          {nodes.map((pos, i) => (
            <mesh key={i} position={pos}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#10b981" />
            </mesh>
          ))}

          {/* Neural link lines */}
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[links, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color="#3b82f6" transparent opacity={0.4} />
          </lineSegments>

          {/* Core AI Particle network (brain tissue cloud) */}
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[particleBuffer, 3]} />
            </bufferGeometry>
            <pointsMaterial
              size={0.035}
              color="#a855f7"
              transparent
              opacity={0.8}
              sizeAttenuation
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </points>
        </group>
      </Float>
    </group>
  )
}

// 4. Future Innovations World Component
export function InnovationsWorld({ position }: { position: [number, number, number] }) {
  const ringRef = useRef<THREE.Mesh>(null)
  const gridRef = useRef<THREE.GridHelper>(null)

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime()
    if (ringRef.current) {
      ringRef.current.rotation.x = elapsed * 0.4
      ringRef.current.rotation.y = elapsed * 0.2
    }
    if (gridRef.current) {
      gridRef.current.rotation.y = elapsed * 0.15
    }
  })

  return (
    <group position={position}>
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
        {/* Holographic construction grid floor */}
        <gridHelper
          ref={gridRef}
          args={[2.2, 10, '#a855f7', 'rgba(255,255,255,0.2)']}
          position={[0, -0.5, 0]}
        />

        {/* Floating holographic construction cylinder */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.8, 4, 1, true]} />
          <meshBasicMaterial
            color="#3b82f6"
            wireframe
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Central glowing innovations cube */}
        <mesh ref={ringRef} position={[0, 0.1, 0]}>
          <boxGeometry args={[0.45, 0.45, 0.45]} />
          <meshStandardMaterial
            color="#a855f7"
            wireframe
            emissive="#a855f7"
            emissiveIntensity={0.8}
          />
        </mesh>

        {/* Volumetric construction beacon/laser */}
        <mesh position={[0, 0.6, 0]}>
          <coneGeometry args={[0.04, 0.7, 8, 1, true]} />
          <meshBasicMaterial
            color="#10b981"
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Float>
    </group>
  )
}
