import { useEffect, useRef, useState } from 'react'

export interface MousePosition {
  x: number; // Normalized -1 to 1
  y: number; // Normalized -1 to 1
  clientX: number; // Raw pixels
  clientY: number; // Raw pixels
  easeX: number; // Lerped normalized
  easeY: number; // Lerped normalized
}

export function useMouse() {
  const mouse = useRef<MousePosition>({
    x: 0,
    y: 0,
    clientX: 0,
    clientY: 0,
    easeX: 0,
    easeY: 0,
  })

  const [mouseState, setMouseState] = useState<MousePosition>({
    x: 0,
    y: 0,
    clientX: 0,
    clientY: 0,
    easeX: 0,
    easeY: 0,
  })

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const clientX = event.clientX
      const clientY = event.clientY
      const x = (clientX / window.innerWidth) * 2 - 1
      const y = -(clientY / window.innerHeight) * 2 + 1

      mouse.current.clientX = clientX
      mouse.current.clientY = clientY
      mouse.current.x = x
      mouse.current.y = y
    }

    window.addEventListener('mousemove', handleMouseMove)

    let animationFrameId: number
    const update = () => {
      // Linear interpolation (lerp) for smooth easing
      mouse.current.easeX += (mouse.current.x - mouse.current.easeX) * 0.08
      mouse.current.easeY += (mouse.current.y - mouse.current.easeY) * 0.08

      setMouseState({ ...mouse.current })
      animationFrameId = requestAnimationFrame(update)
    }
    update()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return mouseState
}
