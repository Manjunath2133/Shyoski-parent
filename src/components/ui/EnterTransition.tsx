import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { TalkWorld, AIWorld } from '../../components/3d/OrbitingWorlds'

export function EnterTransition() {
  const [visible, setVisible] = useState(false)
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: any) => {
      const path = e?.detail?.path || '/'
      if (visible) return
      setTarget(path)
      setVisible(true)

      // After 6s navigate
      setTimeout(() => {
        window.history.pushState(null, '', path)
        // ensure the new page is at the top and focusable
        try {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
          // Allow the routed page to mount, then focus its root if present
          setTimeout(() => {
            const root = document.getElementById(path === '/ShyoskiAI' ? 'shyoskiai-root' : 'shyoskitalk-root')
            if (root) {
              root.focus({ preventScroll: true } as any)
            }
          }, 50)

        } catch (err) {
          // ignore
        }

        window.dispatchEvent(new PopStateEvent('popstate'))
        setVisible(false)
        setTarget(null)
      }, 6000)
    }

    window.addEventListener('shyoski:navigate', handler as EventListener)
    return () => window.removeEventListener('shyoski:navigate', handler as EventListener)
  }, [visible])

  const isAI = target === '/ShyoskiAI'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b ${
            isAI ? 'from-emerald-950/60 to-indigo-950/70' : 'from-cyan-900/60 to-indigo-900/70'
          } backdrop-blur-md pointer-events-auto`}
        >
          <div className="absolute inset-0 opacity-40">
            <Canvas gl={{ alpha: true }} camera={{ position: [0, 0, 6], fov: 50 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={0.8} />
              {isAI ? <AIWorld position={[0, 0, 0]} /> : <TalkWorld position={[0, 0, 0]} />}
            </Canvas>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: [0.95, 1.02, 0.98, 1], opacity: 1 }}
            transition={{ duration: 5.6, ease: 'easeInOut' }}
            className="relative z-10 flex flex-col items-center justify-center gap-6 p-6"
          >
            <img src="/logo.png" alt="Shyoski" className="w-28 h-auto mb-2" />
            <h2 className="text-2xl md:text-3xl font-extrabold text-white text-center">Entering the Ecosystem</h2>
            <p className="text-sm text-white/90 text-center max-w-lg">
              {isAI
                ? 'Shyoski INTAI — initializing career intelligence matrices. Preparing secure display shielding layers...'
                : 'ShyoskiTalk — initializing offline translation particles. Preparing a private, high-performance conversational bridge...'}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <motion.span
                animate={{ x: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-3 h-3 rounded-full bg-white"
              />
              <motion.span
                animate={{ x: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                className="w-3 h-3 rounded-full bg-white/80"
              />
              <motion.span
                animate={{ x: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                className="w-3 h-3 rounded-full bg-white/60"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default EnterTransition
