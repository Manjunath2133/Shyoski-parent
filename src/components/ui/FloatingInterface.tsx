import { AnimatePresence, motion } from 'framer-motion'
import { GraduationCap, MessageSquare, BrainCircuit, Lightbulb, Compass } from 'lucide-react'
import { GlassCard } from './GlassCard'
import { MagneticButton } from './MagneticButton'

interface FloatingInterfaceProps {
  activeSection: number;
  scrollProgress: number;
  onNavigate: (sectionIndex: number) => void;
}

const sectionInfo = [
  {
    id: 'core',
    title: 'Shyoski Core',
    subtitle: 'Innovation Hub',
  },
  {
    id: 'internships',
    title: 'Shyoski Internships',
    badge: 'Talent Management',
    description: 'A floating futuristic campus simplifying internship management. Automate verification, monitor candidate progress, and bridge student talent to global certification frameworks.',
    link: 'https://internships.shyoski.com',
    gradient: 'from-blue-500 to-indigo-500',
    icon: <GraduationCap className="w-6 h-6 text-blue-500" />
  },
  {
    id: 'talk',
    title: 'ShyoskiTalk',
    badge: 'Offline AI Translation',
    description: 'Completely offline real-time voice translation. Leveraging high-performance language particles to bridge dialogue globally without cellular or cloud dependency.',
    link: '/ShyoskiTalk',
    gradient: 'from-cyan-500 to-teal-500',
    icon: <MessageSquare className="w-6 h-6 text-cyan-500" />
  },
  {
    id: 'ai',
    title: 'Shyoski INTAI',
    badge: 'Career Intelligence',
    description: 'Interactive neural network career path guides. Train through AI simulated voice interviews, receive instant feedback metrics, and master your career direction.',
    link: '/ShyoskiAI',
    gradient: 'from-emerald-500 to-teal-600',
    icon: <BrainCircuit className="w-6 h-6 text-emerald-500" />
  },
  {
    id: 'innovations',
    title: 'Future Innovations',
    badge: 'Holographic Blueprints',
    description: 'An open holographic blueprint zone designing next-generation protocols. Quantum lattices, spatial networks, and adaptive computing platforms currently in active design.',
    link: 'https://innovations.shyoski.com',
    gradient: 'from-purple-500 to-pink-500',
    icon: <Lightbulb className="w-6 h-6 text-purple-500" />
  }
]

