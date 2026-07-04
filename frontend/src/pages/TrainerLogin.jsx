import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useApp, api } from '../context/AppContext';
import { 
  FaUser, FaLock, FaSun, FaMoon, FaEnvelope, 
  FaCheckCircle, FaExclamationTriangle, FaArrowLeft,
  FaEye, FaEyeSlash
} from 'react-icons/fa';

const TrainerLogin = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme, login, isAuthenticated, userRole, showToast } = useApp();

  // Mode state: 'login' or 'register'
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Registration form state
  const [regTrainerName, setRegTrainerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Email verification simulator state
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCodeSent, setForgotCodeSent] = useState(false);
  const [forgotEnteredCode, setForgotEnteredCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotResetLoading, setForgotResetLoading] = useState(false);

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
        if (role === 'trainer') {
          navigate('/trainer-dashboard');
        } else {
          setLoginError(`Account role mismatch. This username belongs to a ${role}.`);
          showToast(`Access denied: Please log in using the correct portal.`, 'error');
        }
      } else {
        setLoginError('Invalid username or password.');
      }
    } catch (err) {
      setLoginLoading(false);
      setLoginError(err.response?.data?.message || 'Invalid username or password.');
    }
  };

  // Handle email verification code generation from backend
  const handleSendVerificationCode = async () => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!regEmail.trim() || !emailRegex.test(regEmail.trim())) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    try {
      const response = await api.post('/auth/send-otp', { email: regEmail.trim() });
      if (response.data.success) {
        setCodeSent(true);
        if (response.data.mock && response.data.code) {
          setVerificationCode(response.data.code);
          setEnteredCode(response.data.code); // Auto-fill mock code for local testing
          showToast(`[Mock Mode] Code: ${response.data.code}`, 'info');
        } else {
          setVerificationCode('');
          setEnteredCode('');
          showToast(`Verification code sent to ${regEmail}!`, 'success');
        }
      } else {
        showToast(response.data.message || 'Failed to send verification code.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Error requesting verification code.', 'error');
    }
  };

  // Verify code via backend
  const handleVerifyCode = async () => {
    if (!enteredCode.trim()) {
      showToast('Please enter the verification code.', 'error');
      return;
    }

    try {
      const response = await api.post('/auth/verify-otp', {
        email: regEmail.trim(),
        code: enteredCode.trim()
      });
      if (response.data.success) {
        setEmailVerified(true);
        showToast('Email verified successfully!', 'success');
      } else {
        showToast(response.data.message || 'Invalid verification code.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Invalid verification code.', 'error');
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!regTrainerName.trim() || !regEmail.trim() || !regUsername.trim() || !regPassword.trim()) {
      showToast('All fields are required.', 'error');
      return;
    }

    if (!emailVerified) {
      showToast('Please verify your email address first.', 'error');
      return;
    }

    // Verify password complexity requirements
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(regPassword)) {
      showToast('Password must meet all complexity requirements.', 'error');
      return;
    }

    setRegLoading(true);

    try {
      const response = await api.post('/auth/register', {
        username: regUsername.trim(),
        email: regEmail.trim(),
        trainerName: regTrainerName.trim(),
        password: regPassword
      });

      if (response.data.success) {
        const generatedId = response.data.user.employeeId;
        showToast(`Trainer ID: ${generatedId}. Pending administrator approval before login.`, 'success');
        
        // Auto-switch to login
        setLoginUsername(regUsername.trim());
        setLoginPassword('');
        setMode('login');

        // Reset registration fields
        setRegTrainerName('');
        setRegEmail('');
        setRegUsername('');
        setRegPassword('');
        setCodeSent(false);
        setVerificationCode('');
        setEnteredCode('');
        setEmailVerified(false);
      }
    } catch (error) {
      console.error('Registration Error:', error);
      const errMsg = error.response?.data?.message || 'Registration failed.';
      showToast(errMsg, 'error');
    } finally {
      setRegLoading(false);
    }
  };

  // Send Forgot Password OTP
  const handleSendForgotOtp = async () => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!forgotEmail.trim() || !emailRegex.test(forgotEmail.trim())) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    try {
      const response = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      if (response.data.success) {
        setForgotCodeSent(true);
        if (response.data.mock && response.data.code) {
          setForgotCode(response.data.code);
          setForgotEnteredCode(response.data.code); // Auto-fill code in mock delivery
          showToast(`[Mock Mode] Reset code: ${response.data.code}`, 'info');
        } else {
          setForgotCode('');
          setForgotEnteredCode('');
          showToast(`Password reset code sent to ${forgotEmail}!`, 'success');
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Error requesting reset code.', 'error');
    }
  };

  // Submit Password Reset
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();

    if (!forgotEmail.trim() || !forgotEnteredCode.trim() || !forgotNewPassword.trim()) {
      showToast('All fields are required.', 'error');
      return;
    }

    // Verify password complexity requirements
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(forgotNewPassword)) {
      showToast('New password must meet all complexity requirements.', 'error');
      return;
    }

    setForgotResetLoading(true);

    try {
      const response = await api.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        code: forgotEnteredCode.trim(),
        newPassword: forgotNewPassword
      });

      if (response.data.success) {
        showToast('Password reset successfully! Please sign in with your new password.', 'success');
        setLoginUsername('');
        setLoginPassword('');
        setMode('login');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Password reset failed.', 'error');
    } finally {
      setForgotResetLoading(false);
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
          <div className="text-center mb-3">
            <div className="d-inline-flex bg-white p-2 rounded-3 shadow-sm mb-3 border">
              <img src="/logo.png" alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
            </div>
            <h2 className="fw-extrabold text-primary-theme h4 mb-1">
              {mode === 'login' ? 'Trainer Login' : mode === 'register' ? 'Trainer Registration' : 'Reset Password'}
            </h2>
            <p className="text-secondary small">Authorization credentials are required to continue</p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="d-flex p-1 bg-light rounded-pill border mb-4 position-relative" style={{ maxWidth: '280px', margin: '0 auto' }}>
            <button
              type="button"
              className={`btn btn-sm flex-fill rounded-pill py-2 fw-bold transition-all border-0 ${mode === 'login' ? 'btn-primary shadow-sm text-white' : 'btn-light text-secondary'}`}
              onClick={() => {
                setMode('login');
                setShowPassword(false);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`btn btn-sm flex-fill rounded-pill py-2 fw-bold transition-all border-0 ${mode === 'register' ? 'btn-primary shadow-sm text-white' : 'btn-light text-secondary'}`}
              onClick={() => {
                setMode('register');
                setShowPassword(false);
              }}
            >
              Register
            </button>
          </div>

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit}>
              {/* Username */}
              <div className="mb-3 text-start">
                <label className="form-label fw-semibold text-secondary small">Trainer Username</label>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0">
                    <FaUser className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Enter trainer username"
                    value={loginUsername}
                    onChange={(e) => {
                      setLoginUsername(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    required
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
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <div>
                    {loginError && (
                      <div className="text-danger fw-medium" style={{ fontSize: '0.8rem' }}>
                        ⚠️ {loginError}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold text-primary"
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => {
                      setMode('forgot');
                      setForgotEmail('');
                      setForgotCodeSent(false);
                      setForgotEnteredCode('');
                      setForgotNewPassword('');
                      setForgotCode('');
                      setShowPassword(false);
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
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
                  'Sign In as Trainer'
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit}>
              <div className="mb-3 text-start">
                <label className="form-label fw-semibold text-secondary small">Email Address *</label>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0">
                    <FaEnvelope className="text-muted" />
                  </span>
                  <input
                    type="email"
                    className="form-control border-start-0"
                    placeholder="Enter registered email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotCodeSent) {
                        setForgotCodeSent(false);
                        setForgotCode('');
                      }
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    style={{ borderRadius: '0 12px 12px 0' }}
                    onClick={handleSendForgotOtp}
                    disabled={!forgotEmail.trim()}
                  >
                    {forgotCodeSent ? 'Resend' : 'Send'}
                  </button>
                </div>
              </div>

              {forgotCodeSent && (
                <>
                  {/* Verification Code */}
                  <div className="mb-3 text-start bg-light-subtle border rounded-3 p-3 text-center">
                    <small className="d-block text-secondary fw-semibold mb-2">Enter 4-Digit Reset Code</small>
                    <div className="d-flex gap-2 justify-content-center">
                      <input
                        type="text"
                        maxLength="4"
                        className="form-control font-monospace text-center fw-bold"
                        style={{ letterSpacing: '4px', maxWidth: '120px' }}
                        placeholder="0000"
                        value={forgotEnteredCode}
                        onChange={(e) => setForgotEnteredCode(e.target.value)}
                        required
                      />
                    </div>
                    {forgotCode && (
                      <small className="text-primary d-block mt-2 fw-semibold" style={{ fontSize: '0.8rem' }}>
                        [Simulated Email] Reset Code is: <span className="text-decoration-underline font-monospace fw-bold">{forgotCode}</span> (Auto-filled)
                      </small>
                    )}
                  </div>

                  {/* New Password */}
                  <div className="mb-3 text-start">
                    <label className="form-label fw-semibold text-secondary small">New Password *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-transparent border-end-0">
                        <FaLock className="text-muted" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control border-start-0 border-end-0"
                        placeholder="Min 8 characters"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        required
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
                  </div>

                  {/* Complexity Checklist */}
                  {forgotNewPassword.length > 0 && (
                    <div className="p-3 bg-light rounded-3 mb-3 border text-start">
                      <small className="d-block text-secondary fw-semibold mb-2" style={{ fontSize: '0.75rem' }}>Password Complexity Checklist:</small>
                      <ul className="list-unstyled mb-0 d-flex flex-column gap-1" style={{ fontSize: '0.75rem' }}>
                        <li className={forgotNewPassword.length >= 8 ? "text-success d-flex align-items-center gap-1.5 fw-medium" : "text-muted d-flex align-items-center gap-1.5"}>
                          {forgotNewPassword.length >= 8 ? "✅" : "⭕"} Min 8 characters
                        </li>
                        <li className={/[A-Z]/.test(forgotNewPassword) ? "text-success d-flex align-items-center gap-1.5 fw-medium" : "text-muted d-flex align-items-center gap-1.5"}>
                          {/[A-Z]/.test(forgotNewPassword) ? "✅" : "⭕"} At least 1 uppercase letter (A-Z)
                        </li>
                        <li className={/[a-z]/.test(forgotNewPassword) ? "text-success d-flex align-items-center gap-1.5 fw-medium" : "text-muted d-flex align-items-center gap-1.5"}>
                          {/[a-z]/.test(forgotNewPassword) ? "✅" : "⭕"} At least 1 lowercase letter (a-z)
                        </li>
                        <li className={/[0-9]/.test(forgotNewPassword) ? "text-success d-flex align-items-center gap-1.5 fw-medium" : "text-muted d-flex align-items-center gap-1.5"}>
                          {/[0-9]/.test(forgotNewPassword) ? "✅" : "⭕"} At least 1 number (0-9)
                        </li>
                        <li className={/[@$!%*?&]/.test(forgotNewPassword) ? "text-success d-flex align-items-center gap-1.5 fw-medium" : "text-muted d-flex align-items-center gap-1.5"}>
                          {/[@$!%*?&]/.test(forgotNewPassword) ? "✅" : "⭕"} At least 1 special character (@$!%*?&)
                        </li>
                      </ul>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-3 rounded-pill hover-scale fw-bold text-white shadow"
                    disabled={forgotResetLoading}
                  >
                    {forgotResetLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Resetting Password...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </>
              )}
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit}>
              {/* Full Name */}
              <div className="mb-3 text-start">
                <label className="form-label fw-semibold text-secondary small">Full Name *</label>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0">
                    <FaUser className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Jane Miller"
                    value={regTrainerName}
                    onChange={(e) => setRegTrainerName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="mb-3 text-start">
                <label className="form-label fw-semibold text-secondary small">Email Address *</label>
                <div className="input-group mb-2">
                  <span className="input-group-text bg-transparent border-end-0">
                    <FaEnvelope className="text-muted" />
                  </span>
                  <input
                    type="email"
                    className="form-control border-start-0"
                    placeholder="name@institute.com"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (emailVerified) setEmailVerified(false);
                      if (codeSent) setCodeSent(false);
                    }}
                    disabled={emailVerified}
                    required
                  />
                  {!emailVerified && (
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      style={{ borderRadius: '0 12px 12px 0' }}
                      onClick={handleSendVerificationCode}
                      disabled={!regEmail.trim()}
                    >
                      {codeSent ? 'Resend' : 'Send'}
                    </button>
                  )}
                </div>

                {codeSent && !emailVerified && (
                  <div className="p-3 bg-light-subtle border rounded-3 mb-2 text-center">
                    <small className="d-block text-secondary fw-semibold mb-2">Enter 4-Digit Code</small>
                    <div className="d-flex gap-2 justify-content-center">
                      <input
                        type="text"
                        maxLength="4"
                        className="form-control font-monospace text-center fw-bold"
                        style={{ letterSpacing: '4px', maxWidth: '120px' }}
                        placeholder="0000"
                        value={enteredCode}
                        onChange={(e) => setEnteredCode(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-success px-3"
                        onClick={handleVerifyCode}
                        disabled={enteredCode.length !== 4}
                      >
                        Verify
                      </button>
                    </div>
                    {verificationCode && (
                      <small className="text-primary d-block mt-2 fw-semibold" style={{ fontSize: '0.8rem' }}>
                        [Simulated Email] Verification Code is: <span className="text-decoration-underline font-monospace fw-bold">{verificationCode}</span> (Auto-filled)
                      </small>
                    )}
                  </div>
                )}

                {emailVerified && (
                  <div className="text-success fw-semibold d-flex align-items-center gap-1 mt-1" style={{ fontSize: '0.8rem' }}>
                    <FaCheckCircle /> Email verified!
                  </div>
                )}
              </div>

              {/* Username */}
              <div className="mb-3 text-start">
                <label className="form-label fw-semibold text-secondary small">Username *</label>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0">
                    <FaUser className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Choose username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase())}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-4 text-start">
                <label className="form-label fw-semibold text-secondary small">Password *</label>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0">
                    <FaLock className="text-muted" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border-start-0 border-end-0"
                    placeholder="Min 8 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
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
              </div>

              {regPassword.length > 0 && (
                <div className="p-3 bg-light rounded-3 mb-3 border text-start">
                  <small className="d-block text-secondary fw-semibold mb-2" style={{ fontSize: '0.75rem' }}>Password Complexity Checklist:</small>
                  <ul className="list-unstyled mb-0 d-flex flex-column gap-1" style={{ fontSize: '0.75rem' }}>
                    <li className={regPassword.length >= 8 ? "text-success d-flex align-items-center gap-1.5 fw-medium" : "text-muted d-flex align-items-center gap-1.5"}>
                      {regPassword.length >= 8 ? "✅" : "⭕"} Min 8 characters
                    </li>
                    <li className={/[A-Z]/.test(regPassword) ? "text-success d-flex align-items-center gap-1.5 fw-medium" : "text-muted d-flex align-items-center gap-1.5"}>
                      {/[A-Z]/.test(regPassword) ? "✅" : "⭕"} At least 1 uppercase letter (A-Z)
                    </li>
                    <li className={/[a-z]/.test(regPassword) ? "text-success d-flex align-items-center gap-1.5 fw-medium" : "text-muted d-flex align-items-center gap-1.5"}>
                      {/[a-z]/.test(regPassword) ? "✅" : "⭕"} At least 1 lowercase letter (a-z)
                    </li>
                    <li className={/[0-9]/.test(regPassword) ? "text-success d-flex align-items-center gap-1.5 fw-medium" : "text-muted d-flex align-items-center gap-1.5"}>
                      {/[0-9]/.test(regPassword) ? "✅" : "⭕"} At least 1 number (0-9)
                    </li>
                    <li className={/[@$!%*?&]/.test(regPassword) ? "text-success d-flex align-items-center gap-1.5 fw-medium" : "text-muted d-flex align-items-center gap-1.5"}>
                      {/[@$!%*?&]/.test(regPassword) ? "✅" : "⭕"} At least 1 special character (@$!%*?&)
                    </li>
                  </ul>
                </div>
              )}

              {!emailVerified && (
                <div className="alert alert-info border-0 p-2.5 d-flex align-items-center gap-2 mb-3" style={{ fontSize: '0.75rem', borderRadius: '12px' }}>
                  <FaExclamationTriangle className="text-primary" />
                  <span>Email verification is required to register.</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-success w-100 py-3 rounded-pill hover-scale fw-bold"
                disabled={regLoading || !emailVerified}
              >
                {regLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creating Account...
                  </>
                ) : (
                  'Register Trainer Account'
                )}
              </button>
            </form>
          )}

          {/* FOOTER SWITCH ACTIONS */}
          <div className="mt-4 pt-3 border-top text-center text-secondary small">
            {mode === 'forgot' ? (
              <div>
                Remember your password?{' '}
                <button 
                  type="button" 
                  className="btn btn-link p-0 text-decoration-none fw-bold"
                  onClick={() => {
                    setMode('login');
                    setShowPassword(false);
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            ) : mode === 'login' ? (
              <div>
                Don't have an account?{' '}
                <button 
                  type="button" 
                  className="btn btn-link p-0 text-decoration-none fw-bold"
                  onClick={() => {
                    setMode('register');
                    setShowPassword(false);
                  }}
                >
                  Register as Trainer
                  </button>
              </div>
            ) : (
              <div>
                Already registered?{' '}
                <button 
                  type="button" 
                  className="btn btn-link p-0 text-decoration-none fw-bold"
                  onClick={() => {
                    setMode('login');
                    setShowPassword(false);
                  }}
                >
                  Login here
                </button>
              </div>
            )}
            
            {/* Theme Toggle Button */}
            <div className="mt-3 d-flex justify-content-center">
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

export default TrainerLogin;
