import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import TrainerLogin from './pages/TrainerLogin';
import ManagerLogin from './pages/ManagerLogin';
import TrainerDashboard from './pages/TrainerDashboard';
import ManagerDashboard from './pages/ManagerDashboard';

// Protected Route Component with Role Checks
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, userRole } = useApp();

  if (!isAuthenticated) {
    if (allowedRoles && allowedRoles.includes('manager') && !allowedRoles.includes('trainer')) {
      return <Navigate to="/manager/login" replace />;
    }
    return <Navigate to="/trainer/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Prevent access and redirect to respective dashboard
    if (userRole === 'trainer') {
      return <Navigate to="/trainer-dashboard" replace />;
    } else if (userRole === 'manager') {
      return <Navigate to="/manager-dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

// Root index routing redirect helper
const RootRedirect = () => {
  const { isAuthenticated, userRole } = useApp();

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return userRole === 'manager'
    ? <Navigate to="/manager-dashboard" replace />
    : <Navigate to="/trainer-dashboard" replace />;
};

function AppContent() {
  return (
    <Routes>
      {/* Root path landing selection */}
      <Route path="/" element={<RootRedirect />} />

      {/* Legacy Redirects */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/trainer-login" element={<Navigate to="/trainer/login" replace />} />
      <Route path="/manager-login" element={<Navigate to="/manager/login" replace />} />

      {/* Trainer Login Page */}
      <Route path="/trainer/login" element={<TrainerLogin />} />

      {/* Manager Login Page */}
      <Route path="/manager/login" element={<ManagerLogin />} />

      {/* Trainer Dashboard (trainer role only) */}
      <Route
        path="/trainer-dashboard"
        element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Manager Dashboard (manager role only) */}
      <Route
        path="/manager-dashboard"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
}

export default App;