export function FloatingInterface({ activeSection, scrollProgress, onNavigate }: FloatingInterfaceProps) {
  return (
    <div className="fixed inset-0 z-10 w-full h-full pointer-events-none flex flex-col justify-between font-sans">
      {/* 1. Header (Top Navigation) */}
      <header className="w-full px-8 py-6 pointer-events-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-glass px-6 py-4 rounded-full shadow-glass border border-white/40">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate(0)}>
            <img src="/logo.png" alt="Shyoski Logo" className="h-9 w-auto" />
            <span className="text-xl font-bold tracking-tight text-gray-900 font-sans">
              SHYOSKI
            </span>
          </div>

          {/* Quick links / CTA */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <button onClick={() => onNavigate(1)} className={`hover:text-gray-900 transition-colors ${activeSection === 1 ? 'text-blue-600 font-semibold' : ''}`}>Internships</button>
            <button onClick={() => onNavigate(2)} className={`hover:text-gray-900 transition-colors ${activeSection === 2 ? 'text-cyan-600 font-semibold' : ''}`}>ShyoskiTalk</button>
            <button onClick={() => onNavigate(3)} className={`hover:text-gray-900 transition-colors ${activeSection === 3 ? 'text-emerald-600 font-semibold' : ''}`}>Shyoski INTAI</button>
            <button onClick={() => onNavigate(4)} className={`hover:text-gray-900 transition-colors ${activeSection === 4 ? 'text-purple-600 font-semibold' : ''}`}>Innovations</button>
          </nav>

          <MagneticButton className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-glass border border-white/20 transition-all duration-300">
            Connect Portal
          </MagneticButton>
        </div>
      </header>

      {/* 2. Main Floating Content Zone */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-8 flex items-center relative">
        {/* Dynamic Card Display based on scroll triggers */}
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center h-full py-12">
          
          {/* Left / Center: Landing Copy */}
          <div className="md:col-span-6 flex flex-col justify-center items-start text-left select-none">
            <AnimatePresence mode="wait">
              {activeSection === 0 && (
                <motion.div
                  key="hero-text"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-6"
                >
                  <div className="inline-flex items-center gap-2 bg-blue-50/70 border border-blue-100 px-4 py-2 rounded-full backdrop-blur-md shadow-sm">
                    <Compass className="w-4 h-4 text-blue-500 animate-spin-slow" />
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Innovation Ecosystem</span>
                  </div>
                  <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-none text-gray-900">
                    Entering the <br />
                    <span className="text-gradient-primary">Shyoski Universe</span>
                  </h1>
                  <p className="text-lg text-gray-500 max-w-lg leading-relaxed font-normal">
                    An advanced technology platform designing connected spatial solutions for education, offline communication, and artificial intelligence.
                  </p>
                  
                  <div className="pt-4 pointer-events-auto">
                    <MagneticButton 
                      onClick={() => onNavigate(1)}
                      className="bg-white/80 hover:bg-white text-gray-900 border border-white/60 shadow-glass px-8 py-3.5 rounded-full font-semibold text-sm transition-all duration-300"
                    >
                      Begin Journey
                    </MagneticButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right side: Dynamic Floating Glass Card */}
          <div className="md:col-span-6 flex justify-end items-center h-full">
            <AnimatePresence mode="wait">
              {activeSection > 0 && (
                <div key={activeSection} className="w-full flex justify-end">
                  <GlassCard
                    title={sectionInfo[activeSection].title}
                    badge={sectionInfo[activeSection].badge ?? ''}
                    description={sectionInfo[activeSection].description ?? ''}
                    link={sectionInfo[activeSection].link ?? ''}
                    gradientClass={sectionInfo[activeSection].gradient}
                    icon={sectionInfo[activeSection].icon}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* 3. Spatial Vertical Indicators (Floating Right Sidebar) */}
        <aside className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 bg-white/30 hover:bg-white/55 px-3 py-6 rounded-full border border-white/40 shadow-glass backdrop-blur-md pointer-events-auto transition-all duration-300 group">
          {sectionInfo.map((sec, idx) => (
            <button
              key={sec.id}
              onClick={() => onNavigate(idx)}
              className="relative p-2 flex items-center justify-center focus:outline-none"
              title={sec.title}
            >
              {/* Outer circle hover effect */}
              {activeSection === idx && (
                <motion.div
                  layoutId="active-dot"
                  className="absolute inset-0 rounded-full border border-blue-500/80 bg-blue-500/10"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              {/* Inner Dot */}
              <span
                className={`block w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  activeSection === idx
                    ? 'bg-blue-600 scale-125'
                    : 'bg-gray-400 group-hover:bg-gray-600'
                }`}
              />
            </button>
          ))}
        </aside>
      </main>

      {/* 4. Footer (Bottom Info) */}
      <footer className="w-full px-8 py-6 flex items-center justify-between text-xs text-gray-400 select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ecosystem Active (v2.0)</span>
        </div>

        {/* Scroll Prompt (Only on first screen) */}
        <AnimatePresence>
          {activeSection === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}
              className="absolute left-1/2 -translate-x-1/2 bottom-8 flex flex-col items-center gap-2"
            >
              <span className="font-semibold text-gray-500 tracking-wider uppercase text-[10px]">Scroll to Navigate</span>
              <div className="w-5 h-8 rounded-full border-2 border-gray-300 flex justify-center p-1">
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="w-1.5 h-1.5 rounded-full bg-gray-500"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll Progress percentage */}
        <div className="font-mono text-right">
          Universe Alignment: {Math.round(scrollProgress * 100)}%
        </div>
      </footer>
    </div>
  )
}
