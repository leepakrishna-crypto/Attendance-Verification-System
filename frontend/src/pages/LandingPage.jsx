import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { FaUserCheck, FaChartBar, FaSun, FaMoon } from 'react-icons/fa';

const LandingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme, isAuthenticated, userRole } = useApp();

  // Redirect if authenticated
  if (isAuthenticated) {
    return userRole === 'manager'
      ? <Navigate to="/manager-dashboard" replace />
      : <Navigate to="/trainer-dashboard" replace />;
  }

  return (
    <div className="login-page-container">
      {/* Background Floating Blobs */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      <div className="landing-hero text-center">
        {/* Logo */}
        <div className="d-inline-flex bg-white p-3 rounded-4 mb-4 shadow-sm" style={{ zIndex: 10 }}>
          <img src="/logo.png" alt="Ethnus Logo" style={{ height: '50px', objectFit: 'contain' }} />
        </div>

        {/* Titles */}
        <div className="landing-subtitle">Corporate Attendance Management</div>
        <h1 className="landing-title">
          Ethnus Trainer Attendance &<br />
          Live Verification System
        </h1>
        <p className="landing-description">
          Secure trainer check-ins, location validation and executive attendance reporting.
        </p>

        {/* Cards container */}
        <div className="portal-cards-container">
          {/* Trainer Portal Card */}
          <button
            type="button"
            className="portal-card portal-card-1"
            onClick={() => navigate('/trainer/login')}
          >
            <div className="portal-icon-wrapper">
              <FaUserCheck />
            </div>
            <h3 className="portal-card-title">Trainer Portal</h3>
            <p className="portal-card-description">
              Submit geo-verified attendance, upload entry/exit photos, and view live session status.
            </p>
          </button>

          {/* Manager Portal Card */}
          <button
            type="button"
            className="portal-card portal-card-2"
            onClick={() => navigate('/manager/login')}
          >
            <div className="portal-icon-wrapper">
              <FaChartBar />
            </div>
            <h3 className="portal-card-title">Manager Portal</h3>
            <p className="portal-card-description">
              Review trainer attendance, verify location, export reports, and manage accounts.
            </p>
          </button>
        </div>

        {/* Bottom Theme Toggle */}
        <div className="mt-5 d-flex justify-content-center">
          <button
            type="button"
            className="btn btn-outline-light rounded-pill px-3 py-1.5 d-flex align-items-center gap-2"
            onClick={toggleTheme}
            style={{ fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)' }}
          >
            {theme === 'dark' ? (
              <>
                <FaSun className="text-warning" /> Light Mode
              </>
            ) : (
              <>
                <FaMoon /> Dark Mode
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
