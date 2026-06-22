import React, { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquare, DownloadCloud, Smartphone, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { MagneticButton } from '../components/ui/MagneticButton'
import { UniverseCanvas } from '../components/3d/UniverseCanvas'
import { Canvas } from '@react-three/fiber'
import { TalkWorld } from '../components/3d/OrbitingWorlds'

export default function ShyoskiTalk() {
  const downloadHref = '/shyoskitalk.apk'
  const scrollProgressRef = useRef<number>(0)
  const mousePosRef = useRef({ x: 0, y: 0 })
  const [scrolled, setScrolled] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const onScroll = () => {
      const sc = window.scrollY || document.documentElement.scrollTop
      setScrolled(sc > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div id="shyoskitalk-root" ref={rootRef} tabIndex={-1} className="relative min-h-screen w-full bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center p-8 font-sans overflow-auto">
      {/* 3D background canvas (subtle, pointer-events-none) */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <UniverseCanvas scrollProgressRef={scrollProgressRef as any} mousePosRef={mousePosRef as any} />
      </div>

      <AnimatePresence>
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-7xl w-full bg-glass/80 border border-white/20 rounded-3xl shadow-glass backdrop-blur-md p-4 sm:p-6 md:p-8 pt-16 md:pt-12 grid grid-cols-1 md:grid-cols-3 gap-4 items-center justify-center mx-auto"
        >
          
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
            className="col-span-1 md:col-span-2 w-full flex items-center justify-center"
          >
            <div className="w-full md:w-2/3 lg:w-1/2 relative">
              <button
                type="button"
                onClick={() => {
                  window.history.pushState(null, '', '/')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }}
                aria-label="Return to Shyoski Core"
                className="absolute left-4 top-4 md:-left-20 md:-top-10 z-40 p-1 rounded-full bg-white/5 hover:bg-white/10 pointer-events-auto"
              >
                <img src="/logo.png" alt="Shyoski Logo" className="w-10 md:w-16 h-auto block" />
              </button>
            <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-cyan-50/80 border border-cyan-100 mb-3">
              <MessageSquare className="w-5 h-5 text-cyan-500" />
              <span className="text-xs font-semibold text-cyan-700 uppercase">ShyoskiTalk</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
              ShyoskiTalk
              <span className="block text-cyan-600 mt-1 text-xl md:text-2xl font-semibold">Offline Real-time Voice Translation</span>
            </h1>

            <p className="mt-3 text-gray-600 leading-relaxed text-sm md:text-base">
              ShyoskiTalk puts a full conversational translator on your device — no SIM, no Wi‑Fi, no cloud needed. It uses compact, high-performance language particles to convert speech between languages in real time with millisecond-level responsiveness. Conversations stay private (everything is processed locally), battery-efficient, and robust even in remote or airborne environments.
            </p>

            <ul className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
              <li className="flex flex-col items-center gap-2">
                <Smartphone className="w-6 h-6 text-teal-500" />
                <div className="font-semibold">On-Device Models</div>
                <div className="text-xs text-gray-500">Compact neural engines optimized for mobile CPU inference.</div>
              </li>
              <li className="flex flex-col items-center gap-2">
                <Globe className="w-6 h-6 text-cyan-500" />
                <div className="font-semibold">Low-Latency</div>
                <div className="text-xs text-gray-500">Real-time streaming translation with minimal delay for natural dialogue.</div>
              </li>
              <li className="flex flex-col items-center gap-2">
                <DownloadCloud className="w-6 h-6 text-indigo-500" />
                <div className="font-semibold">Private & Secure</div>
                <div className="text-xs text-gray-500">No audio leaves your device — privacy-first by design.</div>
              </li>
            </ul>

            <div className="mt-6 text-sm text-gray-500 max-w-xl mx-auto">
              <strong className="block text-gray-700">How it works:</strong>
              <span>
                ShyoskiTalk loads tiny language packs and runs them as "particles" — lightweight neural components that specialize in accents, phonetics, and fast decoding. The app blends particle outputs to produce clear translations while using adaptive bitrate and energy-saving strategies to extend battery life.
              </span>
            </div>

            <div className="mt-6 flex items-center gap-3 justify-center">
              <a href={downloadHref} download className="pointer-events-auto">
                <MagneticButton className="bg-gradient-to-r from-cyan-600 to-teal-500 text-white px-5 py-2.5 rounded-full font-semibold shadow-glass border border-white/20 text-sm">
                  Download APK
                </MagneticButton>
              </a>

              <button
                onClick={() => {
                  // navigate back to core route
                  window.history.pushState(null, '', '/')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }}
                className="text-sm text-gray-700 px-3 py-2 rounded-full bg-white/70 border border-white/30 shadow-sm hover:bg-white"
              >
                Return to Core
              </button>
            </div>

            <div className="mt-6 bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-gray-700 max-w-xl mx-auto">
              <strong className="block text-gray-800 mb-2">System Requirements</strong>
              <ul className="space-y-1">
                <li><span className="font-semibold">Platform:</span> Android device</li>
                <li><span className="font-semibold">RAM:</span> 6GB recommended; 4GB minimum</li>
                <li><span className="font-semibold">Storage:</span> 1.5GB available</li>
                <li><span className="font-semibold">Connectivity:</span> Bluetooth LE (Low Energy)</li>
              </ul>
            </div>
            </div>
          </motion.div>

          {/* Right-side small 3D preview */}
          <aside className="hidden md:flex md:col-span-1 items-center justify-center">
            <div className="w-64 h-64 rounded-xl bg-white/5 border border-white/10 shadow-glass p-2 flex items-center justify-center">
              <Canvas
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 1.5]}
                camera={{ position: [0, 0, 4], fov: 50 }}
              >
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 5, 5]} intensity={0.8} />
                <TalkWorld position={[0, 0, 0]} />
              </Canvas>
            </div>
          </aside>
          <div className="col-span-1 md:col-span-3 mt-4 w-full flex justify-center">
            <motion.div className="text-center text-xs text-gray-500">
              <span>Powered by Shyoski — bring private translation to every conversation.</span>
            </motion.div>
          </div>
        </motion.main>
      </AnimatePresence>

      {/* Scroll hint: show 'Scroll to download' when at top; when scrolled show only up arrow */}
      <div className="fixed left-1/2 transform -translate-x-1/2 bottom-6 z-20">
        <button
          onClick={() => {
            if (!scrolled) {
              const el = document.querySelector('main') as HTMLElement | null
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
          aria-label={scrolled ? 'Scroll to top' : 'Scroll to download'}
          className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-full border border-white/20 hover:bg-white/20"
        >
          {!scrolled && <div className="text-xs text-cyan-600 font-medium">Scroll to download</div>}
          <div>
            {scrolled ? <ChevronUp className="w-6 h-6 text-cyan-600" /> : <ChevronDown className="w-6 h-6 text-cyan-600" />}
          </div>
        </button>
      </div>
    </div>
  )
}
