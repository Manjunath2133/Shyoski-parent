import { useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MagneticButton({ children, className = '', onClick }: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    // GSAP quickTo functions for smooth animation
    const xTo = gsap.quickTo(button, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.3)' })
    const yTo = gsap.quickTo(button, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.3)' })

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const { left, top, width, height } = button.getBoundingClientRect()
      
      // Button center coordinates
      const xCenter = left + width / 2
      const yCenter = top + height / 2
      
      // Distance from mouse to button center
      const distanceX = clientX - xCenter
      const distanceY = clientY - yCenter
      const distance = Math.hypot(distanceX, distanceY)
      
      // Attraction radius: 70px
      if (distance < 70) {
        // Attract the button towards the mouse (damping by 0.35)
        xTo(distanceX * 0.35)
        yTo(distanceY * 0.35)
      } else {
        // Return to origin if mouse leaves radius
        xTo(0)
        yTo(0)
      }
    }

    const handleMouseLeave = () => {
      // Return to origin on mouse exit
      xTo(0)
      yTo(0)
    }

    window.addEventListener('mousemove', handleMouseMove)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      button.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <button
      ref={buttonRef}
      className={`relative inline-flex items-center justify-center cursor-pointer pointer-events-auto ${className}`}
      onClick={onClick}
    >
      {/* Inner span wraps content to provide magnetic text hover depth */}
      <span className="relative z-10 flex items-center justify-center w-full h-full">
        {children}
      </span>
    </button>
  )
}
