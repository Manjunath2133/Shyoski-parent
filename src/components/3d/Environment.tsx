import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Shader for the bright futuristic infinite sky
const SkyShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vNormal = normal;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      // Create a gradient going from center-upwards and center-downwards
      vec3 normalizedPos = normalize(vWorldPosition);
      float yFactor = normalizedPos.y * 0.5 + 0.5; // range 0 to 1
      
      // Futuristic soft color palette
      vec3 skyColor = vec3(0.97, 0.98, 1.0); // Off-white clean top
      vec3 horizonColor = vec3(0.90, 0.93, 0.98); // Lavender-blue horizon
      vec3 bottomColor = vec3(0.95, 0.96, 0.98); // Light cyan bottom
      
      vec3 color = mix(bottomColor, horizonColor, yFactor);
      color = mix(color, skyColor, pow(yFactor, 2.0));
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
}

// Shader for volumetric glow rays
const LightRayShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3 uColor;
    
    void main() {
      // Create an overlay that fades out at the edges
      float fade = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
      fade *= (1.0 - vUv.y); // Fade out as it extends upwards
      
      // Pulse animation
      float pulse = 0.8 + 0.2 * sin(uTime * 2.0 + vUv.x * 10.0);
      
      gl_FragColor = vec4(uColor, fade * pulse * 0.28);
    }
  `
}

export function SkyDome() {
  return (
    <mesh scale={[-1, 1, 1]}> {/* Invert mesh to render inside */}
      <sphereGeometry args={[60, 32, 32]} />
      <shaderMaterial
        vertexShader={SkyDome.vertexShader}
        fragmentShader={SkyDome.fragmentShader}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}
SkyDome.vertexShader = SkyShader.vertexShader
SkyDome.fragmentShader = SkyShader.fragmentShader


export function VolumetricLightRays() {
  const raysRef = useRef<THREE.Group>(null)
  
  const rayUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#3b82f6') }
  }), [])

  useFrame((state) => {
    rayUniforms.uTime.value = state.clock.getElapsedTime()
    if (raysRef.current) {
      raysRef.current.rotation.y = state.clock.getElapsedTime() * 0.05
    }
  })

  // Create four large volumetric light ray cards intersecting the center core
  return (
    <group ref={raysRef}>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          rotation={[0, (i * Math.PI) / 2, Math.PI / 6]}
          position={[0, 4, 0]}
        >
          <planeGeometry args={[6, 12]} />
          <shaderMaterial
            vertexShader={LightRayShader.vertexShader}
            fragmentShader={LightRayShader.fragmentShader}
            uniforms={rayUniforms}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}


export function CloudMotionSystem() {
  const cloudsRef = useRef<THREE.Points>(null)

  // Floating ambient space-dust cloud particles
  const [positions, speeds] = useMemo(() => {
    const count = 180
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Random coordinates in a shell around the scene
      const angle = Math.random() * Math.PI * 2
      const radius = 8 + Math.random() * 15
      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = Math.sin(angle) * radius
      
      spd[i] = 0.05 + Math.random() * 0.08
    }

    return [pos, spd]
  }, [])

  useFrame((state) => {
    const geom = cloudsRef.current?.geometry
    if (geom && cloudsRef.current) {
      const positionsArr = geom.attributes.position.array as Float32Array
      const count = positionsArr.length / 3

      // Move clouds horizontally and wrap around
      for (let i = 0; i < count; i++) {
        positionsArr[i * 3] += speeds[i] * 0.1 // X drift
        positionsArr[i * 3 + 2] += Math.sin(state.clock.getElapsedTime() * 0.1 + i) * 0.01 // Z oscillation
        
        // Wrap coordinates if they drift too far
        if (positionsArr[i * 3] > 25) {
          positionsArr[i * 3] = -25
        }
      }
      geom.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={cloudsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#a855f7" // Glowing lavender
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
