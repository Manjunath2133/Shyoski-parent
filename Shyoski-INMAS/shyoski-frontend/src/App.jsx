import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SignUp from './pages/SignUp';
import Login from './pages/Login'; 
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import ApprovedRoute from './components/ApprovedRoute';
import Admin from './pages/Admin';
import Certificate from './pages/Certificate';
import Profile from './pages/Profile';
import Careers from './pages/Careers';
import InternshipApplication from './pages/InternshipApplication';
import VerifyCertificate from './pages/VerifyCertificate';
import SuperAdmin from './pages/SuperAdmin';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/internship-application" element={<InternshipApplication />} />
      
      {/* Protected Admin Route */}
      <Route path="/admin" element={
        <AdminProtectedRoute>
          <Admin />
        </AdminProtectedRoute>
      } />

      {/* Super Admin Protected Route */}
      <Route path="/super-admin" element={
        <AdminProtectedRoute>
          <SuperAdmin />
        </AdminProtectedRoute>
      } />

      {/* Protected Student Routes */}
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

      {/* Profile Route */}
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
    </Routes>
  );
}

export default App;