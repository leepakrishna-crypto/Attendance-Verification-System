const Trainer = require('../models/Trainer');
const User = require('../models/User');
const fs = require('fs');
const crypto = require('crypto');

// Helper to compute SHA-256 hash of a file
function getFileHash(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// Helper to parse HH:MM to minutes
const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Helper to parse HH:MM and calculate working hours
function calculateWorkingHours(entry, exit) {
  const [entryHrs, entryMins] = entry.split(':').map(Number);
  const [exitHrs, exitMins] = exit.split(':').map(Number);
  
  const entryTotalMins = entryHrs * 60 + entryMins;
  const exitTotalMins = exitHrs * 60 + exitMins;
  
  if (exitTotalMins < entryTotalMins) {
    throw new Error('Exit time cannot be earlier than Entry time.');
  }
  
  const diffMins = exitTotalMins - entryTotalMins;
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  const hrStr = hrs === 1 ? 'Hour' : 'Hours';
  const minStr = mins === 1 ? 'Minute' : 'Minutes';
  
  return {
    formatted: `Worked ${hrs} ${hrStr} ${mins} ${minStr}`,
    minutes: diffMins
  };
}

const hasNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

const hasFiniteNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue);
};

// 1. Submit Record (Trainer) - Warning Flag Save Mode
exports.submitRecord = async (req, res) => {
  try {
    const {
      trainerName,
      employeeId,
      collegeName,
      collegeCity,
      collegeAddress,
      subject,
      trainingDate,
      entryTime,
      exitTime,
      latitude,
      longitude,
      locationAddress,
      classHours,
      classHoursMinutes,
      scheduledStartTime,
      scheduledEndTime,
      proof1Status,
      proof1ExpectedWindow,
      proof1ActualTime,
      proof1DelayMinutes,
      proof2Status,
      proof2ExpectedWindow,
      proof2ActualTime,
      proof2DelayMinutes
    } = req.body;

    const cleanAllFiles = () => {
      if (req.files) {
        if (req.files.entryPhoto) { try { fs.unlinkSync(req.files.entryPhoto[0].path); } catch(e){} }
        if (req.files.proof1Photo) { try { fs.unlinkSync(req.files.proof1Photo[0].path); } catch(e){} }
        if (req.files.proof2Photo) { try { fs.unlinkSync(req.files.proof2Photo[0].path); } catch(e){} }
        if (req.files.exitPhoto) { try { fs.unlinkSync(req.files.exitPhoto[0].path); } catch(e){} }
      }
    };

    // Strict validation for required fields
    const hasRequiredFields = (
      hasNonEmptyString(trainerName) &&
      hasNonEmptyString(employeeId) &&
      hasNonEmptyString(collegeName) &&
      hasNonEmptyString(collegeCity) &&
      hasNonEmptyString(collegeAddress) &&
      hasNonEmptyString(subject) &&
      hasNonEmptyString(trainingDate) &&
      hasNonEmptyString(entryTime) &&
      hasNonEmptyString(exitTime) &&
      hasFiniteNumber(latitude) &&
      hasFiniteNumber(longitude) &&
      hasNonEmptyString(locationAddress) &&
      hasNonEmptyString(classHours) &&
      hasFiniteNumber(classHoursMinutes) &&
      hasNonEmptyString(scheduledStartTime) &&
      hasNonEmptyString(scheduledEndTime)
    );

    if (!hasRequiredFields) {
      cleanAllFiles();
      return res.status(400).json({ success: false, message: 'All required fields must be provided.' });
    }

    if (!req.files || !req.files.entryPhoto || !req.files.exitPhoto) {
      cleanAllFiles();
      return res.status(400).json({ success: false, message: 'Entry and Exit GeoTag photos are required.' });
    }

    // Detect missing optional proof photos
    const proof1Missing = !req.files.proof1Photo;
    const proof2Missing = !req.files.proof2Photo;

    // 1. Time Overlap Detection
    const existingRecords = await Trainer.find({ userId: req.user._id, trainingDate });
    const newStart = timeToMins(entryTime);
    const newEnd = timeToMins(exitTime);
    let overlappingRecord = null;

    for (const record of existingRecords) {
      if (record.status === 'Rejected') continue; // Skip rejected records for time conflict check
      const start = timeToMins(record.entryTime);
      const end = timeToMins(record.exitTime);
      if (newStart < end && newEnd > start) {
        overlappingRecord = record;
        break;
      }
    }

    // 2. Photo Duplicate Check (only on photos that exist)
    const entryPhotoHash = getFileHash(req.files.entryPhoto[0].path);
    const proof1PhotoHash = proof1Missing ? null : getFileHash(req.files.proof1Photo[0].path);
    const proof2PhotoHash = proof2Missing ? null : getFileHash(req.files.proof2Photo[0].path);
    const exitPhotoHash = getFileHash(req.files.exitPhoto[0].path);

    let isDuplicatePhoto = false;
    const currentHashes = [entryPhotoHash, exitPhotoHash, proof1PhotoHash, proof2PhotoHash].filter(Boolean);
    
    // Check duplicates within the current request
    const uniqueHashes = new Set(currentHashes);
    if (uniqueHashes.size < currentHashes.length) {
      isDuplicatePhoto = true;
    } else {
      const duplicate = await Trainer.findOne({
        $or: [
          { entryPhotoHash: { $in: currentHashes } },
          { proof1PhotoHash: { $in: currentHashes } },
          { proof2PhotoHash: { $in: currentHashes } },
          { exitPhotoHash: { $in: currentHashes } }
        ]
      });
      if (duplicate) {
        isDuplicatePhoto = true;
      }
    }

    let status = 'Verified';
    let statusMessages = [];

    if (overlappingRecord) {
      status = 'Flagged';
      statusMessages.push(
        `Time conflict detected: Another session already exists for this date between ${overlappingRecord.entryTime} and ${overlappingRecord.exitTime}.`
      );
    }

    if (isDuplicatePhoto) {
      status = 'Flagged';
      statusMessages.push('Duplicate Photo: The uploaded image matches another session photo in the system.');
    }

    // Location Mismatch check
    let isLocationMismatch = false;
    if (collegeCity && locationAddress) {
      const normalize = (str) => {
        return str
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .replace('bengaluru', 'bangalore');
      };

      const normalizedCollegeCity = normalize(collegeCity);
      const normalizedGpsAddress = normalize(locationAddress);

      if (!normalizedGpsAddress.includes(normalizedCollegeCity)) {
        isLocationMismatch = true;
        status = 'Flagged';
        statusMessages.push(`Location Mismatch: Geotag location does not match college city (${collegeCity}).`);
      }
    }



    // Working hours calculations
    let hoursResult;
    try {
      hoursResult = calculateWorkingHours(entryTime, exitTime);
    } catch (err) {
      cleanAllFiles();
      return res.status(400).json({ success: false, message: err.message });
    }

    // Duration match check
    const expectedMinutes = Number(classHoursMinutes);
    if (hoursResult.minutes < expectedMinutes) {
      status = 'Flagged';
      statusMessages.push(`Insufficient Duration: GeoTags interval (${hoursResult.formatted}) is less than scheduled Class Hours (${classHours}).`);
    }

    if (proof1Status === 'Late') {
      status = 'Flagged';
      statusMessages.push(`Late Verification: Proof 1 (Entry) submitted ${proof1DelayMinutes} minutes late.`);
    }

    if (proof2Status === 'Late') {
      status = 'Flagged';
      statusMessages.push(`Late Verification: Proof 2 (Exit) submitted ${proof2DelayMinutes} minutes late.`);
    }

    if (proof1Missing) {
      status = 'Flagged';
      statusMessages.push('Missing Proof 1: Proof of Entry photo was not captured. Flagged for admin review.');
    }

    if (proof2Missing) {
      status = 'Flagged';
      statusMessages.push('Missing Proof 2: Proof of Exit photo was not captured. Flagged for admin review.');
    }

    const entryPhotoPath = `/uploads/${req.files.entryPhoto[0].filename}`;
    const proof1PhotoPath = proof1Missing ? null : `/uploads/${req.files.proof1Photo[0].filename}`;
    const proof2PhotoPath = proof2Missing ? null : `/uploads/${req.files.proof2Photo[0].filename}`;
    const exitPhotoPath = `/uploads/${req.files.exitPhoto[0].filename}`;

    const newRecord = new Trainer({
      userId: req.user._id,
      trainerName,
      employeeId,
      collegeName,
      collegeCity,
      collegeAddress,
      subject,
      trainingDate,
      entryTime,
      exitTime,
      workingHours: hoursResult.formatted,
      workingHoursMinutes: hoursResult.minutes,
      classHours,
      classHoursMinutes: expectedMinutes,
      scheduledStartTime,
      scheduledEndTime,
      proof1Status: proof1Missing ? 'Missing' : proof1Status,
      proof1ExpectedWindow,
      proof1ActualTime,
      proof1DelayMinutes: proof1DelayMinutes ? Number(proof1DelayMinutes) : 0,
      proof2Status: proof2Missing ? 'Missing' : proof2Status,
      proof2ExpectedWindow,
      proof2ActualTime,
      proof2DelayMinutes: proof2DelayMinutes ? Number(proof2DelayMinutes) : 0,
      proof1Missing,
      proof2Missing,
      latitude: Number(latitude),
      longitude: Number(longitude),
      locationAddress,
      status,
      statusMessage: statusMessages.length > 0 ? statusMessages.join(' | ') : 'All checks passed.',
      isDuplicatePhoto,
      isLocationMismatch,
      entryPhotoHash,
      proof1PhotoHash,
      proof2PhotoHash,
      exitPhotoHash,
      entryPhoto: entryPhotoPath,
      proof1Photo: proof1PhotoPath,
      proof2Photo: proof2PhotoPath,
      exitPhoto: exitPhotoPath
    });

    await newRecord.save();

    res.status(201).json({
      success: true,
      message: status === 'Flagged' 
        ? 'Record saved with warnings. Pending administrator review.' 
        : 'Attendance record submitted successfully!',
      data: newRecord
    });
  } catch (error) {
    console.error('Error submitting record:', error);
    // clean files
    if (req.files) {
      if (req.files.entryPhoto) { try { fs.unlinkSync(req.files.entryPhoto[0].path); } catch(e){} }
      if (req.files.proof1Photo) { try { fs.unlinkSync(req.files.proof1Photo[0].path); } catch(e){} }
      if (req.files.proof2Photo) { try { fs.unlinkSync(req.files.proof2Photo[0].path); } catch(e){} }
      if (req.files.exitPhoto) { try { fs.unlinkSync(req.files.exitPhoto[0].path); } catch(e){} }
    }
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 2. Get All Records (Manager & Scoped Trainer history)
exports.getRecords = async (req, res) => {
  try {
    const { search, collegeName, employeeId, date, location, status, filter, sort, page = 1, limit = 10 } = req.query;

    const query = {};

    // 🔒 Security boundary check:
    // If user is a trainer, strictly scope results to their own userId.
    if (req.user.role === 'trainer') {
      query.userId = req.user._id;
    } else {
      // Otherwise allow general admin querying filters
      if (employeeId) {
        query.employeeId = { $regex: employeeId, $options: 'i' };
      }
    }

    if (search) {
      query.trainerName = { $regex: search, $options: 'i' };
    }
    if (collegeName) {
      query.collegeName = { $regex: collegeName, $options: 'i' };
    }
    if (date) {
      query.trainingDate = date;
    }
    if (location) {
      query.$or = [
        { locationAddress: { $regex: location, $options: 'i' } },
        { collegeAddress: { $regex: location, $options: 'i' } },
        { collegeCity: { $regex: location, $options: 'i' } }
      ];
    }
    if (status) {
      query.status = status; // 'Verified' or 'Flagged'
    }

    // Timeframe filters
    if (filter) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (filter === 'today') {
        query.trainingDate = todayStr;
      } else if (filter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
        query.trainingDate = { $gte: oneWeekAgoStr, $lte: todayStr };
      } else if (filter === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];
        query.trainingDate = { $gte: oneMonthAgoStr, $lte: todayStr };
      }
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort) {
      switch (sort) {
        case 'oldest':
          sortOption = { createdAt: 1 };
          break;
        case 'workingHours':
          sortOption = { workingHoursMinutes: -1 };
          break;
        case 'trainerName':
          sortOption = { trainerName: 1 };
          break;
        case 'collegeName':
          sortOption = { collegeName: 1 };
          break;
        case 'newest':
        default:
          sortOption = { createdAt: -1 };
          break;
      }
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const totalRecords = await Trainer.countDocuments(query);
    const records = await Trainer.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: records,
      pagination: {
        totalRecords,
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / limit),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 3. Edit Record (Manager)
exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      trainerName,
      employeeId,
      collegeName,
      collegeCity,
      collegeAddress,
      subject,
      trainingDate,
      entryTime,
      exitTime,
      locationAddress,
      latitude,
      longitude,
      classHours,
      classHoursMinutes,
      scheduledStartTime,
      scheduledEndTime,
      proof1Status,
      proof1ExpectedWindow,
      proof1ActualTime,
      proof1DelayMinutes,
      proof2Status,
      proof2ExpectedWindow,
      proof2ActualTime,
      proof2DelayMinutes,
      status,
      statusMessage
    } = req.body;

    const record = await Trainer.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    // Update standard fields
    if (trainerName) record.trainerName = trainerName;
    if (employeeId) record.employeeId = employeeId;
    if (collegeName) record.collegeName = collegeName;
    if (collegeCity) record.collegeCity = collegeCity;
    if (collegeAddress) record.collegeAddress = collegeAddress;
    if (subject) record.subject = subject;
    if (trainingDate) record.trainingDate = trainingDate;
    if (locationAddress) record.locationAddress = locationAddress;
    if (latitude) record.latitude = Number(latitude);
    if (longitude) record.longitude = Number(longitude);
    if (classHours) record.classHours = classHours;
    if (classHoursMinutes) record.classHoursMinutes = Number(classHoursMinutes);
    if (scheduledStartTime) record.scheduledStartTime = scheduledStartTime;
    if (scheduledEndTime) record.scheduledEndTime = scheduledEndTime;
    if (proof1Status) record.proof1Status = proof1Status;
    if (proof1ExpectedWindow) record.proof1ExpectedWindow = proof1ExpectedWindow;
    if (proof1ActualTime) record.proof1ActualTime = proof1ActualTime;
    if (proof1DelayMinutes !== undefined) record.proof1DelayMinutes = Number(proof1DelayMinutes);
    if (proof2Status) record.proof2Status = proof2Status;
    if (proof2ExpectedWindow) record.proof2ExpectedWindow = proof2ExpectedWindow;
    if (proof2ActualTime) record.proof2ActualTime = proof2ActualTime;
    if (proof2DelayMinutes !== undefined) record.proof2DelayMinutes = Number(proof2DelayMinutes);

    // If manager explicitly sends status (e.g. approving a flagged record), respect it!
    if (status) {
      record.status = status;
      if (statusMessage) record.statusMessage = statusMessage;
    } else {
      // Otherwise, recalculate status after edit modifications
      let newStatus = 'Verified';
      let newStatusMessages = [];



      const activeEntryTime = entryTime || record.entryTime;
      const activeExitTime = exitTime || record.exitTime;
      const activeExpectedMin = classHoursMinutes !== undefined ? Number(classHoursMinutes) : record.classHoursMinutes;

      try {
        const hoursResult = calculateWorkingHours(activeEntryTime, activeExitTime);
        record.entryTime = activeEntryTime;
        record.exitTime = activeExitTime;
        record.workingHours = hoursResult.formatted;
        record.workingHoursMinutes = hoursResult.minutes;

        if (hoursResult.minutes < activeExpectedMin) {
          newStatus = 'Flagged';
          newStatusMessages.push(`Insufficient Duration: GeoTags interval (${hoursResult.formatted}) is less than scheduled Class Hours (${classHours || record.classHours}).`);
        }
      } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      record.status = newStatus;
      record.statusMessage = newStatusMessages.length > 0 ? newStatusMessages.join(' | ') : 'All checks passed.';
    }

    if (req.files) {
      if (req.files.entryPhoto) {
        record.entryPhoto = `/uploads/${req.files.entryPhoto[0].filename}`;
      }
      if (req.files.exitPhoto) {
        record.exitPhoto = `/uploads/${req.files.exitPhoto[0].filename}`;
      }
    }

    await record.save();

    res.status(200).json({
      success: true,
      message: 'Record updated successfully!',
      data: record
    });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 4. Delete Record (Manager)
exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await Trainer.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Record deleted successfully!'
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// 5. Get Statistics (Manager Dashboard)
exports.getStats = async (req, res) => {
  try {
    // Exclude rejected records from stats calculations
    const activeQuery = { status: { $ne: 'Rejected' } };

    const distinctTrainers = await Trainer.distinct('trainerName', activeQuery);
    const totalTrainers = distinctTrainers.length;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayVisits = await Trainer.countDocuments({ trainingDate: todayStr, ...activeQuery });

    // New metrics: total registered trainers and unique active trainers today
    const totalRegisteredTrainers = await User.countDocuments({ role: 'trainer' });
    const distinctTrainersToday = await Trainer.distinct('trainerName', { trainingDate: todayStr, ...activeQuery });
    const activeTrainersToday = distinctTrainersToday.length;

    const distinctColleges = await Trainer.distinct('collegeName', activeQuery);
    const totalColleges = distinctColleges.length;

    const completedTrainings = await Trainer.countDocuments(activeQuery);

    const avgResult = await Trainer.aggregate([
      {
        $match: activeQuery
      },
      {
        $group: {
          _id: null,
          avgMinutes: { $avg: '$workingHoursMinutes' }
        }
      }
    ]);

    let averageWorkingHours = '0 Hours 0 Minutes';
    if (avgResult.length > 0) {
      const avgMinutesTotal = Math.round(avgResult[0].avgMinutes);
      const hrs = Math.floor(avgMinutesTotal / 60);
      const mins = avgMinutesTotal % 60;
      
      const hrStr = hrs === 1 ? 'Hour' : 'Hours';
      const minStr = mins === 1 ? 'Minute' : 'Minutes';
      averageWorkingHours = `${hrs} ${hrStr} ${mins} ${minStr}`;
    }

    res.status(200).json({
      success: true,
      stats: {
        totalTrainers,
        todayVisits,
        totalColleges,
        completedTrainings,
        averageWorkingHours,
        totalRegisteredTrainers,
        activeTrainersToday
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};



// 6. Add Comment to Record (Manager or Trainer)
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required.' });
    }

    const record = await Trainer.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    // Verify access
    if (req.user.role === 'trainer' && record.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only comment on your own records.' });
    }

    const authorName = req.user.role === 'manager' ? 'Manager' : (req.user.trainerName || req.user.username);

    record.comments.push({
      author: authorName,
      role: req.user.role,
      text: text.trim(),
      createdAt: new Date()
    });

    await record.save();

    res.status(200).json({
      success: true,
      message: 'Comment added successfully!',
      data: record
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};
