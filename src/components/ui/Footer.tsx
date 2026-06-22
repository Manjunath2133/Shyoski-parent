import React from 'react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full px-4 z-50 pointer-events-auto">
      <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center px-5 py-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Shyoski" className="w-8 h-auto" />
            <div>
              <div className="font-semibold text-gray-900">Shyoski</div>
              <div className="text-xs text-gray-600 leading-tight">
                Building intelligent solutions for a connected world.
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center md:justify-center">
            <div className="grid grid-cols-2 gap-6 text-sm text-gray-700 w-full max-w-md">
              <div>
                <div className="font-semibold text-gray-900">Mobile</div>
                <div className="mt-1 space-y-1">
                  <a href="tel:+919148946410" className="block hover:underline">+91 91489 46410</a>
                  <a href="tel:+919972437999" className="block hover:underline">+91 99724 37999</a>
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Email</div>
                <div className="mt-1 space-y-1">
                  <a href="mailto:kmanjunath2133@gmail.com" className="block hover:underline">kmanjunath2133@gmail.com</a>
                  <a href="mailto:manoj.r1357@gmail.com" className="block hover:underline">manoj.r1357@gmail.com</a>
                </div>
              </div>
            </div>
          </div>

          <div className="text-right text-sm text-gray-600">
            <div className="font-semibold">Legal</div>
            <div className="mt-1">All rights reserved © {year} Shyoski</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
