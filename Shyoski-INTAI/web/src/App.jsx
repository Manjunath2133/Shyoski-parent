import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Careers from './pages/Careers';
import Changelog from './pages/Changelog';
import Privacy from './pages/Privacy';
import Security from './pages/Security';
import Terms from './pages/Terms';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          {/* Clean Paths */}
          <Route path="/" element={<Home />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/security" element={<Security />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Legacy Path Support to prevent breaking Vercel/external references */}
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/careers.html" element={<Navigate to="/careers" replace />} />
          <Route path="/changelog.html" element={<Navigate to="/changelog" replace />} />
          <Route path="/privacy.html" element={<Navigate to="/privacy" replace />} />
          <Route path="/security.html" element={<Navigate to="/security" replace />} />
          <Route path="/terms.html" element={<Navigate to="/terms" replace />} />
          <Route path="/dashboard.html" element={<Navigate to="/dashboard" replace />} />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}

export default App;
