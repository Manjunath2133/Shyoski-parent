import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { TenantProvider } from '../context/TenantContext'

// Pages
import Home from './Home'
import SignUp from './SignUp'
import Login from './Login'
import Dashboard from './Dashboard'
import ProtectedRoute from '../components/ProtectedRoute'
import AdminProtectedRoute from '../components/AdminProtectedRoute'
import ApprovedRoute from '../components/ApprovedRoute'
import Admin from './Admin'
import Certificate from './Certificate'
import Profile from './Profile'
import Careers from './Careers'
import InternshipApplication from './InternshipApplication'
import VerifyCertificate from './VerifyCertificate'
import SuperAdmin from './SuperAdmin'

// Assets & Transition Components
import { AnimatePresence, motion } from 'framer-motion'
import { UniverseCanvas } from '../../../../src/components/3d/UniverseCanvas'

function LayoutWrapper() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, logout } = useAuth()

  const handleLogoClick = () => {
    window.history.pushState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-7xl w-full bg-glass/80 border border-white/20 rounded-3xl shadow-glass backdrop-blur-md overflow-hidden flex flex-col mx-auto text-gray-900"
    >
      {/* Global Brand Header */}
      <header className="w-full bg-white/40 border-b border-gray-200/30 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div onClick={handleLogoClick} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Shyoski Logo" className="h-8 w-auto" />
          <span className="text-lg font-bold tracking-tight text-gray-900 font-sans uppercase">SHYOSKI INTERNSHIPS</span>
        </div>

        <nav className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-600">
          <button onClick={() => navigate('/')} className={`hover:text-blue-700 transition-colors ${location.pathname === '/' ? 'text-blue-600 font-bold' : ''}`}>Home</button>
          <button onClick={() => navigate('/internship-application')} className={`hover:text-blue-700 transition-colors ${location.pathname === '/internship-application' ? 'text-blue-600 font-bold' : ''}`}>Apply</button>
          {currentUser ? (
            <>
              <button onClick={() => navigate('/dashboard')} className={`hover:text-blue-700 transition-colors ${location.pathname === '/dashboard' ? 'text-blue-600 font-bold' : ''}`}>Dashboard</button>
              <button onClick={() => navigate('/profile')} className={`hover:text-blue-700 transition-colors ${location.pathname === '/profile' ? 'text-blue-600 font-bold' : ''}`}>Profile</button>
              <button onClick={() => navigate('/careers')} className={`hover:text-blue-700 transition-colors ${location.pathname === '/careers' ? 'text-blue-600 font-bold' : ''}`}>Careers</button>
              <button
                onClick={async () => {
                  await logout()
                  navigate('/')
                }}
                className="hover:text-red-650 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className={`hover:text-blue-700 transition-colors ${location.pathname === '/login' ? 'text-blue-600 font-bold' : ''}`}>Sign In</button>
              <button onClick={() => navigate('/signup')} className={`hover:text-blue-700 transition-colors ${location.pathname === '/signup' ? 'text-blue-600 font-bold' : ''}`}>Register</button>
            </>
          )}
        </nav>
      </header>

      {/* Content Main View */}
      <div className="p-6 md:p-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/internship-application" element={<InternshipApplication />} />

            <Route path="/admin" element={
              <AdminProtectedRoute>
                <Admin />
              </AdminProtectedRoute>
            } />
            <Route path="/super-admin" element={
              <AdminProtectedRoute>
                <SuperAdmin />
              </AdminProtectedRoute>
            } />
            <Route path="/certificate" element={
              <ProtectedRoute>
                <Certificate />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <ApprovedRoute>
                  <Dashboard />
                </ApprovedRoute>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/careers" element={
              <ProtectedRoute>
                <Careers />
              </ProtectedRoute>
            } />
            <Route path="/verify/:uid" element={<VerifyCertificate />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function ShyoskiINMASContent() {
  const scrollProgressRef = useRef(0)
  const mousePosRef = useRef({ x: 0, y: 0 })

  return (
    <BrowserRouter basename="/ShyoskiINMAS">
      <div id="shyoskiinmas-root" tabIndex={-1} className="relative min-h-screen w-full bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4 md:p-8 font-sans overflow-auto">
        {/* 3D background canvas */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <UniverseCanvas scrollProgressRef={scrollProgressRef} mousePosRef={mousePosRef} />
        </div>

        <LayoutWrapper />
      </div>
    </BrowserRouter>
  )
}

export default function ShyoskiINMAS() {
  return (
    <AuthProvider>
      <TenantProvider>
        <ShyoskiINMASContent />
      </TenantProvider>
    </AuthProvider>
  )
}
