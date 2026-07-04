import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  FaUser, FaLock, FaSun, FaMoon, FaArrowLeft,
  FaEye, FaEyeSlash
} from 'react-icons/fa';

const ManagerLogin = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme, login, logout, isAuthenticated, userRole, showToast } = useApp();

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Redirect if authenticated
  if (isAuthenticated) {
    return userRole === 'manager' 
      ? <Navigate to="/manager-dashboard" replace /> 
      : <Navigate to="/trainer-dashboard" replace />;
  }

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Please fill in all fields.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const role = await login(loginUsername.trim(), loginPassword.trim());
      setLoginLoading(false);

      if (role) {
        if (role === 'manager') {
          navigate('/manager-dashboard');
        } else {
          // Enforce manager-only access
          logout();
          setLoginError(`Account role mismatch. This username belongs to a ${role}.`);
          showToast('Access denied: Please log in using the correct portal.', 'error');
        }
      } else {
        setLoginError('Invalid username or password.');
      }
    } catch (err) {
      setLoginLoading(false);
      setLoginError(err.response?.data?.message || 'Invalid username or password.');
    }
  };

  return (
    <div className="login-page-container">
      {/* Background Floating Blobs */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      <div className="login-card-wrapper">
        <div className="glass-card login-card-inner p-4 p-md-5">
          
          {/* Back Button to Portals */}
          <button 
            type="button" 
            className="btn btn-link text-decoration-none p-0 mb-4 d-flex align-items-center gap-1.5 text-primary fw-bold hover-scale text-start"
            onClick={() => navigate('/')}
          >
            <FaArrowLeft /> Back to Portals
          </button>

          {/* Header branding */}
          <div className="text-center mb-4">
            <div className="d-inline-flex bg-white p-2 rounded-3 shadow-sm mb-3 border">
              <img src="/logo.png" alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
            </div>
            <h2 className="fw-extrabold text-primary-theme h4 mb-1">Manager Login</h2>
            <p className="text-secondary small">Authorization credentials are required to continue</p>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={handleLoginSubmit}>
            {/* Username */}
            <div className="mb-3 text-start">
              <label className="form-label fw-semibold text-secondary small">Manager Username</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0">
                  <FaUser className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Enter manager username"
                  value={loginUsername}
                  onChange={(e) => {
                    setLoginUsername(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-4 text-start">
              <label className="form-label fw-semibold text-secondary small">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0">
                  <FaLock className="text-muted" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control border-start-0 border-end-0"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-group-text bg-transparent border-start-0 text-muted"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {loginError && (
                <div className="text-danger mt-2 fw-medium" style={{ fontSize: '0.8rem' }}>
                  ⚠️ {loginError}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-3 rounded-pill hover-scale fw-bold text-white shadow"
              disabled={loginLoading}
            >
              {loginLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Authorizing...
                </>
              ) : (
                'Sign In as Manager'
              )}
            </button>
          </form>

          {/* FOOTER SWITCH ACTIONS */}
          <div className="mt-4 pt-3 border-top text-center text-secondary small">
            {/* Theme Toggle Button */}
            <div className="mt-2 d-flex justify-content-center">
              <button 
                type="button"
                className="btn btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-2 text-secondary"
                onClick={toggleTheme}
                style={{ fontSize: '0.8rem' }}
              >
                {theme === 'dark' ? (
                  <>
                    <FaSun className="text-warning" /> Light Mode
                  </>
                ) : (
                  <>
                    <FaMoon className="text-primary" /> Dark Mode
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ManagerLogin;
