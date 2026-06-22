import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Custom Fresnel/Plasma Shader for the Futuristic Core
const CoreShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    uniform float uTime;
    
    // Simple noise function for displacement
    float hash(float n) { return fract(sin(n) * 753.5453123); }
    float noise(in vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f*f*(3.0-2.0*f);
      float n = p.x + p.y*157.0 + 113.0*p.z;
      return mix(mix(mix(hash(n+0.0), hash(n+1.0),f.x),
                     mix(hash(n+157.0), hash(n+158.0),f.x),f.y),
                 mix(mix(hash(n+113.0), hash(n+114.0),f.x),
                     mix(hash(n+270.0), hash(n+271.0),f.x),f.y),f.z);
    }
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vUv = uv;
      
      // Dynamic warp displacement
      float disp = noise(position * 2.5 + uTime * 0.8) * 0.12;
      vec3 newPosition = position + normal * disp;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    
    void main() {
      // Fresnel effect
      float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.5);
      
      // Pulsing glow factor
      float pulse = 0.5 + 0.5 * sin(uTime * 1.5);
      
      // Color blending
      vec3 color = mix(uColor1, uColor2, vUv.y + 0.2 * sin(uTime + vPosition.x));
      
      // Final color with glow edge and transparent center
      vec3 finalColor = color + vec3(intensity * 1.8) * uColor1;
      float alpha = clamp(intensity * 1.2 + 0.15 * pulse, 0.0, 1.0);
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
}

export function ShyoskiCore() {
  const outerSphereRef = useRef<THREE.Mesh>(null)
  const innerSphereRef = useRef<THREE.Mesh>(null)
  const ring1Ref = useRef<THREE.Points>(null)
  const ring2Ref = useRef<THREE.Points>(null)

  // Shader uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color('#3b82f6') }, // Futuristic Blue
    uColor2: { value: new THREE.Color('#8b5cf6') }, // Futuristic Lavender
  }), [])

  // Generate particle coordinate arrays for the orbiting rings
  const [particles1, particles2] = useMemo(() => {
    const p1Count = 200
    const p2Count = 150
    const p1 = new Float32Array(p1Count * 3)
    const p2 = new Float32Array(p2Count * 3)

    // Saturn-like flat ring
    for (let i = 0; i < p1Count; i++) {
      const angle = (i / p1Count) * Math.PI * 2
      const radius = 2.4 + Math.random() * 0.8
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = (Math.random() - 0.5) * 0.1
      p1[i * 3] = x
      p1[i * 3 + 1] = y
      p1[i * 3 + 2] = z
    }

    // Secondary diagonal ring
    for (let i = 0; i < p2Count; i++) {
      const angle = (i / p2Count) * Math.PI * 2
      const radius = 3.0 + Math.random() * 0.6
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const z = (Math.random() - 0.5) * 0.1
      p2[i * 3] = x
      p2[i * 3 + 1] = y
      p2[i * 3 + 2] = z
    }

    return [p1, p2]
  }, [])

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime()
    uniforms.uTime.value = elapsed

    // Rotate components
    if (outerSphereRef.current) {
      outerSphereRef.current.rotation.y = elapsed * 0.25
      outerSphereRef.current.rotation.x = elapsed * 0.1
    }

    if (innerSphereRef.current) {
      innerSphereRef.current.rotation.y = -elapsed * 0.35
      innerSphereRef.current.rotation.z = elapsed * 0.25
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.y = elapsed * 0.12
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -elapsed * 0.08
      ring2Ref.current.rotation.x = Math.PI / 4 + elapsed * 0.04
    }
  })

  return (
    <group>
      {/* Central Core Outer Glow */}
      <mesh ref={outerSphereRef} scale={1.5}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          vertexShader={CoreShader.vertexShader}
          fragmentShader={CoreShader.fragmentShader}
          uniforms={uniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Central Core Inner High-tech Wireframe Grid */}
      <mesh ref={innerSphereRef} scale={1.2}>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshBasicMaterial
          color="#06b6d4" // Cyan
          wireframe
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Orbiting Particle Ring 1 (Saturn Ring Style) */}
      <points ref={ring1Ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particles1, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#10b981" // Emerald
          transparent
          opacity={0.8}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Orbiting Particle Ring 2 (Diagonal Neon Ring) */}
      <points ref={ring2Ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particles2, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#a855f7" // Purple / Lavender
          transparent
          opacity={0.7}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Dynamic central glow light */}
      <pointLight position={[0, 0, 0]} intensity={4.5} distance={15} color="#3b82f6" />
    </group>
  )
}
