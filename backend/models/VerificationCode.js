const mongoose = require('mongoose');

const VerificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  code: {
    type: String,
    required: [true, 'Verification code is required']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Automatically deletes the document from MongoDB after 10 minutes (600 seconds)
  }
});

module.exports = mongoose.model('VerificationCode', VerificationCodeSchema);
