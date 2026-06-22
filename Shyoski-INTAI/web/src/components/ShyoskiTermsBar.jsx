import React from 'react'
import { Link } from 'react-router-dom'

export default function ShyoskiTermsBar() {
  return (
    <div className="fixed top-4 left-0 right-0 z-40 flex justify-center pointer-events-auto">
      <div className="w-full max-w-7xl mx-4 bg-glass px-6 py-3 rounded-full shadow-glass border border-white/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-white/5" />
            <div className="hidden sm:block text-sm text-gray-600"></div>
          </div>

          <div>
            <Link to="/terms" className="text-sm px-3 py-1 rounded-full bg-white/10 border border-white/10 hover:bg-white/20">Terms</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
