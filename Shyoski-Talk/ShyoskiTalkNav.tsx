import React from 'react'

type Props = {
  onScrollToTerms?: () => void
}

export default function ShyoskiTalkNav({ onScrollToTerms }: Props) {
  return (
    <header className="fixed top-4 left-0 right-0 z-40 flex justify-center pointer-events-auto">
      <div className="w-full max-w-7xl mx-4 bg-glass px-6 py-3 rounded-full shadow-glass border border-white/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { window.history.pushState(null, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }}>
            <img src="/logo.png" alt="Shyoski Logo" className="w-8 h-8" />
            <div className="hidden sm:block text-sm font-bold text-gray-900 tracking-tight">SHYOSKI TALK</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.history.pushState(null, '', '/ShyoskiTalk/terms')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
              className="text-sm px-3 py-1 rounded-full bg-white/10 border border-white/10 hover:bg-white/20"
            >
              Terms
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
