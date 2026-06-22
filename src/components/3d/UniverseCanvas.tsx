import { Canvas } from '@react-three/fiber'
import { ShyoskiCore } from './ShyoskiCore'
import {
  InternshipsWorld,
  TalkWorld,
  AIWorld,
  InnovationsWorld
} from './OrbitingWorlds'
import { SkyDome, VolumetricLightRays, CloudMotionSystem } from './Environment'
import { CameraController } from './CameraController'
import { Butterfly } from './Butterfly'

interface UniverseCanvasProps {
  scrollProgressRef: React.RefObject<number>;
  mousePosRef: React.RefObject<{ x: number; y: number }>;
}

export function UniverseCanvas({ scrollProgressRef, mousePosRef }: UniverseCanvasProps) {
  return (
    <div className="webgl-container">
      <Canvas
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: 3, // THREE.ACESFilmicToneMapping
          toneMappingExposure: 1.1
        }}
        dpr={[1, 1.5]} // Limit dpr to 1.5 on high-density screens for performance
        camera={{
          fov: 45,
          near: 0.1,
          far: 120,
          position: [0, 1.5, 14]
        }}
      >
        {/* Procedural clean futuristic background */}
        <color attach="background" args={['#fcfdff']} />
        
        {/* Sky dome environment */}
        <SkyDome />

        {/* Global Ambient light for base illumination */}
        <ambientLight intensity={0.8} />

        {/* Warm white directional key light */}
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.5}
          color="#eff6ff"
          castShadow={false}
        />

        {/* Soft violet fill light from below */}
        <directionalLight
          position={[-10, -10, -10]}
          intensity={0.8}
          color="#f5f3ff"
        />

        {/* Central Core engine */}
        <ShyoskiCore />

        {/* Orbiting Product Worlds */}
        <InternshipsWorld position={[-10, 3, -4]} />
        <TalkWorld position={[10, -2, -6]} />
        <AIWorld position={[-4, -8, 8]} />
        <InnovationsWorld position={[8, 6, 8]} />

        {/* Holographic Logo Butterflies Flying through the Ecosystem */}
        <Butterfly initialAngle={0} radius={4.4} heightOffset={1.2} speed={0.4} color="#f59e0b" scale={1.7} />
        <Butterfly initialAngle={Math.PI * 0.7} radius={7.8} heightOffset={-1.5} speed={-0.28} color="#d4af37" scale={1.3} />
        <Butterfly initialAngle={Math.PI * 1.4} radius={6.2} heightOffset={2.4} speed={0.32} color="#ea580c" scale={1.1} />

        {/* Space environment: Light rays & dust clouds */}
        <VolumetricLightRays />
        <CloudMotionSystem />

        {/* Cinematic camera navigation handler */}
        <CameraController
          scrollProgressRef={scrollProgressRef}
          mousePosRef={mousePosRef}
        />
      </Canvas>
    </div>
  )
}
