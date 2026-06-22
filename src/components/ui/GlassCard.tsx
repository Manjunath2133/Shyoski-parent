import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface GlassCardProps {
  title: string;
  description: string;
  badge: string;
  link: string;
  gradientClass?: string;
  icon?: ReactNode;
}

export function GlassCard({ title, description, badge, link, gradientClass = 'from-blue-500 to-indigo-500', icon }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.95 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="bg-glass-card hover:bg-glass-panel p-8 rounded-3xl glow-border max-w-md w-full transition-all duration-500 group pointer-events-auto"
    >
      {/* Badge */}
      <div className="flex items-center justify-between mb-6">
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r ${gradientClass} text-white shadow-sm tracking-wider uppercase`}>
          {badge}
        </span>
        <div className="text-gray-400 group-hover:text-gray-800 transition-colors duration-300">
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-3 font-sans">
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-500 leading-relaxed text-sm mb-8 font-normal font-sans">
        {description}
      </p>

      {/* Bottom link with arrow */}
      {link.startsWith('/') ? (
        <a
          href={link}
          onClick={(e) => {
            e.preventDefault()
            // Trigger global enter transition; listener in App will navigate after animation
            try {
              window.dispatchEvent(new CustomEvent('shyoski:navigate', { detail: { path: link } }))
            } catch (err) {
              // Fallback to immediate navigation
              window.history.pushState(null, '', link)
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-300 relative py-1"
        >
          <span>Enter Ecosystem</span>
          <span className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center border border-white/50 shadow-glass-sm group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 group-hover:w-full" />
        </a>
      ) : (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-300 relative py-1"
        >
          <span>Enter Ecosystem</span>
          <span className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center border border-white/50 shadow-glass-sm group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 group-hover:w-full" />
        </a>
      )}
    </motion.div>
  )
}
