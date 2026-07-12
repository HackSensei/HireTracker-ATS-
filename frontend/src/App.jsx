import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Candidates from './pages/Candidates';
import Pipeline from './pages/Pipeline';
import CandidatePortal from './pages/CandidatePortal';
import JobDetails from './pages/JobDetails';

const ProtectedRoute = ({ children, allowedRoles, wrapLayout = true }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Restrict access by role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'candidate') {
      return <Navigate to="/portal" />;
    }
    return <Navigate to="/dashboard" />;
  }
  
  if (wrapLayout) {
    return <Layout>{children}</Layout>;
  }
  return <>{children}</>;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (user) {
    if (user.role === 'candidate') {
      return <Navigate to="/portal" />;
    }
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'recruiter', 'viewer']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute allowedRoles={['admin', 'recruiter', 'viewer']}>
                <Jobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates"
            element={
              <ProtectedRoute allowedRoles={['admin', 'recruiter', 'viewer']}>
                <Candidates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pipeline"
            element={
              <ProtectedRoute allowedRoles={['admin', 'recruiter', 'viewer']}>
                <Pipeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['candidate']} wrapLayout={false}>
                <CandidatePortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/jobs/:id"
            element={
              <ProtectedRoute allowedRoles={['candidate']} wrapLayout={false}>
                <JobDetails />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
