const User = require('../models/User');
const jwt = require('jsonwebtoken');
const VerificationCode = require('../models/VerificationCode');
const emailService = require('../utils/emailService');

// Helper to generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'trainer_geotag_secret_key_2026', {
    expiresIn: '30d'
  });
};

// 1. Register Trainer (with simulated email check & unique sequence ID generation)
exports.registerTrainer = async (req, res) => {
  try {
    const { username, email, trainerName, password } = req.body;

    if (!username || !email || !trainerName || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all registration fields.' });
    }

    // Verify password complexity requirements
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify email structure
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Check username duplicate
    const userExists = await User.findOne({ username: username.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }

    // Check email duplicate (Strictly enforce one email per user account)
    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email address is already registered to another user.' });
    }

    // Generate next sequential TRN-XXXXX ID
    const lastUser = await User.findOne({ employeeId: /^TRN-/ }).sort({ createdAt: -1 });
    let nextNum = 1;
    if (lastUser && lastUser.employeeId) {
      const match = lastUser.employeeId.match(/TRN-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const employeeId = `TRN-${String(nextNum).padStart(5, '0')}`;

    // Create trainer user profile
    const newUser = new User({
      username: username.toLowerCase().trim(),
      email: normalizedEmail,
      trainerName: trainerName.trim(),
      password,
      employeeId,
      role: 'trainer'
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: `Trainer registered successfully! Your unique User ID is ${employeeId}.`,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        trainerName: newUser.trainerName,
        employeeId: newUser.employeeId,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 2. User Login (Trainer and Manager)
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both username and password.' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isApproved) {
      return res.status(403).json({ success: false, message: 'Your account is pending administrator approval.' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        trainerName: user.trainerName || '',
        employeeId: user.employeeId || '',
        email: user.email || ''
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 3. Get Current Auth User Info
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 4. Get all Trainers (Manager only)
exports.getTrainers = async (req, res) => {
  try {
    const trainers = await User.find({ role: 'trainer' }).select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: trainers
    });
  } catch (error) {
    console.error('Get Trainers Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 5. Delete Trainer account (Manager only)
exports.deleteTrainer = async (req, res) => {
  try {
    const trainer = await User.findById(req.params.id);
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found.' });
    }
    if (trainer.role !== 'trainer') {
      return res.status(400).json({ success: false, message: 'Cannot delete accounts that are not trainers.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Trainer account removed successfully.'
    });
  } catch (error) {
    console.error('Delete Trainer Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 6. Approve Trainer account (Manager only)
exports.approveTrainer = async (req, res) => {
  try {
    const trainer = await User.findById(req.params.id);
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found.' });
    }
    if (trainer.role !== 'trainer') {
      return res.status(400).json({ success: false, message: 'Only trainer accounts can be approved.' });
    }
    trainer.isApproved = true;
    await trainer.save();
    res.status(200).json({
      success: true,
      message: 'Trainer account approved successfully.',
      data: trainer
    });
  } catch (error) {
    console.error('Approve Trainer Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 7. Send OTP code for registration
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email pattern
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Check if the email is already registered in User model
    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email address is already registered to another user.' });
    }

    // Generate a random 4-digit code
    const otpCode = String(Math.floor(1000 + Math.random() * 9000));

    // Clear any previous codes for this email
    await VerificationCode.deleteMany({ email: normalizedEmail });

    // Save the code to VerificationCode
    const verification = new VerificationCode({
      email: normalizedEmail,
      code: otpCode
    });
    await verification.save();

    // Send the email via emailService
    const result = await emailService.sendOtpEmail(normalizedEmail, otpCode);

    res.status(200).json({
      success: true,
      message: result.mock
        ? 'Verification code generated (Mock Delivery).'
        : `Verification code successfully sent to ${normalizedEmail}.`,
      mock: result.mock,
      code: result.mock ? otpCode : undefined
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 8. Verify OTP code
exports.verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Please provide both email and verification code.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const verification = await VerificationCode.findOne({ email: normalizedEmail });

    if (!verification) {
      return res.status(400).json({ success: false, message: 'Verification code expired or not found. Please request a new one.' });
    }

    if (verification.code !== code.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    // If matches, delete the code so it cannot be reused
    await VerificationCode.deleteMany({ email: normalizedEmail });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!'
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 9. Forgot Password - Send OTP
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists with this email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account registered with this email address.' });
    }

    // Only allow trainer role to use this endpoint
    if (user.role !== 'trainer') {
      return res.status(403).json({ success: false, message: 'Password reset is only supported for Trainer accounts.' });
    }

    // Only allow approved trainers to reset password
    if (!user.isApproved) {
      return res.status(403).json({ success: false, message: 'Your account is pending administrator approval. Password reset is not allowed.' });
    }

    // Generate random 4-digit code
    const otpCode = String(Math.floor(1000 + Math.random() * 9000));

    // Clear any previous codes
    await VerificationCode.deleteMany({ email: normalizedEmail });

    // Save code to DB
    const verification = new VerificationCode({
      email: normalizedEmail,
      code: otpCode
    });
    await verification.save();

    // Send email using new custom reset email helper
    const result = await emailService.sendPasswordResetOtpEmail(normalizedEmail, otpCode);

    res.status(200).json({
      success: true,
      message: result.mock
        ? 'Password reset code generated (Mock Delivery).'
        : `Password reset code sent to ${normalizedEmail}.`,
      mock: result.mock,
      code: result.mock ? otpCode : undefined
    });
  } catch (error) {
    console.error('Forgot Password OTP Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 10. Reset Password with OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide email, verification code, and new password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP code
    const verification = await VerificationCode.findOne({ email: normalizedEmail });
    if (!verification) {
      return res.status(400).json({ success: false, message: 'Verification code expired or not found. Please request a new one.' });
    }

    if (verification.code !== code.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    // Password complexity check
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).'
      });
    }

    // Find the user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Only allow approved trainers to reset password
    if (!user.isApproved) {
      return res.status(403).json({ success: false, message: 'Your account is pending administrator approval. Password reset is not allowed.' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Delete verification codes
    await VerificationCode.deleteMany({ email: normalizedEmail });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};



