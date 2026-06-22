import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import { UniverseCanvas } from './components/3d/UniverseCanvas'
import { FloatingInterface } from './components/ui/FloatingInterface'
import ShyoskiTalk from './pages/ShyoskiTalk'
import EnterTransition from './components/ui/EnterTransition'

export default function App() {
  const [activeSection, setActiveSection] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  
  // High-performance refs for 3D render loop (to avoid constant React re-renders)
  const scrollProgressRef = useRef(0)
  const mousePosRef = useRef({ x: 0, y: 0 })
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    // 1. Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true
    })
    
    lenisRef.current = lenis

    const handleScroll = () => {
      const scrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const progress = maxScroll > 0 ? scrollY / maxScroll : 0
      
      // Update ref for WebGL performance (no state update overhead)
      scrollProgressRef.current = progress
      
      // Update state for UI overlay
      setScrollProgress(progress)

      // Calculate which section is active based on checkpoints
      if (progress < 0.125) {
        setActiveSection(0) // Central Core / Hero
      } else if (progress >= 0.125 && progress < 0.375) {
        setActiveSection(1) // Internships
      } else if (progress >= 0.375 && progress < 0.625) {
        setActiveSection(2) // ShyoskiTalk
      } else if (progress >= 0.625 && progress < 0.875) {
        setActiveSection(3) // Shyoski AI
      } else {
        setActiveSection(4) // Innovations
      }
    }

    // Bind scroll listener
    lenis.on('scroll', handleScroll)
    window.addEventListener('scroll', handleScroll)

    // Request Animation Frame loop for Lenis
    let rafId: number
    const animate = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)

    // 2. Track mouse coordinates with subtle smoothing for 3D parallax
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      
      // Directly update ref for the R3F Canvas rendering loop
      mousePosRef.current = { x, y }
    }
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      lenis.destroy()
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // Callback to fly the camera to a specific product section
  const handleNavigate = (sectionIndex: number) => {
    if (!lenisRef.current) return

    // Target positions: 0%, 25%, 50%, 75%, 100%
    const targetProgress = sectionIndex * 0.25
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const targetScrollY = maxScroll * targetProgress

    lenisRef.current.scrollTo(targetScrollY, {
      duration: 1.4,
      force: true
    })
  }
  const [route, setRoute] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // If route matches the talk page, render it full-screen
  if (route === '/Shyoski/Talk') {
    return <ShyoskiTalk />
  }

  return (
    <div className="relative w-full min-h-screen bg-futuristic-bg">
      <EnterTransition />
      {/* 3D WebGL Universe Canvas in Background */}
      <UniverseCanvas
        scrollProgressRef={scrollProgressRef}
        mousePosRef={mousePosRef}
      />

      {/* Floating Spatial Overlay Interface */}
      <FloatingInterface
        activeSection={activeSection}
        scrollProgress={scrollProgress}
        onNavigate={handleNavigate}
      />

      {/* 
        Scrollable runway container:
        Creates a 500vh page height where the camera and UI changes are triggered on scroll progress.
      */}
      <div className="relative z-0 h-[500vh] w-full pointer-events-none" />
    </div>
  )
}
