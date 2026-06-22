import { useRef, useId } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'

interface LiquidHoverProps {
  children: ReactNode;
  className?: string;
}

export function LiquidHover({ children, className = '' }: LiquidHoverProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const filterId = useId().replace(/:/g, '-') // Generate unique filter ID
  const mapRef = useRef<SVGFEDisplacementMapElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  const handleMouseEnter = () => {
    if (!mapRef.current) return

    // Create a new timeline on hover
    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    const map = mapRef.current
    timelineRef.current = gsap.timeline()
      .to(map, {
        attr: { scale: 18 },
        duration: 0.4,
        ease: 'power2.out'
      })
      .to(map, {
        attr: { scale: 0 },
        duration: 0.6,
        ease: 'power2.out'
      })
  }

  const handleMouseLeave = () => {
    if (!mapRef.current) return
    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    gsap.to(mapRef.current, {
      attr: { scale: 0 },
      duration: 0.5,
      ease: 'power2.out'
    })
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={{ filter: `url(#${filterId})` }}
    >
      {children}

      {/* SVG Liquid Filter Definition */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id={filterId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.04 0.07"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              ref={mapRef}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    </div>
  )
}
