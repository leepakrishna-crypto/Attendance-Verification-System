const mongoose = require('mongoose');

const TrainerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID reference is required']
  },
  trainerName: {
    type: String,
    required: [true, 'Trainer name is required'],
    trim: true
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    trim: true
  },
  collegeName: {
    type: String,
    required: [true, 'College name is required'],
    trim: true
  },
  collegeCity: {
    type: String,
    required: [true, 'College city is required'],
    trim: true
  },
  collegeAddress: {
    type: String,
    required: [true, 'College address is required'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Subject/Course taken is required'],
    trim: true
  },
  trainingDate: {
    type: String,
    required: [true, 'Training date is required']
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required']
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required']
  },
  locationAddress: {
    type: String,
    required: [true, 'Location address is required'],
    trim: true
  },
  entryTime: {
    type: String,
    required: [true, 'Entry time is required']
  },
  exitTime: {
    type: String,
    required: [true, 'Exit time is required']
  },
  workingHours: {
    type: String,
    required: [true, 'Working hours is required']
  },
  workingHoursMinutes: {
    type: Number,
    required: true,
    default: 0
  },
  classHours: {
    type: String,
    required: [true, 'Scheduled class hours is required']
  },
  classHoursMinutes: {
    type: Number,
    required: [true, 'Scheduled class minutes is required'],
    default: 0
  },
  scheduledStartTime: {
    type: String,
    required: [true, 'Scheduled start time is required']
  },
  scheduledEndTime: {
    type: String,
    required: [true, 'Scheduled end time is required']
  },
  proof1Status: {
    type: String,
    enum: ['On-Time', 'Late', 'Missing', 'Pending'],
    default: 'Pending'
  },
  proof1ExpectedWindow: {
    type: String
  },
  proof1ActualTime: {
    type: String
  },
  proof1DelayMinutes: {
    type: Number,
    default: 0
  },
  proof2Status: {
    type: String,
    enum: ['On-Time', 'Late', 'Missing', 'Pending'],
    default: 'Pending'
  },
  proof2ExpectedWindow: {
    type: String
  },
  proof2ActualTime: {
    type: String
  },
  proof2DelayMinutes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Verified', 'Flagged', 'Rejected'],
    default: 'Verified'
  },
  statusMessage: {
    type: String,
    default: 'All checks passed.'
  },
  proof1Missing: {
    type: Boolean,
    default: false
  },
  proof2Missing: {
    type: Boolean,
    default: false
  },
  isDuplicatePhoto: {
    type: Boolean,
    default: false
  },
  isLocationMismatch: {
    type: Boolean,
    default: false
  },
  entryPhotoHash: {
    type: String,
    index: true
  },
  proof1PhotoHash: {
    type: String,
    index: true
  },
  proof2PhotoHash: {
    type: String,
    index: true
  },
  exitPhotoHash: {
    type: String,
    index: true
  },
  entryPhoto: {
    type: String,
    required: [true, 'Entry GeoTag photo is required']
  },
  proof1Photo: {
    type: String  // Optional — missing proof is flagged for admin review
  },
  proof2Photo: {
    type: String  // Optional — missing proof is flagged for admin review
  },
  exitPhoto: {
    type: String,
    required: [true, 'Exit GeoTag photo is required']
  },
  comments: [
    {
      author: { type: String, required: true },
      role: { type: String, enum: ['manager', 'trainer'], required: true },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Trainer', TrainerSchema);
