import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, api } from '../context/AppContext';
import RecordModal from '../components/RecordModal';
import { 
  FaUser, FaIdCard, FaUniversity, FaMapMarkerAlt, 
  FaBook, FaCalendarAlt, FaClock, FaCamera, 
  FaSun, FaMoon, FaCheckCircle, FaExclamationTriangle, 
  FaMapMarkedAlt, FaSignOutAlt, FaCity, FaHistory, FaEye,
  FaChevronLeft, FaChevronRight, FaComment
} from 'react-icons/fa';

const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const minsToTime = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatTimeTo12Hour = (timeStr) => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = String(m).padStart(2, '0');
  return `${displayH}:${displayM} ${ampm}`;
};

const TrainerDashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme, logout, user, API_URL, showToast } = useApp();
  
  // Form State (Name & ID locked to profile)
  const [formData, setFormData] = useState({
    trainerName: '',
    employeeId: '',
    collegeName: '',
    collegeCity: '',
    collegeAddress: '',
    subject: '',
    trainingDate: '',
    entryTime: '',
    exitTime: '',
    scheduledStartTime: '',  // auto-set when Entry Photo is captured
    scheduledEndTime: '',    // auto-computed = entryTime + classDuration
    proof1Status: 'Pending',
    proof1ExpectedWindow: '',
    proof1ActualTime: '',
    proof1DelayMinutes: 0,
    proof2Status: 'Pending',
    proof2ExpectedWindow: '',
    proof2ActualTime: '',
    proof2DelayMinutes: 0,
  });

  // Class Duration set by user (hours + minutes).
  // scheduledStartTime is auto-set on Entry Photo capture; scheduledEndTime = start + duration.
  const [classDurationHrs, setClassDurationHrs] = useState('');
  const [classDurationMins, setClassDurationMins] = useState('0');

  const [lateConfirm, setLateConfirm] = useState(null); // { message, onConfirm, onCancel }

  // Dynamic tick for real-time window calculations
  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimeTick(Date.now());
    }, 5000); // Tick every 5 seconds for responsive disabled/enabled states
    return () => clearInterval(interval);
  }, []);

  // Expected Class Hours state
  const getPhotoStatus = (type) => {
    // Entry photo only needs duration set; other photos need start/end computed after Entry Photo.
    if (type === 'entry') {
      if (!classDurationHrs || parseInt(classDurationHrs, 10) < 0) {
        return { disabled: true, status: 'disabled', message: 'Set class duration first.' };
      }
      // Entry unlocks immediately — no time restriction; user decides when session starts
      return { disabled: false, status: 'open', message: 'Ready — capture Entry Photo to start session' };
    }
    if (!formData.scheduledStartTime || !formData.scheduledEndTime) {
      return { disabled: true, status: 'disabled', message: 'Capture Entry Photo first to unlock.' };
    }

    const now = new Date(currentTimeTick);
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const startMins = timeToMins(formData.scheduledStartTime);
    const endMins = timeToMins(formData.scheduledEndTime);

    const formatWindowMessage = (windowStart, windowEnd) => `On-Time Window (${formatTimeTo12Hour(minsToTime(windowStart))}–${formatTimeTo12Hour(minsToTime(windowEnd))})`;

    if (type === 'proof1') {
      if (!photos.entryFile) {
        return {
          disabled: true,
          status: 'missing_previous',
          message: 'Disabled (Capture Entry Photo first)'
        };
      }
      const [onTimeStart, onTimeEnd] = getProofWindowBounds('proof1');
      if (currentMins < onTimeStart) {
        return {
          disabled: true,
          status: 'before_window',
          message: `Disabled (Opens at ${formatTimeTo12Hour(minsToTime(onTimeStart))})`
        };
      }
      if (currentMins <= onTimeEnd) {
        return {
          disabled: false,
          status: 'on_time',
          message: formatWindowMessage(onTimeStart, onTimeEnd)
        };
      }
      if (currentMins < endMins) {
        return {
          disabled: false,
          status: 'late',
          message: `Late Verification (Window ended at ${formatTimeTo12Hour(minsToTime(onTimeEnd))})`
        };
      }
      return {
        disabled: true,
        status: 'after_session',
        message: 'Disabled (Session has ended)'
      };
    }

    if (type === 'proof2') {
      if (!photos.proof1File) {
        return {
          disabled: true,
          status: 'missing_previous',
          message: 'Disabled (Capture Proof of Entry first)'
        };
      }
      const [onTimeStart, onTimeEnd] = getProofWindowBounds('proof2');
      if (currentMins < onTimeStart) {
        return {
          disabled: true,
          status: 'before_window',
          message: `Disabled (Opens at ${formatTimeTo12Hour(minsToTime(onTimeStart))})`
        };
      }
      if (currentMins <= onTimeEnd) {
        return {
          disabled: false,
          status: 'on_time',
          message: formatWindowMessage(onTimeStart, onTimeEnd)
        };
      }
      return {
        disabled: false,
        status: 'late',
        message: `Late Verification (Window ended at ${formatTimeTo12Hour(minsToTime(onTimeEnd))})`
      };
    }

    if (type === 'exit') {
      if (!photos.entryFile) {
        return {
          disabled: true,
          status: 'missing_previous',
          message: 'Disabled (Capture Entry Photo first)'
        };
      }

      // Exit is always capturable — but warn if taken before scheduled end time
      if (currentMins < endMins) {
        const minsEarly = endMins - currentMins;
        return {
          disabled: false,
          status: 'early_exit',
          message: `Early Exit — ${minsEarly} min${minsEarly !== 1 ? 's' : ''} before scheduled end (${formatTimeTo12Hour(minsToTime(endMins))})`
        };
      }

      return {
        disabled: false,
        status: 'open',
        message: 'Open (Ready to capture)'
      };
    }

    return { disabled: true, status: 'disabled', message: 'Unknown type' };
  };

  const [classHrsInput, setClassHrsInput] = useState('');
  const [classMinsInput, setClassMinsInput] = useState('');
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [collegesList, setCollegesList] = useState([]);
  const collegeDropdownRef = useRef(null);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimeoutRef = useRef(null);

  // Geolocation State
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    address: '',
    loading: false,
    error: null,
  });

  // Derived state for real-time location mismatch
  const isLocationMismatch = (() => {
    if (!formData.collegeCity || !location.address || location.address.includes('Address lookup failed')) return false;
    
    const normalize = (str) => {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace('bengaluru', 'bangalore');
    };

    const normalizedCollegeCity = normalize(formData.collegeCity);
    const normalizedGpsAddress = normalize(location.address);

    return !normalizedGpsAddress.includes(normalizedCollegeCity);
  })();

  // Trigger warning toast once when mismatch is detected in real-time
  useEffect(() => {
    if (isLocationMismatch) {
      showToast(`Location Mismatch: Your GPS location does not match the college city (${formData.collegeCity}). This session will be saved but flagged.`, 'warning');
    }
  }, [isLocationMismatch, formData.collegeCity]);

  // Photo uploads
  const [photos, setPhotos] = useState({
    entryFile: null,
    entryPreview: '',
    entryWatermarking: false,
    proof1File: null,
    proof1Preview: '',
    proof1Watermarking: false,
    proof2File: null,
    proof2Preview: '',
    proof2Watermarking: false,
    exitFile: null,
    exitPreview: '',
    exitWatermarking: false,
  });

  // Attendance History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Selected log for view modal details
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [focusComments, setFocusComments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRecordUpdate = (updatedRecord) => {
    setHistory(prev => prev.map(r => r._id === updatedRecord._id ? updatedRecord : r));
    setSelectedRecord(updatedRecord);
  };

  // File Inputs Refs
  const entryInputRef = useRef(null);
  const exitInputRef = useRef(null);

  // Auto-calculated state variables
  const [conductedMinutes, setConductedMinutes] = useState(0);
  const [conductedText, setConductedText] = useState('0 Hours 0 Minutes');
  
  // Class duration in minutes (from user input)
  const classDurationTotalMins = (() => {
    const h = parseInt(classDurationHrs, 10);
    const m = parseInt(classDurationMins, 10);
    if (isNaN(h) || h < 0) return 0;
    return h * 60 + (isNaN(m) ? 0 : m);
  })();

  // expectedMinutes = user-set class duration (before capture) or computed from scheduled times (after)
  const getScheduledDurationMins = () => {
    if (formData.scheduledStartTime && formData.scheduledEndTime) {
      const [startH, startM] = formData.scheduledStartTime.split(':').map(Number);
      const [endH, endM] = formData.scheduledEndTime.split(':').map(Number);
      let diff = (endH * 60 + endM) - (startH * 60 + startM);
      if (diff < 0) diff += 24 * 60;
      return diff;
    }
    return classDurationTotalMins;
  };
  const expectedMinutes = getScheduledDurationMins();
  
  const getExpectedText = (totalMins) => {
    if (totalMins <= 0) return 'Not Specified';
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const hrStr = hrs === 1 ? 'Hour' : 'Hours';
    const minStr = mins === 1 ? 'Minute' : 'Minutes';
    return `${hrs} ${hrStr} ${mins} ${minStr}`;
  };
  const expectedText = getExpectedText(expectedMinutes);

  const getProofWindowBounds = (proofType) => {
    const duration = getScheduledDurationMins();
    const startMins = timeToMins(formData.scheduledStartTime);
    const endMins = timeToMins(formData.scheduledEndTime);

    if (duration === 15) {
      if (proofType === 'proof1') return [startMins + 6, startMins + 9];
      if (proofType === 'proof2') return [endMins - 3, endMins];
    }
    if (duration === 30) {
      if (proofType === 'proof1') return [startMins + 9, startMins + 12];
      if (proofType === 'proof2') return [endMins - 6, endMins - 3];
    }
    if (proofType === 'proof1') {
      return [startMins + 10, startMins + 15];
    }
    if (proofType === 'proof2') {
      return [endMins - 20, endMins - 10];
    }
    return [0, 0];
  };

  // Warnings checks
  const isDurationShort = photos.entryFile && photos.exitFile && conductedMinutes < expectedMinutes;
  const isCrossDateConflict = photos.entryFile && photos.exitFile && 
    detectDateFromFile(photos.entryFile) !== detectDateFromFile(photos.exitFile);

  // Map Embed Url
  const embedMapsUrl = location.latitude && location.longitude 
    ? `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`
    : '';

  const [hasSavedSession, setHasSavedSession] = useState(!!localStorage.getItem('active_checkin_session'));

  // --- NEW ENHANCED STATES ---
  // History view toggler: 'list' or 'calendar'
  const [viewMode, setViewMode] = useState('list');
  // Calendar states
  const [calDate, setCalDate] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState(null); // YYYY-MM-DD
  
  // Camera video elements references
  const entryVideoRef = useRef(null);
  const proof1VideoRef = useRef(null);
  const proof2VideoRef = useRef(null);
  const exitVideoRef = useRef(null);

  // Camera capture states
  const [cameraActive, setCameraActive] = useState({
    entry: false,
    proof1: false,
    proof2: false,
    exit: false
  });

  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (rear)

  const [streams, setStreams] = useState({
    entry: null,
    proof1: null,
    proof2: null,
    exit: null
  });

  const toggleFacingMode = async (type) => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    
    const activeStream = streams[type];
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode, width: 640, height: 480 }
        });
        setStreams(prev => ({ ...prev, [type]: stream }));
        
        let videoEl = null;
        if (type === 'entry') videoEl = entryVideoRef.current;
        else if (type === 'exit') videoEl = exitVideoRef.current;

        if (videoEl) {
          videoEl.srcObject = stream;
        }
      } catch (err) {
        console.error('Error switching camera:', err);
        showToast('Could not access selected camera. Reverting.', 'error');
        setFacingMode(facingMode);
      }
    }
  };

  // Helper to convert base64 back to File object
  const base64ToFile = (base64String, filename) => {
    try {
      const arr = base64String.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch (err) {
      console.error('Error converting base64 to File:', err);
      return null;
    }
  };

  // Autosave check-in session when state changes
  useEffect(() => {
    if (isResetting) {
      return;
    }
    const hasActiveSession = 
      (formData.collegeName || '').trim() || 
      (formData.collegeCity || '').trim() || 
      (formData.collegeAddress || '').trim() || 
      (formData.subject || '').trim() || 
      formData.entryTime || 
      photos.entryFile || photos.proof1File || photos.proof2File || photos.exitFile;

    if (hasActiveSession) {
      try {
        const sessionData = {
          formData,
          location,
          classDurationHrs,
          classDurationMins,
          entryPhotoName: photos.entryFile ? photos.entryFile.name : null,
          proof1PhotoName: photos.proof1File ? photos.proof1File.name : null,
          proof2PhotoName: photos.proof2File ? photos.proof2File.name : null,
          exitPhotoName: photos.exitFile ? photos.exitFile.name : null,
          savedAtDate: new Date().toDateString()
        };

        // Helper to convert File -> base64 Promise
        const fileToBase64 = (file) => new Promise((resolve) => {
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });

        (async () => {
          if (photos.entryFile) sessionData.entryPhotoBase64 = await fileToBase64(photos.entryFile);
          if (photos.proof1File) sessionData.proof1PhotoBase64 = await fileToBase64(photos.proof1File);
          if (photos.proof2File) sessionData.proof2PhotoBase64 = await fileToBase64(photos.proof2File);
          if (photos.exitFile) sessionData.exitPhotoBase64 = await fileToBase64(photos.exitFile);

          if (isResetting) return;
          localStorage.setItem('active_checkin_session', JSON.stringify(sessionData));
          setHasSavedSession(true);
        })();
      } catch (err) {
        console.error('Error saving check-in session:', err);
      }
    }
  }, [isResetting, formData, photos.entryFile, photos.proof1File, photos.proof2File, photos.exitFile, location, classDurationHrs, classDurationMins]);

  // Handle resetting flag resolution after React completes updates
  useEffect(() => {
    if (isResetting) {
      const isFullyCleared =
        (formData.collegeName || '') === '' &&
        (formData.collegeCity || '') === '' &&
        (formData.collegeAddress || '') === '' &&
        (formData.subject || '') === '' &&
        (formData.entryTime || '') === '' &&
        (formData.exitTime || '') === '' &&
        photos.entryFile === null &&
        photos.exitFile === null &&
        classDurationHrs === '' &&
        classDurationMins === '0';

      if (isFullyCleared) {
        setIsResetting(false);
      }
    }
  }, [isResetting, formData, photos, classDurationHrs, classDurationMins]);

  // Fetch GPS and User profile logs on mount, restoring saved session if available
  useEffect(() => {
    const saved = localStorage.getItem('active_checkin_session');
    let restored = false;

    if (saved) {
      try {
        const session = JSON.parse(saved);
        const todayStr = new Date().toDateString();
        
        if (session.savedAtDate === todayStr && session.formData && session.formData.entryTime) {
          restored = true;
          setHasSavedSession(true);
          setFormData(prev => ({ ...prev, ...session.formData }));
          if (session.location) setLocation(prev => ({ ...prev, ...session.location }));
          if (session.classDurationHrs !== undefined) setClassDurationHrs(session.classDurationHrs);
          if (session.classDurationMins !== undefined) setClassDurationMins(session.classDurationMins);
          
          if (session.entryPhotoBase64 && session.entryPhotoName) {
            const recoveredFile = base64ToFile(session.entryPhotoBase64, session.entryPhotoName);
            if (recoveredFile) {
              setPhotos(prev => ({
                ...prev,
                entryFile: recoveredFile,
                entryPreview: URL.createObjectURL(recoveredFile)
              }));
            }
          }

          if (session.proof1PhotoBase64 && session.proof1PhotoName) {
            const recoveredProof1 = base64ToFile(session.proof1PhotoBase64, session.proof1PhotoName);
            if (recoveredProof1) {
              setPhotos(prev => ({
                ...prev,
                proof1File: recoveredProof1,
                proof1Preview: URL.createObjectURL(recoveredProof1)
              }));
            }
          }

          if (session.proof2PhotoBase64 && session.proof2PhotoName) {
            const recoveredProof2 = base64ToFile(session.proof2PhotoBase64, session.proof2PhotoName);
            if (recoveredProof2) {
              setPhotos(prev => ({
                ...prev,
                proof2File: recoveredProof2,
                proof2Preview: URL.createObjectURL(recoveredProof2)
              }));
            }
          }

          if (session.exitPhotoBase64 && session.exitPhotoName) {
            const recoveredExit = base64ToFile(session.exitPhotoBase64, session.exitPhotoName);
            if (recoveredExit) {
              setPhotos(prev => ({
                ...prev,
                exitFile: recoveredExit,
                exitPreview: URL.createObjectURL(recoveredExit)
              }));
            }
          }
        } else {
          // Discard session from previous days
          localStorage.removeItem('active_checkin_session');
          setHasSavedSession(false);
        }
      } catch (err) {
        console.error('Error recovering session:', err);
      }
    }

    if (!restored) {
      fetchGeolocation();
      setHasSavedSession(false);
    }
    fetchHistory();
    // Load external colleges list asynchronously
    fetch('/colleges.json')
      .then(res => res.json())
      .then(data => {
        setCollegesList(data);
      })
      .catch(err => {
        console.error('Failed to load colleges database:', err);
      });
  }, []);

  // Autofill name and ID from profile
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        trainerName: user.trainerName || user.username || '',
        employeeId: user.employeeId || 'TEMP-ID'
      }));
    }
  }, [user]);

  // Close college dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (collegeDropdownRef.current && !collegeDropdownRef.current.contains(event.target)) {
        setShowCollegeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup reset timeout on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const [unreadUpdateCount, setUnreadUpdateCount] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setUnreadUpdateCount(prev => prev + 1);
    };
    window.addEventListener('comments_read_update', handleUpdate);
    return () => window.removeEventListener('comments_read_update', handleUpdate);
  }, []);

  const hasUnreadComments = (record, currentUser) => {
    if (!record.comments || record.comments.length === 0) return false;
    if (!currentUser) return false;
    const lastComment = record.comments[record.comments.length - 1];
    if (lastComment.role === currentUser.role) return false;
    
    const readKey = `last_read_comments_${currentUser._id || currentUser.username}_${record._id}`;
    const lastReadTime = localStorage.getItem(readKey);
    if (!lastReadTime) return true;
    return new Date(lastComment.createdAt).getTime() > Number(lastReadTime);
  };

  const getUnreadCommentsCount = (record, currentUser) => {
    if (!record.comments || record.comments.length === 0) return 0;
    if (!currentUser) return 0;
    
    const readKey = `last_read_comments_${currentUser._id || currentUser.username}_${record._id}`;
    const lastReadTime = localStorage.getItem(readKey);
    if (!lastReadTime) {
      return record.comments.filter(c => c.role !== currentUser.role).length;
    }
    
    return record.comments.filter(c => 
      c.role !== currentUser.role && 
      new Date(c.createdAt).getTime() > Number(lastReadTime)
    ).length;
  };

  // Request Notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const notifyTrainerToUploadProofs = (missingProofs) => {
    if (!missingProofs || missingProofs.length === 0) return;
    const proofList = missingProofs.join(' and ');
    const title = 'Upload Proof Images';
    const body = `Please upload ${proofList} before submitting. Missing proof images may trigger admin review.`;
    showToast(body, 'warning');
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  const [latestCommentTime, setLatestCommentTime] = useState(0);

  // Background polling for history logs to fetch real-time comment updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHistory();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (history.length > 0 && user) {
      const otherComments = history.flatMap(r => r.comments || [])
        .filter(c => c.role !== user.role);

      if (otherComments.length === 0) return;

      const maxCommentTime = Math.max(...otherComments.map(c => new Date(c.createdAt).getTime()));

      const newUnreadComments = history.filter(r => {
        if (!r.comments || r.comments.length === 0) return false;
        const lastComment = r.comments[r.comments.length - 1];
        if (lastComment.role === user.role) return false;
        
        const readKey = `last_read_comments_${user._id || user.username}_${r._id}`;
        const lastReadTime = localStorage.getItem(readKey);
        const commentTime = new Date(lastComment.createdAt).getTime();
        
        const isUnread = !lastReadTime || commentTime > Number(lastReadTime);
        const isNew = commentTime > latestCommentTime;
        return isUnread && isNew;
      });

      if (newUnreadComments.length > 0) {
        const title = "New Manager Feedback";
        const body = `You have ${newUnreadComments.length} new feedback message(s) / comments from the Manager!`;
        showToast(`${title}: ${body}`, 'info');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body });
        }
      }

      if (maxCommentTime > latestCommentTime) {
        setLatestCommentTime(maxCommentTime);
      }
    }
  }, [history, user, latestCommentTime]);



  const fetchGeolocation = () => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation is not supported by your browser.' }));
      showToast('Geolocation is not supported by your browser.', 'warning');
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(prev => ({ ...prev, latitude, longitude }));
        
        try {
          const res = await api.get(`/geocode/reverse?lat=${latitude}&lon=${longitude}`);
          if (res.data.success) {
            const data = res.data.data;
            const addressStr = data.display_name || `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`;
            const newLoc = {
              latitude,
              longitude,
              address: addressStr,
              loading: false,
              error: null
            };
            setLocation(newLoc);


          } else {
            throw new Error('Reverse geocode request failed');
          }
        } catch (err) {
          console.error(err);
          const fallbackAddress = `Latitude: ${latitude.toFixed(6)}, Longitude: ${longitude.toFixed(6)} (Address lookup failed)`;
          const newLoc = {
            latitude,
            longitude,
            address: fallbackAddress,
            loading: false,
            error: null
          };
          setLocation(newLoc);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMsg = 'Failed to fetch location. Please enable location permissions.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please enable GPS permissions.';
        }
        setLocation(prev => ({ ...prev, loading: false, error: errorMsg }));
        showToast(errorMsg, 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Fetch Trainer Submissions History
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/records?limit=100');
      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching submissions history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Calculate conducted session hours duration
  useEffect(() => {
    if (formData.entryTime && formData.exitTime) {
      const [entryHrs, entryMins] = formData.entryTime.split(':').map(Number);
      const [exitHrs, exitMins] = formData.exitTime.split(':').map(Number);
      
      const entryTotalMins = entryHrs * 60 + entryMins;
      const exitTotalMins = exitHrs * 60 + exitMins;

      if (exitTotalMins >= entryTotalMins) {
        const diffMins = exitTotalMins - entryTotalMins;
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        
        const hrStr = hrs === 1 ? 'Hour' : 'Hours';
        const minStr = mins === 1 ? 'Minute' : 'Minutes';
        
        setConductedMinutes(diffMins);
        setConductedText(`${hrs} ${hrStr} ${mins} ${minStr}`);
      } else {
        setConductedMinutes(0);
        setConductedText('0 Hours 0 Minutes');
      }
    } else {
      setConductedMinutes(0);
      setConductedText('0 Hours 0 Minutes');
    }
  }, [formData.entryTime, formData.exitTime]);

  // Clean up webcam streams on unmount
  useEffect(() => {
    return () => {
      // Stop all track streams
      Object.values(streams).forEach(stream => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      });
    };
  }, [streams]);

  const startCamera = async (type) => {
    // If it's a dashboard photo, check its status
    if (type === 'entry' || type === 'proof1' || type === 'proof2' || type === 'exit') {
      const statusObj = getPhotoStatus(type);
      if (statusObj.disabled) {
        showToast(statusObj.message, 'warning');
        return;
      }
      fetchGeolocation();
    } else {
      fetchUpdateModalGeolocation();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: 640, height: 480 }
      });
      
      setStreams(prev => ({ ...prev, [type]: stream }));
      setCameraActive(prev => ({ ...prev, [type]: true }));

      // Attach stream to video tag
      setTimeout(() => {
        let videoEl = null;
        if (type === 'entry') videoEl = entryVideoRef.current;
        else if (type === 'proof1') videoEl = proof1VideoRef.current;
        else if (type === 'proof2') videoEl = proof2VideoRef.current;
        else if (type === 'exit') videoEl = exitVideoRef.current;
        else if (type === 'updateEntry') videoEl = updateEntryVideoRef.current;
        else if (type === 'updateExit') videoEl = updateExitVideoRef.current;

        if (videoEl) {
          videoEl.srcObject = stream;
        }
      }, 300);
    } catch (err) {
      console.error('Error starting video stream:', err);
      showToast('Could not open camera. Please check camera permission preferences.', 'error');
    }
  };

  const stopCamera = (type) => {
    setStreams(prev => {
      const stream = prev[type];
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      return { ...prev, [type]: null };
    });
    setCameraActive(prev => ({ ...prev, [type]: false }));
  };

  const checkImageQuality = (canvas) => {
    try {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // 1. Brightness/Darkness Check
      let totalLuminance = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 32) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += lum;
        count++;
      }
      const avgLuminance = totalLuminance / count;

      if (avgLuminance < 15) {
        return {
          valid: false,
          reason: 'The captured photo is too dark or black. Please ensure your camera lens is not covered, there is sufficient light, and retake the photo.'
        };
      }

      // 2. Sharpness/Blur Check using gradient variance
      let sumGrad = 0;
      let sumGradSq = 0;
      let gradCount = 0;
      const step = 6;

      for (let y = step; y < height - step; y += step) {
        for (let x = step; x < width - step; x += step) {
          const idx = (y * width + x) * 4;
          const idxRight = (y * width + (x + 1)) * 4;
          const idxDown = ((y + 1) * width + x) * 4;

          const val = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          const valRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];
          const valDown = 0.299 * data[idxDown] + 0.587 * data[idxDown + 1] + 0.114 * data[idxDown + 2];

          const gx = valRight - val;
          const gy = valDown - val;
          const mag = Math.sqrt(gx * gx + gy * gy);

          sumGrad += mag;
          sumGradSq += mag * mag;
          gradCount++;
        }
      }

      const meanGrad = sumGrad / gradCount;
      const varianceGrad = (sumGradSq / gradCount) - (meanGrad * meanGrad);

      if (varianceGrad < 12) {
        return {
          valid: false,
          reason: 'The captured photo appears blurry or out of focus. Please hold your camera still and retake the photo.'
        };
      }

      return { valid: true };
    } catch (err) {
      console.error('Image quality check failed:', err);
      return { valid: true };
    }
  };

  const proceedWithCapture = (type, videoEl) => {
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    const quality = checkImageQuality(canvas);
    if (!quality.valid) {
      showToast(quality.reason, 'error');
      stopCamera(type);
      return;
    }

    // Stop current stream immediately
    stopCamera(type);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const capturedFile = new File([blob], `${type}_photo.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const detectedTime = detectTimeFromFile(capturedFile);
      const detectedDate = detectDateFromFile(capturedFile);

      // Check if it is late or on-time
      const startMins = timeToMins(formData.scheduledStartTime);
      const endMins = timeToMins(formData.scheduledEndTime);
      const currentMins = timeToMins(detectedTime);

      let proofStatus = 'On-Time';
      let expectedWindow = '';
      let actualTimeText = formatTimeTo12Hour(detectedTime);
      let delayMinutes = 0;

      if (type === 'proof1') {
        const [onTimeStart, onTimeEnd] = getProofWindowBounds('proof1');
        expectedWindow = `${formatTimeTo12Hour(minsToTime(onTimeStart))}–${formatTimeTo12Hour(minsToTime(onTimeEnd))}`;
        if (currentMins > onTimeEnd) {
          proofStatus = 'Late';
          delayMinutes = currentMins - onTimeEnd;
        }
      } else if (type === 'proof2') {
        const [onTimeStart, onTimeEnd] = getProofWindowBounds('proof2');
        expectedWindow = `${formatTimeTo12Hour(minsToTime(onTimeStart))}–${formatTimeTo12Hour(minsToTime(onTimeEnd))}`;
        if (currentMins > onTimeEnd) {
          proofStatus = 'Late';
          delayMinutes = currentMins - onTimeEnd;
        }
      }

      // Auto-compute scheduled times when Entry Photo is captured
      let autoScheduledStart = formData.scheduledStartTime;
      let autoScheduledEnd = formData.scheduledEndTime;
      if (type === 'entry') {
        autoScheduledStart = detectedTime; // lock session start = Entry Photo capture time
        const entryMins = timeToMins(detectedTime);
        const endMins = entryMins + classDurationTotalMins;
        autoScheduledEnd = minsToTime(endMins % (24 * 60)); // wrap around midnight safely
      }

      const updatedFormData = {
        ...formData,
        ...(type === 'entry' ? {
          entryTime: detectedTime,
          scheduledStartTime: autoScheduledStart,
          scheduledEndTime: autoScheduledEnd,
        } : {}),
        ...(type === 'exit' ? { exitTime: detectedTime } : {}),
        // trainingDate auto-captured from Entry Photo timestamp only
        ...(type === 'entry' ? { trainingDate: detectedDate } : {}),
        ...(type === 'proof1' ? {
          proof1Status: proofStatus,
          proof1ExpectedWindow: expectedWindow,
          proof1ActualTime: actualTimeText,
          proof1DelayMinutes: delayMinutes
        } : {}),
        ...(type === 'proof2' ? {
          proof2Status: proofStatus,
          proof2ExpectedWindow: expectedWindow,
          proof2ActualTime: actualTimeText,
          proof2DelayMinutes: delayMinutes
        } : {})
      };
      setFormData(updatedFormData);

      setPhotos(prev => {
        const nextPhotos = { ...prev };
        nextPhotos[type + 'File'] = null;
        nextPhotos[type + 'Preview'] = '';
        nextPhotos[type + 'Watermarking'] = true;

        if (type === 'entry') {
          nextPhotos.proof1File = null; nextPhotos.proof1Preview = '';
          nextPhotos.proof2File = null; nextPhotos.proof2Preview = '';
          nextPhotos.exitFile = null; nextPhotos.exitPreview = '';
        } else if (type === 'proof1') {
          nextPhotos.proof2File = null; nextPhotos.proof2Preview = '';
          nextPhotos.exitFile = null; nextPhotos.exitPreview = '';
        } else if (type === 'proof2') {
          nextPhotos.exitFile = null; nextPhotos.exitPreview = '';
        }
        return nextPhotos;
      });

      processImageWatermark(capturedFile, type, detectedTime, detectedDate, (watermarkedFile) => {
        setPhotos(prev => ({
          ...prev,
          [type + 'File']: watermarkedFile,
          [type + 'Preview']: URL.createObjectURL(watermarkedFile),
          [type + 'Watermarking']: false
        }));
        showToast(`${type.toUpperCase()} Photo captured successfully!`, 'success');
      });
    }, 'image/jpeg', 0.95);
  };

  const capturePhoto = (type) => {
    let videoEl = null;
    if (type === 'entry') videoEl = entryVideoRef.current;
    else if (type === 'proof1') videoEl = proof1VideoRef.current;
    else if (type === 'proof2') videoEl = proof2VideoRef.current;
    else if (type === 'exit') videoEl = exitVideoRef.current;

    if (!videoEl) {
      showToast('Camera element is not ready.', 'warning');
      return;
    }

    if (type === 'proof1' || type === 'proof2') {
      const windowStatus = getPhotoStatus(type);
      if (windowStatus.status === 'late') {
        const startMins = timeToMins(formData.scheduledStartTime);
        const endMins = timeToMins(formData.scheduledEndTime);
        let windowStartText = '';
        let windowEndText = '';
        if (type === 'proof1') {
          windowStartText = formatTimeTo12Hour(minsToTime(startMins + 10));
          windowEndText = formatTimeTo12Hour(minsToTime(startMins + 15));
        } else {
          windowStartText = formatTimeTo12Hour(minsToTime(endMins - 20));
          windowEndText = formatTimeTo12Hour(minsToTime(endMins - 10));
        }

        const warningMessage = `⚠️ Warning: You are submitting ${type === 'proof1' ? 'Proof of Entry' : 'Proof of Exit'} outside the scheduled verification window (${windowStartText}–${windowEndText}). This proof will be marked as a Late Verification, and your manager will be notified.`;

        setLateConfirm({
          message: warningMessage,
          onConfirm: () => {
            setLateConfirm(null);
            proceedWithCapture(type, videoEl);
          },
          onCancel: () => {
            setLateConfirm(null);
            stopCamera(type);
          }
        });
        return;
      }
    }

    // Handle exit photo warnings (early exit + missing proofs before scheduled end)
    if (type === 'exit') {
      const exitStatusVal = getPhotoStatus('exit');
      const missingProofs = [];
      if (!photos.proof1File) missingProofs.push('Proof 1 (Entry)');
      if (!photos.proof2File) missingProofs.push('Proof 2 (Exit)');

      const isEarlyExit = exitStatusVal.status === 'early_exit';
      const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
      const scheduledEndMins = timeToMins(formData.scheduledEndTime);
      const isAfterSession = nowMins >= scheduledEndMins;
      const hasMissingProofs = missingProofs.length > 0;

      // Only warn for early exit, or if proofs are missing before the scheduled end time.
      if (isEarlyExit || (hasMissingProofs && !isAfterSession)) {
        const warnings = [];
        if (isEarlyExit) {
          const minsLeft = scheduledEndMins - nowMins;
          warnings.push(`⚠️ Early Exit: You are leaving ${minsLeft > 0 ? minsLeft + ' minute(s)' : 'before'} the scheduled session end (${formatTimeTo12Hour(formData.scheduledEndTime)}).`);
        }
        if (hasMissingProofs && !isAfterSession) {
          warnings.push(`⚠️ Missing Photos: ${missingProofs.join(' and ')} not captured — record will be flagged for admin review.`);
          notifyTrainerToUploadProofs(missingProofs);
        }

        setLateConfirm({
          title: 'Exit Warning',
          message: warnings.join('\n\n'),
          confirmLabel: 'Proceed with Exit',
          cancelLabel: 'Go Back',
          confirmClass: 'btn-warning',
          onConfirm: () => {
            setLateConfirm(null);
            proceedWithCapture(type, videoEl);
          },
          onCancel: () => {
            setLateConfirm(null);
            stopCamera(type);
          }
        });
        return;
      }
    }

    proceedWithCapture(type, videoEl);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  // Extract time from photo file modification property
  function detectTimeFromFile(file) {
    const fileDate = file && file.lastModified ? new Date(file.lastModified) : new Date();
    const hrs = String(fileDate.getHours()).padStart(2, '0');
    const mins = String(fileDate.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  }

  // Extract date from photo file modification property
  function detectDateFromFile(file) {
    const fileDate = file && file.lastModified ? new Date(file.lastModified) : new Date();
    const year = fileDate.getFullYear();
    const month = String(fileDate.getMonth() + 1).padStart(2, '0');
    const day = String(fileDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Draw Canvas Watermark
  const processImageWatermark = (file, type, detectedTime, detectedDate, callback, customLocation = null) => {
    const activeLoc = customLocation || location;
    if (!activeLoc.latitude || !activeLoc.longitude) {
      showToast('Please fetch GPS location coordinates first.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const fontSize = Math.max(16, Math.floor(img.width * 0.024));
          const padding = fontSize * 0.5;
          ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', system-ui, sans-serif`;
          
          const latText = `LATITUDE: ${activeLoc.latitude ? Number(activeLoc.latitude).toFixed(6) : '0.000000'}`;
          const lonText = `LONGITUDE: ${activeLoc.longitude ? Number(activeLoc.longitude).toFixed(6) : '0.000000'}`;
          const dateText = `DATE: ${detectedDate || ''}`;
          const timeText = `TIME: ${detectedTime || ''}`;
          
          // Function to split text into lines based on canvas width
          const wrapText = (text, maxWidth) => {
            const words = text.split(' ');
            const wrappedLines = [];
            let currentLine = '';

            for (let i = 0; i < words.length; i++) {
              const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth && i > 0) {
                wrappedLines.push(currentLine);
                currentLine = words[i];
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) {
              wrappedLines.push(currentLine);
            }
            return wrappedLines;
          };

          const fullAddress = `ADDRESS: ${activeLoc.address || ''}`;
          const wrappedAddressLines = wrapText(fullAddress, img.width - (padding * 4));

          const lines = [
            `${latText} | ${lonText}`,
            ...wrappedAddressLines,
            `${dateText} | ${timeText}`
          ];

          const bannerHeight = (lines.length * (fontSize + padding)) + padding;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.fillRect(0, img.height - bannerHeight, img.width, bannerHeight);
          
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'top';
          lines.forEach((line, index) => {
            const yOffset = img.height - bannerHeight + padding + index * (fontSize + padding);
            ctx.fillText(line, padding * 2, yOffset);
          });

          canvas.toBlob((blob) => {
            const watermarkedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: file.lastModified || Date.now()
            });
            callback(watermarkedFile);
          }, file.type, 0.85);
        } catch (watermarkErr) {
          console.error('Error drawing watermark:', watermarkErr);
          showToast('Failed to apply location watermark. Using raw capture.', 'warning');
          callback(file);
        }
      };
    };
  };



  // Submit attendance verified log
  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasRequiredTextFields = (
      formData.trainerName.trim() &&
      formData.employeeId.trim() &&
      formData.collegeName.trim() &&
      formData.collegeCity.trim() &&
      formData.collegeAddress.trim() &&
      formData.subject.trim() &&
      formData.trainingDate &&
      formData.entryTime &&
      formData.exitTime &&
      formData.scheduledStartTime &&
      formData.scheduledEndTime &&
      location.address
    );

    const hasRequiredCoordinates = Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));
    const hasValidDuration = classDurationHrs !== '' && Number.isFinite(expectedMinutes);

    if (!hasRequiredTextFields || !hasRequiredCoordinates || !hasValidDuration || !photos.entryFile || !photos.exitFile) {
      showToast('Complete all required fields including college address, subject, GPS location, class duration, entry time, exit time, entry photo, and exit photo. Proof 1 and Proof 2 remain optional.', 'error');
      return;
    }

    // Verify that the college name exists in our predefined list (strict dropdown validation)
    const isValidCollege = collegesList.some(c => c.name === formData.collegeName);
    if (!isValidCollege) {
      showToast('Please select a valid college from the dropdown search list.', 'error');
      return;
    }

    // Verify that the college state matches the live GPS state
    if (isLocationMismatch) {
      showToast(`Location Mismatch: Your live GPS location does not match the college city (${formData.collegeCity}). This session will be saved but flagged.`, 'warning');
    }



    if (isCrossDateConflict) {
      showToast('Entry photo and Exit photo must be taken on the same calendar day.', 'error');
      return;
    }

    const missingProofUploads = [];
    if (!photos.proof1File) missingProofUploads.push('Proof 1 (Entry)');
    if (!photos.proof2File) missingProofUploads.push('Proof 2 (Exit)');
    if (missingProofUploads.length > 0) {
      notifyTrainerToUploadProofs(missingProofUploads);
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('trainerName', formData.trainerName);
      payload.append('employeeId', formData.employeeId);
      payload.append('collegeName', formData.collegeName);
      payload.append('collegeCity', formData.collegeCity.trim());
      payload.append('collegeAddress', formData.collegeAddress);
      payload.append('subject', formData.subject);
      payload.append('trainingDate', formData.trainingDate);
      payload.append('entryTime', formData.entryTime);
      payload.append('exitTime', formData.exitTime);
      payload.append('latitude', location.latitude);
      payload.append('longitude', location.longitude);
      payload.append('locationAddress', location.address);
      payload.append('classHours', expectedText);
      payload.append('classHoursMinutes', expectedMinutes);
      payload.append('scheduledStartTime', formData.scheduledStartTime);
      payload.append('scheduledEndTime', formData.scheduledEndTime);
      payload.append('proof1Status', formData.proof1Status);
      payload.append('proof1ExpectedWindow', formData.proof1ExpectedWindow);
      payload.append('proof1ActualTime', formData.proof1ActualTime);
      payload.append('proof1DelayMinutes', formData.proof1DelayMinutes);
      payload.append('proof2Status', formData.proof2Status);
      payload.append('proof2ExpectedWindow', formData.proof2ExpectedWindow);
      payload.append('proof2ActualTime', formData.proof2ActualTime);
      payload.append('proof2DelayMinutes', formData.proof2DelayMinutes);
      
      payload.append('entryPhoto', photos.entryFile);
      if (photos.proof1File) {
        payload.append('proof1Photo', photos.proof1File);
      }
      if (photos.proof2File) {
        payload.append('proof2Photo', photos.proof2File);
      }
      payload.append('exitPhoto', photos.exitFile);

      const response = await api.post('/records', payload);

      if (response.data.success) {
        showToast(response.data.message || 'Attendance submitted successfully!', 'success');
        localStorage.removeItem('active_checkin_session');
        setHasSavedSession(false);
        
        // Reset dynamic states
        setFormData(prev => ({
          ...prev,
          collegeName: '',
          collegeCity: '',
          collegeAddress: '',
          subject: '',
          trainingDate: '',
          entryTime: '',
          exitTime: '',
          scheduledStartTime: '',
          scheduledEndTime: '',
          proof1Status: 'Pending',
          proof1ExpectedWindow: '',
          proof1ActualTime: '',
          proof1DelayMinutes: 0,
          proof2Status: 'Pending',
          proof2ExpectedWindow: '',
          proof2ActualTime: '',
          proof2DelayMinutes: 0,
        }));
        
        setPhotos({
          entryFile: null,
          entryPreview: '',
          entryWatermarking: false,
          proof1File: null,
          proof1Preview: '',
          proof1Watermarking: false,
          proof2File: null,
          proof2Preview: '',
          proof2Watermarking: false,
          exitFile: null,
          exitPreview: '',
          exitWatermarking: false,
        });

        setClassDurationHrs('');
        setClassDurationMins('0');
        setConductedMinutes(0);
        setConductedText('0 Hours 0 Minutes');
        
        if (entryInputRef.current) entryInputRef.current.value = '';
        if (exitInputRef.current) exitInputRef.current.value = '';
        
        fetchGeolocation();
        fetchHistory(); // Refresh
      } else {
        showToast(response.data.message || 'Submission failed.', 'error');
      }
    } catch (err) {
      if (!err.response || err.response.status >= 500) {
        console.error(err);
      }
      showToast(err.response?.data?.message || 'Server error during submission.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- STATS CALCULATIONS ---
  // Exclude rejected sessions from active attendance
  const activeSessions = history.filter(h => h.status !== 'Rejected');
  const totalSessionsCount = activeSessions.length;
  const verifiedSessionsCount = activeSessions.filter(h => h.status === 'Verified').length;
  const flaggedSessionsCount = activeSessions.filter(h => h.status === 'Flagged').length;
  const rejectedSessionsCount = history.filter(h => h.status === 'Rejected').length;

  // --- PHOTO UPDATE HANDLERS ---
  const fetchUpdateModalGeolocation = () => {
    if (!navigator.geolocation) {
      showToast('GPS is not supported by your browser.', 'warning');
      return;
    }
    setPhotoUpdateLocation(prev => ({ ...prev, loading: true }));
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await api.get(`/geocode/reverse?lat=${latitude}&lon=${longitude}`);
          if (res.data.success) {
            const data = res.data.data;
            setPhotoUpdateLocation({
              latitude,
              longitude,
              address: data.display_name || `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`,
              loading: false
            });
          } else {
            throw new Error('Geocoding request failed');
          }
        } catch {
          setPhotoUpdateLocation({
            latitude,
            longitude,
            address: `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`,
            loading: false
          });
        }
      },
      () => {
        setPhotoUpdateLocation(prev => ({ ...prev, loading: false }));
        showToast('Failed to fetch current GPS coordinates.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };



  // --- CUSTOM CALENDAR HELPERS ---
  const handlePrevMonth = () => {
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));
  };

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Create calendar grids
  const calendarCells = [];
  // Prefix empty cells
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: null, differentMonth: true });
  }
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const daySessions = history.filter(h => h.trainingDate === dateStr);
    calendarCells.push({
      day: d,
      dateStr,
      sessions: daySessions,
      differentMonth: false
    });
  }

  // Auto-select first date with sessions or today on mount
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedCalDate(todayStr);
  }, []);

  const selectedDaySessions = history.filter(h => h.trainingDate === selectedCalDate);

  const entryStatus = getPhotoStatus('entry');
  const proof1StatusVal = getPhotoStatus('proof1');
  const proof2StatusVal = getPhotoStatus('proof2');
  const exitStatus = getPhotoStatus('exit');

  return (
    <div className="container-fluid p-0">
      
      {/* Top Navbar */}
      <nav className="navbar navbar-expand-lg glass-card rounded-0 border-top-0 border-start-0 border-end-0 px-4 py-3 sticky-top">
        <div className="container-fluid">
          <span className="navbar-brand d-flex align-items-center gap-2">
            <FaMapMarkedAlt className="text-primary fs-3" />
            <span className="fw-bold gradient-text">GeoTag Attendance</span>
          </span>
          <div className="d-flex align-items-center gap-3">
            <span className="d-none d-sm-inline text-secondary font-monospace" style={{ fontSize: '0.85rem' }}>
              Trainer: <b>{user?.trainerName || user?.username}</b> <small className="text-muted">({user?.employeeId})</small>
            </span>
            <button 
              className="btn btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{ width: '40px', height: '40px' }}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <FaSun className="text-warning" /> : <FaMoon />}
            </button>
            <button className="btn btn-outline-danger px-3 rounded-pill d-flex align-items-center gap-1 hover-scale" onClick={handleLogout}>
              <FaSignOutAlt /> Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container py-4">
        
        {/* --- DASHBOARD STATISTICS PANEL --- */}
        <div className="row g-3 mb-5">
          <div className="col-md-3">
            <div className="glass-card p-3 shadow-sm border-start border-primary border-4 text-start h-100">
              <span className="text-secondary mb-1 d-block stat-card-label">CONDUCTED SESSIONS</span>
              <span className="text-primary font-monospace stat-card-number">{totalSessionsCount}</span>
              <small className="text-muted d-block mt-1">Excludes rejected requests</small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-card p-3 shadow-sm border-start border-success border-4 text-start h-100">
              <span className="text-secondary mb-1 d-block stat-card-label">VERIFIED SESSIONS</span>
              <span className="text-success font-monospace stat-card-number">{verifiedSessionsCount}</span>
              <small className="text-muted d-block mt-1">Audit verification approved</small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-card p-3 shadow-sm border-start border-warning border-4 text-start h-100">
              <span className="text-secondary mb-1 d-block stat-card-label">FLAGGED FOR AUDIT</span>
              <span className="text-warning font-monospace stat-card-number">{flaggedSessionsCount}</span>
              <small className="text-muted d-block mt-1">Pending manual evaluation</small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-card p-3 shadow-sm border-start border-danger border-4 text-start h-100">
              <span className="text-secondary mb-1 d-block stat-card-label">REJECTED SESSIONS</span>
              <span className="text-danger font-monospace stat-card-number">{rejectedSessionsCount}</span>
              <small className="text-muted d-block mt-1">No attendance credited</small>
            </div>
          </div>
        </div>

        <div className="row justify-content-center">
          <div className="col-xl-11">
            
            <div className="text-center mb-5">
              <h1 className="dashboard-main-heading">Trainer Daily Attendance Logger</h1>
              <p className="dashboard-subtitle">
                Securely record session parameters, verify coordinates, and upload watermarked photo logs.
              </p>
            </div>

            {/* Attendance Intake Form */}
            <form onSubmit={handleSubmit}>
              <div className="row g-4">
                
                {/* LEFT: Intake Details Form */}
                <div className="col-lg-7">
                  <div className="glass-card p-4 h-100">
                    <h3 className="dashboard-section-heading mb-4">
                      <FaUser /> Session Attendance Details
                    </h3>

                    <div className="row g-3">
                      {/* Trainer Name (Locked Read-Only) */}
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-secondary">Trainer Name *</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0"><FaUser className="text-muted" /></span>
                          <input
                            type="text"
                            name="trainerName"
                            className="form-control border-start-0 bg-light text-dark fw-bold"
                            value={formData.trainerName}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                            required
                          />
                        </div>
                      </div>

                      {/* Employee ID (Locked Read-Only) */}
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-secondary">Employee ID *</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0"><FaIdCard className="text-muted" /></span>
                          <input
                            type="text"
                            name="employeeId"
                            className="form-control border-start-0 bg-light text-dark fw-bold"
                            value={formData.employeeId}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                            required
                          />
                        </div>
                      </div>

                      {/* College Name */}
                      <div className="col-md-6 text-start position-relative" ref={collegeDropdownRef}>
                        <label className="form-label fw-semibold text-secondary">College Name *</label>
                        <div className="input-group">
                          <span className="input-group-text bg-transparent border-end-0"><FaUniversity className="text-muted" /></span>
                          <input
                            type="text"
                            className="form-control border-start-0"
                            placeholder="Type to search or select college..."
                            value={formData.collegeName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                collegeName: val,
                                collegeCity: '',
                                collegeAddress: ''
                              }));
                              setShowCollegeDropdown(true);
                            }}
                            onFocus={() => setShowCollegeDropdown(true)}
                            required
                          />
                        </div>
                        
                        {showCollegeDropdown && (
                          <div className="position-absolute w-100 bg-white border rounded shadow-lg mt-1 overflow-auto" style={{ zIndex: 1000, maxHeight: '200px', left: 0, right: 0 }}>
                            {collegesList.filter(c => 
                              c.name.toLowerCase().includes(formData.collegeName.toLowerCase()) ||
                              c.city.toLowerCase().includes(formData.collegeName.toLowerCase())
                            ).length > 0 ? (
                              collegesList.filter(c => 
                                c.name.toLowerCase().includes(formData.collegeName.toLowerCase()) ||
                                c.city.toLowerCase().includes(formData.collegeName.toLowerCase())
                              ).map((c, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className="dropdown-item py-2 text-start small d-flex flex-column align-items-start w-100"
                                  style={{ borderBottom: '1px solid #f1f3f5' }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setFormData(prev => ({
                                      ...prev,
                                      collegeName: c.name,
                                      collegeCity: c.city,
                                      collegeAddress: c.address
                                    }));
                                    setShowCollegeDropdown(false);
                                  }}
                                >
                                  <span className="fw-semibold text-dark">{c.name}</span>
                                  <span className="text-muted" style={{ fontSize: '0.7rem' }}>📍 {c.city} - {c.address}</span>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center text-muted small">
                                No colleges found. Please select from the dropdown search list.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* College City */}
                      <div className="col-md-6 text-start">
                        <label className="form-label fw-semibold text-secondary">College City *</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0"><FaCity className="text-muted" /></span>
                          <input
                            type="text"
                            name="collegeCity"
                            className="form-control border-start-0 bg-light text-dark fw-bold"
                            placeholder="College City"
                            value={formData.collegeCity}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                            required
                          />
                        </div>
                      </div>

                      {/* College Address */}
                      <div className="col-12 text-start">
                        <label className="form-label fw-semibold text-secondary">College Address *</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0"><FaMapMarkerAlt className="text-muted" /></span>
                          <input
                            type="text"
                            name="collegeAddress"
                            className="form-control border-start-0 bg-light text-dark fw-bold"
                            placeholder="College Address"
                            value={formData.collegeAddress}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                            required
                          />
                        </div>

                        {isLocationMismatch && (
                          <div className="alert alert-warning border border-warning d-flex align-items-start gap-2.5 mt-2 mb-0" style={{ fontSize: '0.85rem' }}>
                            <FaExclamationTriangle className="fs-5 mt-0.5 text-warning" />
                            <div>
                              <h6 className="fw-bold m-0 text-warning-emphasis">Geotag Location Mismatch Warning</h6>
                              <p className="m-0 text-secondary small">Your current GPS location ({location.address || 'Unknown'}) does not match the city of the selected college ({formData.collegeCity}). This session will be flagged as a location mismatch.</p>
                            </div>
                          </div>
                        )}
                      </div>


                      {/* Subject */}
                      <div className="col-12">
                        <label className="form-label fw-semibold text-secondary">Subject / Course Taken *</label>
                        <div className="input-group">
                          <span className="input-group-text bg-transparent border-end-0"><FaBook className="text-muted" /></span>
                          <input
                            type="text"
                            name="subject"
                            className="form-control border-start-0"
                            placeholder="E.g., Advanced Fullstack Web Engineering"
                            value={formData.subject}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      {/* Training Date — auto-captured from Entry Photo geotag */}
                      <div className="col-12">
                        <label className="form-label fw-semibold text-secondary">Training Date</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0"><FaCalendarAlt className="text-muted" /></span>
                          <input
                            type="date"
                            name="trainingDate"
                            className="form-control border-start-0 bg-light text-dark fw-bold"
                            value={formData.trainingDate}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                        <small className="text-muted">Auto-detected from Entry Photo capture timestamp</small>
                      </div>

                      {/* Class Duration — user sets this, system auto-computes session window from Entry Photo time */}
                      <div className="col-12">
                        <label className="form-label fw-semibold text-secondary">
                          Class Duration * <small className="text-muted fw-normal">(session length)</small>
                        </label>
                        <div className="d-flex gap-2 align-items-center">
                          <div className="input-group flex-fill">
                            <span className="input-group-text bg-transparent border-end-0"><FaClock className="text-muted" /></span>
                            <select
                              className="form-select border-start-0"
                              value={classDurationHrs}
                              onChange={(e) => {
                                setClassDurationHrs(e.target.value);
                                // Reset photos if duration changes before entry is taken
                                if (!photos.entryFile) return;
                                setPhotos(prev => ({
                                  ...prev,
                                  entryFile: null, entryPreview: '',
                                  proof1File: null, proof1Preview: '',
                                  proof2File: null, proof2Preview: '',
                                  exitFile: null, exitPreview: ''
                                }));
                                setFormData(prev => ({
                                  ...prev,
                                  entryTime: '', exitTime: '',
                                  scheduledStartTime: '', scheduledEndTime: '',
                                  proof1Status: 'Pending', proof2Status: 'Pending'
                                }));
                              }}
                              required
                            >
                              <option value="">-- Hours --</option>
                              {[0,1,2,3,4,5,6,7,8].map(h => (
                                <option key={h} value={h}>{h} {h === 1 ? 'Hour' : 'Hours'}</option>
                              ))}
                            </select>
                          </div>
                          <div className="input-group flex-fill">
                            <select
                              className="form-select"
                              value={classDurationMins}
                              onChange={(e) => {
                                setClassDurationMins(e.target.value);
                                if (!photos.entryFile) return;
                                setPhotos(prev => ({
                                  ...prev,
                                  entryFile: null, entryPreview: '',
                                  proof1File: null, proof1Preview: '',
                                  proof2File: null, proof2Preview: '',
                                  exitFile: null, exitPreview: ''
                                }));
                                setFormData(prev => ({
                                  ...prev,
                                  entryTime: '', exitTime: '',
                                  scheduledStartTime: '', scheduledEndTime: '',
                                  proof1Status: 'Pending', proof2Status: 'Pending'
                                }));
                              }}
                            >
                              {[0, 15, 30, 45].map(m => (
                                <option key={m} value={m}>{m} {m === 1 ? 'Minute' : 'Minutes'}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <small className="text-muted">
                          {classDurationTotalMins > 0
                            ? `Session window auto-computed from Entry Photo capture time + ${getExpectedText(classDurationTotalMins)}`
                            : 'Set session length — all timing windows will be calculated automatically.'}
                        </small>
                      </div>

                      {/* Auto-computed Session Window (shown after Entry Photo is captured) */}
                      {formData.scheduledStartTime && formData.scheduledEndTime && (
                        <div className="col-12">
                          <div className="p-3 rounded border border-success bg-success bg-opacity-10 d-flex flex-wrap gap-3 align-items-center">
                            <FaClock className="text-success fs-5" />
                            <div>
                              <span className="fw-bold text-success d-block" style={{ fontSize: '0.85rem' }}>Session Window Auto-Set</span>
                              <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                                Start: <b>{formatTimeTo12Hour(formData.scheduledStartTime)}</b> &nbsp;|&nbsp;
                                End: <b>{formatTimeTo12Hour(formData.scheduledEndTime)}</b> &nbsp;|&nbsp;
                                Duration: <b>{getExpectedText(expectedMinutes)}</b>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Entry Time (auto-captured) */}
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-secondary">Entry Time *</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0"><FaClock className="text-muted" /></span>
                          <input
                            type="time"
                            name="entryTime"
                            className="form-control border-start-0 bg-light text-dark fw-bold"
                            value={formData.entryTime}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                            required
                          />
                        </div>
                        <small className="text-muted">Auto-captured on Entry Photo camera capture</small>
                      </div>

                      {/* Exit Time (auto-captured) */}
                      <div className="col-md-6">
                        <label className="form-label fw-semibold text-secondary">Exit Time *</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0"><FaClock className="text-muted" /></span>
                          <input
                            type="time"
                            name="exitTime"
                            className="form-control border-start-0 bg-light text-dark fw-bold"
                            value={formData.exitTime}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                            required
                          />
                        </div>
                        <small className="text-muted">Auto-captured on Exit Photo camera capture</small>
                      </div>

                      {/* Working Hours Display */}
                      <div className="col-12 mt-3">
                        <div className="p-3 rounded bg-light border d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-semibold text-secondary d-block">Conducted Hours (GeoTags Interval)</span>
                            <small className="text-muted">Expected: {expectedText}</small>
                          </div>
                          <span className="fs-4 fw-bold text-primary font-monospace">
                            Worked {conductedText}
                          </span>
                        </div>
                        {isCrossDateConflict && (
                          <div className="alert alert-danger border border-danger d-flex align-items-start gap-2.5 mt-3" style={{ fontSize: '0.85rem' }}>
                            <FaExclamationTriangle className="fs-5 mt-0.5 text-danger" />
                            <div>
                              <h6 className="fw-bold m-0 text-danger-emphasis">Date Discrepancy Warning</h6>
                              <p className="m-0 text-secondary small">Entry photo and Exit photo dates do not match. Both check-ins must be on the same calendar day.</p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>

                {/* RIGHT: GPS Location, Map Preview & Photos */}
                <div className="col-lg-5">
                  <div className="row g-4">
                    
                    {/* Location coordinates tracker */}
                    <div className="col-12">
                      <div className="glass-card p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h3 className="dashboard-section-heading m-0">
                            <FaMapMarkerAlt /> Live Coordinates
                          </h3>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary rounded-pill px-3"
                            onClick={fetchGeolocation}
                            disabled={location.loading}
                          >
                            {location.loading ? 'Tracking...' : 'Refresh GPS'}
                          </button>
                        </div>

                        {location.loading && (
                          <div className="py-2 text-center">
                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                            <small className="text-secondary">Pinging satellites...</small>
                          </div>
                        )}

                        {!location.loading && location.error && (
                          <div className="p-2 bg-danger-subtle text-danger rounded d-flex align-items-center gap-2" style={{ fontSize: '0.8rem' }}>
                            <FaExclamationTriangle />
                            <span>{location.error}</span>
                          </div>
                        )}

                        {!location.loading && location.latitude && (
                          <div>
                            <div className="row g-2 mb-2">
                              <div className="col-6 bg-light border p-2 rounded text-center">
                                <small className="text-secondary d-block" style={{ fontSize: '0.75rem' }}>LATITUDE</small>
                                <span className="font-monospace fw-bold text-primary">{location.latitude.toFixed(6)}</span>
                              </div>
                              <div className="col-6 bg-light border p-2 rounded text-center">
                                <small className="text-secondary d-block" style={{ fontSize: '0.75rem' }}>LONGITUDE</small>
                                <span className="font-monospace fw-bold text-primary">{location.longitude.toFixed(6)}</span>
                              </div>
                            </div>
                            
                            {/* Embedded Google Map Preview */}
                            <div className="mb-2 rounded overflow-hidden border" style={{ height: '140px' }}>
                              <iframe
                                title="GPS Preview"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                src={embedMapsUrl}
                                style={{ border: 0 }}
                              ></iframe>
                            </div>

                            <div className="p-2 bg-light border rounded">
                              <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>RESOLVED ADDRESS</small>
                              <span className="text-secondary" style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>{location.address}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* GeoTag Photos */}
                    <div className="col-12">
                      <div className="glass-card p-4">
                        <h3 className="dashboard-section-heading mb-4">
                          <FaCamera /> GeoTag Photo Logs
                        </h3>

                        <div className="row g-3">
                          {/* 1. Entry Photo */}
                          <div className="col-md-6">
                            <label className="form-label fw-semibold text-secondary d-block">1. Entry Photo *</label>
                            {cameraActive.entry ? (
                              <div className="position-relative bg-dark rounded overflow-hidden d-flex flex-column align-items-center border" style={{ height: '240px' }}>
                                <video 
                                  ref={entryVideoRef} 
                                  autoPlay 
                                  playsInline 
                                  muted
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div className="d-flex flex-column gap-2 position-absolute bottom-0 start-0 w-100 p-2 bg-black bg-opacity-70" style={{ zIndex: 10 }}>
                                  <button 
                                    type="button" 
                                    className="btn btn-sm btn-primary w-100 py-2 rounded-pill fw-bold" 
                                    onClick={() => capturePhoto('entry')}
                                  >
                                    Snap Entry Photo
                                  </button>
                                  <div className="d-flex gap-2 w-100">
                                    <button 
                                      type="button" 
                                      className="btn btn-xs btn-outline-info flex-fill py-1 rounded-pill fw-bold" 
                                      onClick={() => toggleFacingMode('entry')}
                                    >
                                      Switch Cam
                                    </button>
                                    <button 
                                      type="button" 
                                      className="btn btn-xs btn-outline-light flex-fill py-1 rounded-pill fw-bold" 
                                      onClick={() => stopCamera('entry')}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : photos.entryPreview ? (
                              <div className="position-relative border rounded p-1 text-center bg-light">
                                <img 
                                  src={photos.entryPreview} 
                                  alt="Entry Preview" 
                                  className="img-fluid rounded" 
                                  style={{ maxHeight: '180px', width: '100%', objectFit: 'contain' }} 
                                />
                                <span className="position-absolute bottom-0 start-0 w-100 bg-dark text-white py-1" style={{ fontSize: '0.65rem', opacity: 0.85 }}>
                                  Entry Photo Saved
                                </span>
                                <button 
                                  type="button"
                                  className={`btn btn-xs rounded-pill px-2.5 position-absolute top-0 end-0 m-2 shadow-sm ${photos.proof1File ? 'btn-secondary opacity-50' : 'btn-danger'}`}
                                  disabled={!!photos.proof1File}
                                  title={photos.proof1File ? 'Locked — Proof 1 already captured. Cannot retake Entry Photo.' : 'Retake Entry Photo'}
                                  onClick={() => {
                                    const hasDownstream = photos.proof1File || photos.proof2File || photos.exitFile;
                                    if (hasDownstream) {
                                      setLateConfirm({
                                        title: 'Session Reset Warning',
                                        message: '⚠️ Retaking the Entry Photo will reset your session window and delete all subsequent photos (Proof 1, Proof 2, Exit). Are you sure?',
                                        confirmLabel: 'Yes, Retake Entry',
                                        cancelLabel: 'Keep Current Photos',
                                        confirmClass: 'btn-danger',
                                        onConfirm: () => {
                                          setLateConfirm(null);
                                          startCamera('entry');
                                        },
                                        onCancel: () => setLateConfirm(null),
                                      });
                                    } else {
                                      startCamera('entry');
                                    }
                                  }}
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  {photos.proof1File ? '🔒 Locked' : 'Retake'}
                                </button>
                              </div>
                            ) : (
                              <div 
                                className={`border border-dashed rounded p-4 text-center bg-light ${entryStatus.disabled ? 'opacity-50' : 'cursor-pointer hover-scale'}`}
                                style={{ borderStyle: 'dashed', borderWidth: '2px', cursor: entryStatus.disabled ? 'not-allowed' : 'pointer', minHeight: '180px' }}
                                onClick={() => {
                                  if (entryStatus.disabled) {
                                    showToast(entryStatus.message, 'warning');
                                  } else {
                                    startCamera('entry');
                                  }
                                }}
                              >
                                {photos.entryWatermarking ? (
                                  <div className="py-4">
                                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                    <span className="d-block text-secondary mt-2 small">Processing Watermark...</span>
                                  </div>
                                ) : (
                                  <>
                                    <FaCamera className="text-primary fs-3 mb-2" />
                                    <span className="d-block text-secondary small fw-bold">Capture Entry Photo</span>
                                    <span className={`badge mb-2 ${entryStatus.status === 'open' ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                                      {entryStatus.message}
                                    </span>
                                    <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Snaps live image via webcam</small>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 2. Proof of Entry (Proof 1) */}
                          <div className="col-md-6">
                            <label className="form-label fw-semibold text-secondary d-block">2. Proof of Entry (Proof 1) *</label>
                            {cameraActive.proof1 ? (
                              <div className="position-relative bg-dark rounded overflow-hidden d-flex flex-column align-items-center border" style={{ height: '240px' }}>
                                <video 
                                  ref={proof1VideoRef} 
                                  autoPlay 
                                  playsInline 
                                  muted
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div className="d-flex flex-column gap-2 position-absolute bottom-0 start-0 w-100 p-2 bg-black bg-opacity-70" style={{ zIndex: 10 }}>
                                  <button 
                                    type="button" 
                                    className="btn btn-sm btn-primary w-100 py-2 rounded-pill fw-bold" 
                                    onClick={() => capturePhoto('proof1')}
                                  >
                                    Snap Proof of Entry
                                  </button>
                                  <div className="d-flex gap-2 w-100">
                                    <button 
                                      type="button" 
                                      className="btn btn-xs btn-outline-info flex-fill py-1 rounded-pill fw-bold" 
                                      onClick={() => toggleFacingMode('proof1')}
                                    >
                                      Switch Cam
                                    </button>
                                    <button 
                                      type="button" 
                                      className="btn btn-xs btn-outline-light flex-fill py-1 rounded-pill fw-bold" 
                                      onClick={() => stopCamera('proof1')}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : photos.proof1Preview ? (
                              <div className="position-relative border rounded p-1 text-center bg-light">
                                <img 
                                  src={photos.proof1Preview} 
                                  alt="Proof 1 Preview" 
                                  className="img-fluid rounded" 
                                  style={{ maxHeight: '180px', width: '100%', objectFit: 'contain' }} 
                                />
                                <span className="position-absolute bottom-0 start-0 w-100 bg-dark text-white py-1" style={{ fontSize: '0.65rem', opacity: 0.85 }}>
                                  Proof 1 (Entry) GeoTag Saved
                                </span>
                                <button 
                                  type="button"
                                  className={`btn btn-xs rounded-pill px-2.5 position-absolute top-0 end-0 m-2 shadow-sm ${photos.proof2File ? 'btn-secondary opacity-50' : 'btn-danger'}`}
                                  disabled={!!photos.proof2File}
                                  title={photos.proof2File ? 'Locked — Proof 2 already captured. Cannot retake Proof 1.' : 'Retake Proof 1'}
                                  onClick={() => startCamera('proof1')}
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  {photos.proof2File ? '🔒 Locked' : 'Retake'}
                                </button>
                              </div>
                            ) : (
                              <div 
                                className={`border border-dashed rounded p-4 text-center bg-light ${proof1StatusVal.disabled ? 'opacity-50' : 'cursor-pointer hover-scale'}`}
                                style={{ borderStyle: 'dashed', borderWidth: '2px', cursor: proof1StatusVal.disabled ? 'not-allowed' : 'pointer', minHeight: '180px' }}
                                onClick={() => {
                                  if (proof1StatusVal.disabled) {
                                    showToast(proof1StatusVal.message, 'warning');
                                  } else {
                                    startCamera('proof1');
                                  }
                                }}
                              >
                                {photos.proof1Watermarking ? (
                                  <div className="py-4">
                                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                    <span className="d-block text-secondary mt-2 small">Processing Watermark...</span>
                                  </div>
                                ) : (
                                  <>
                                    <FaCamera className="text-primary fs-3 mb-2" />
                                    <span className="d-block text-secondary small fw-bold">Capture Proof of Entry (Proof 1)</span>
                                    <span className={`badge mb-2 ${proof1StatusVal.status === 'on_time' ? 'bg-success' : proof1StatusVal.status === 'late' ? 'bg-warning text-dark' : 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                                      {proof1StatusVal.message}
                                    </span>
                                    <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Snaps live image via webcam</small>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 3. Proof of Exit (Proof 2) */}
                          <div className="col-md-6">
                            <label className="form-label fw-semibold text-secondary d-block">3. Proof of Exit (Proof 2) *</label>
                            {cameraActive.proof2 ? (
                              <div className="position-relative bg-dark rounded overflow-hidden d-flex flex-column align-items-center border" style={{ height: '240px' }}>
                                <video 
                                  ref={proof2VideoRef} 
                                  autoPlay 
                                  playsInline 
                                  muted
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div className="d-flex flex-column gap-2 position-absolute bottom-0 start-0 w-100 p-2 bg-black bg-opacity-70" style={{ zIndex: 10 }}>
                                  <button 
                                    type="button" 
                                    className="btn btn-sm btn-primary w-100 py-2 rounded-pill fw-bold" 
                                    onClick={() => capturePhoto('proof2')}
                                  >
                                    Snap Proof of Exit
                                  </button>
                                  <div className="d-flex gap-2 w-100">
                                    <button 
                                      type="button" 
                                      className="btn btn-xs btn-outline-info flex-fill py-1 rounded-pill fw-bold" 
                                      onClick={() => toggleFacingMode('proof2')}
                                    >
                                      Switch Cam
                                    </button>
                                    <button 
                                      type="button" 
                                      className="btn btn-xs btn-outline-light flex-fill py-1 rounded-pill fw-bold" 
                                      onClick={() => stopCamera('proof2')}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : photos.proof2Preview ? (
                              <div className="position-relative border rounded p-1 text-center bg-light">
                                <img 
                                  src={photos.proof2Preview} 
                                  alt="Proof 2 Preview" 
                                  className="img-fluid rounded" 
                                  style={{ maxHeight: '180px', width: '100%', objectFit: 'contain' }} 
                                />
                                <span className="position-absolute bottom-0 start-0 w-100 bg-dark text-white py-1" style={{ fontSize: '0.65rem', opacity: 0.85 }}>
                                  Proof 2 (Exit) GeoTag Saved
                                </span>
                                <button 
                                  type="button"
                                  className={`btn btn-xs rounded-pill px-2.5 position-absolute top-0 end-0 m-2 shadow-sm ${photos.exitFile ? 'btn-secondary opacity-50' : 'btn-danger'}`}
                                  disabled={!!photos.exitFile}
                                  title={photos.exitFile ? 'Locked — Exit Photo already captured. Cannot retake Proof 2.' : 'Retake Proof 2'}
                                  onClick={() => startCamera('proof2')}
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  {photos.exitFile ? '🔒 Locked' : 'Retake'}
                                </button>
                              </div>
                            ) : (
                              <div 
                                className={`border border-dashed rounded p-4 text-center bg-light ${proof2StatusVal.disabled ? 'opacity-50' : 'cursor-pointer hover-scale'}`}
                                style={{ borderStyle: 'dashed', borderWidth: '2px', cursor: proof2StatusVal.disabled ? 'not-allowed' : 'pointer', minHeight: '180px' }}
                                onClick={() => {
                                  if (proof2StatusVal.disabled) {
                                    showToast(proof2StatusVal.message, 'warning');
                                  } else {
                                    startCamera('proof2');
                                  }
                                }}
                              >
                                {photos.proof2Watermarking ? (
                                  <div className="py-4">
                                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                    <span className="d-block text-secondary mt-2 small">Processing Watermark...</span>
                                  </div>
                                ) : (
                                  <>
                                    <FaCamera className="text-primary fs-3 mb-2" />
                                    <span className="d-block text-secondary small fw-bold">Capture Proof of Exit (Proof 2)</span>
                                    <span className={`badge mb-2 ${proof2StatusVal.status === 'on_time' ? 'bg-success' : proof2StatusVal.status === 'late' ? 'bg-warning text-dark' : 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                                      {proof2StatusVal.message}
                                    </span>
                                    <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Snaps live image via webcam</small>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 4. Exit Photo */}
                          <div className="col-md-6">
                            <label className="form-label fw-semibold text-secondary d-block">4. Exit Photo *</label>
                            {cameraActive.exit ? (
                              <div className="position-relative bg-dark rounded overflow-hidden d-flex flex-column align-items-center border" style={{ height: '240px' }}>
                                <video 
                                  ref={exitVideoRef} 
                                  autoPlay 
                                  playsInline 
                                  muted
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div className="d-flex flex-column gap-2 position-absolute bottom-0 start-0 w-100 p-2 bg-black bg-opacity-70" style={{ zIndex: 10 }}>
                                  <button 
                                    type="button" 
                                    className="btn btn-sm btn-primary w-100 py-2 rounded-pill fw-bold" 
                                    onClick={() => capturePhoto('exit')}
                                  >
                                    Snap Exit Photo
                                  </button>
                                  <div className="d-flex gap-2 w-100">
                                    <button 
                                      type="button" 
                                      className="btn btn-xs btn-outline-info flex-fill py-1 rounded-pill fw-bold" 
                                      onClick={() => toggleFacingMode('exit')}
                                    >
                                      Switch Cam
                                    </button>
                                    <button 
                                      type="button" 
                                      className="btn btn-xs btn-outline-light flex-fill py-1 rounded-pill fw-bold" 
                                      onClick={() => stopCamera('exit')}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : photos.exitPreview ? (
                              <div className="position-relative border rounded p-1 text-center bg-light">
                                <img 
                                  src={photos.exitPreview} 
                                  alt="Exit Preview" 
                                  className="img-fluid rounded" 
                                  style={{ maxHeight: '180px', width: '100%', objectFit: 'contain' }} 
                                />
                                <span className="position-absolute bottom-0 start-0 w-100 bg-dark text-white py-1" style={{ fontSize: '0.65rem', opacity: 0.85 }}>
                                  Exit Photo Saved
                                </span>
                                <button 
                                  type="button"
                                  className="btn btn-xs btn-danger rounded-pill px-2.5 position-absolute top-0 end-0 m-2 shadow-sm"
                                  onClick={() => startCamera('exit')}
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  Retake
                                </button>
                              </div>
                            ) : (
                              <div 
                                className={`border border-dashed rounded p-4 text-center bg-light ${exitStatus.disabled ? 'opacity-50' : 'cursor-pointer hover-scale'}`}
                                style={{ borderStyle: 'dashed', borderWidth: '2px', cursor: exitStatus.disabled ? 'not-allowed' : 'pointer', minHeight: '180px' }}
                                onClick={() => {
                                  if (exitStatus.disabled) {
                                    showToast(exitStatus.message, 'warning');
                                  } else {
                                    startCamera('exit');
                                  }
                                }}
                              >
                                {photos.exitWatermarking ? (
                                  <div className="py-4">
                                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                    <span className="d-block text-secondary mt-2 small">Processing Watermark...</span>
                                  </div>
                                ) : (
                                  <>
                                    <FaCamera className="text-primary fs-3 mb-2" />
                                    <span className="d-block text-secondary small fw-bold">Capture Exit Photo</span>
                                    <span className={`badge mb-2 ${exitStatus.status === 'open' ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                                      {exitStatus.message}
                                    </span>
                                    <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Snaps live image via webcam</small>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warnings Section */}

                {isDurationShort && (
                  <div className="col-12">
                    <div className="alert alert-warning border border-warning d-flex align-items-center gap-2 mb-0">
                      <FaExclamationTriangle className="fs-5" />
                      <div>
                        <strong>Verification Warning:</strong> Your actual GeoTag duration (<strong>{conductedText}</strong>) is less than the scheduled Class Hours (<strong>{expectedText}</strong>). You may submit, but this record will be flagged for administrator review.
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Submit */}
                <div className="col-12 mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 py-3 rounded-pill hover-scale fw-bold d-flex align-items-center justify-content-center gap-2"
                    disabled={isSubmitting || photos.entryWatermarking || photos.exitWatermarking}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Saving GeoTag Session...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle /> Save Attendance & Upload GeoTags
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`btn w-100 mt-2 py-2 rounded-pill fw-bold hover-scale transition-all ${confirmReset ? 'btn-danger shadow-lg animate-pulse' : 'btn-outline-danger'}`}
                    onClick={() => {
                      if (!confirmReset) {
                        setConfirmReset(true);
                        resetTimeoutRef.current = setTimeout(() => {
                          setConfirmReset(false);
                        }, 4000);
                      } else {
                        if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
                        setConfirmReset(false);
                        setIsResetting(true);
                        localStorage.removeItem('active_checkin_session');
                        setHasSavedSession(false);
                        setFormData(prev => ({
                          ...prev,
                          collegeName: '',
                          collegeCity: '',
                          collegeAddress: '',
                          subject: '',
                          trainingDate: new Date().toISOString().split('T')[0],
                          entryTime: '',
                          exitTime: '',
                          scheduledStartTime: '',
                          scheduledEndTime: '',
                          proof1Status: 'Pending',
                          proof1ExpectedWindow: '',
                          proof1ActualTime: '',
                          proof1DelayMinutes: 0,
                          proof2Status: 'Pending',
                          proof2ExpectedWindow: '',
                          proof2ActualTime: '',
                          proof2DelayMinutes: 0,
                        }));
                        setPhotos({
                          entryFile: null,
                          entryPreview: '',
                          entryWatermarking: false,
                          proof1File: null,
                          proof1Preview: '',
                          proof1Watermarking: false,
                          proof2File: null,
                          proof2Preview: '',
                          proof2Watermarking: false,
                          exitFile: null,
                          exitPreview: '',
                          exitWatermarking: false
                        });
                        setClassDurationHrs('');
                        setClassDurationMins('0');
                        setConductedMinutes(0);
                        setConductedText('0 Hours 0 Minutes');
                        
                        // Stop cameras if active
                        stopCamera('entry');
                        stopCamera('proof1');
                        stopCamera('proof2');
                        stopCamera('exit');

                        // Clear file input DOM nodes
                        if (entryInputRef.current) entryInputRef.current.value = '';
                        if (exitInputRef.current) exitInputRef.current.value = '';

                        // Refresh/capture geotag location from scratch
                        fetchGeolocation();

                        showToast("Check-in session cleared successfully.", "info");
                      }
                    }}
                  >
                    {confirmReset ? "⚠️ Are you sure? Click again to Confirm" : "Reset Form / Clear Active Session"}
                  </button>
                </div>

              </div>
            </form>

            {/* --- PREVIOUS SUBMISSIONS WORKFLOW SECTION --- */}
            <div className="row mt-5">
              <div className="col-12">
                <div className="glass-card p-4 shadow-sm">
                  
                  {/* Section Title & View Toggle Controls */}
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-bottom pb-3 mb-4 gap-3">
                    <h3 className="dashboard-section-heading m-0">
                      <FaHistory className="text-primary" /> Attendance Log History
                    </h3>
                    
                    <div className="d-flex p-1 bg-light border rounded-pill" style={{ maxWidth: '300px' }}>
                      <button
                        type="button"
                        className={`btn btn-sm px-3 rounded-pill border-0 fw-bold ${viewMode === 'list' ? 'btn-primary' : 'text-secondary bg-transparent'}`}
                        onClick={() => setViewMode('list')}
                      >
                        List Table
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm px-3 rounded-pill border-0 fw-bold ${viewMode === 'calendar' ? 'btn-primary' : 'text-secondary bg-transparent'}`}
                        onClick={() => {
                          setViewMode('calendar');
                          const today = new Date().toISOString().split('T')[0];
                          setSelectedCalDate(today);
                        }}
                      >
                        Calendar View
                      </button>
                    </div>
                  </div>

                  {historyLoading ? (
                    <div className="py-5 text-center">
                      <div className="spinner-border text-primary" role="status"></div>
                      <p className="text-secondary mt-2 mb-0">Loading your history logs...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="py-5 text-center">
                      <p className="text-secondary m-0">No previous submissions found. Submit your first attendance log above!</p>
                    </div>
                  ) : viewMode === 'list' ? (
                    
                    /* TABLE VIEW */
                    <div className="table-responsive">
                      <table className="table custom-table align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>College Name</th>
                            <th>Subject</th>
                            <th>Date</th>
                            <th>Timings</th>
                            <th>Class Hours</th>
                            <th>Conducted Hours</th>
                            <th>Status</th>
                            <th className="text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item) => (
                            <tr key={item._id}>
                              <td className="fw-semibold text-primary-theme">{item.collegeName}</td>
                              <td className="text-secondary">{item.subject}</td>
                              <td><FaCalendarAlt className="text-muted me-1" /> {item.trainingDate}</td>
                              <td className="font-monospace text-secondary" style={{ fontSize: '0.75rem' }}>
                                <FaClock className="text-muted me-1" /> {item.entryTime} - {item.exitTime}
                              </td>
                              <td className="font-monospace">{item.classHours}</td>
                              <td className="font-monospace fw-bold text-primary">{item.workingHours}</td>
                              <td>
                                {item.status === 'Flagged' ? (
                                  <span className="badge bg-warning bg-opacity-15 text-warning fw-bold px-2 py-1" title={item.statusMessage}>
                                    <FaExclamationTriangle className="me-1" /> Flagged
                                  </span>
                                ) : item.status === 'Rejected' ? (
                                  <span className="badge bg-danger bg-opacity-15 text-danger fw-bold px-2 py-1" title={item.statusMessage}>
                                    ❌ Rejected
                                  </span>
                                ) : (
                                  <span className="badge bg-success bg-opacity-10 text-success fw-semibold px-2 py-1">
                                    Verified
                                  </span>
                                )}
                              </td>
                              <td className="text-center">
                                <div className="d-inline-flex gap-1.5">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary rounded-circle p-2 d-flex align-items-center justify-content-center hover-scale"
                                    style={{ width: '30px', height: '30px' }}
                                    onClick={() => { setSelectedRecord(item); setFocusComments(false); }}
                                    title="View Details"
                                  >
                                    <FaEye />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-info rounded-circle p-2 d-flex align-items-center justify-content-center hover-scale position-relative"
                                    style={{ width: '30px', height: '30px' }}
                                    onClick={() => { setSelectedRecord(item); setFocusComments(true); }}
                                    title="Comments & Feedback"
                                  >
                                    <FaComment />
                                    {getUnreadCommentsCount(item, user) > 0 && (
                                      <span 
                                        className="position-absolute badge rounded-circle bg-info text-white d-flex align-items-center justify-content-center border border-white animate-pulse"
                                        style={{ 
                                          fontSize: '0.6rem', 
                                          width: '16px', 
                                          height: '16px', 
                                          top: '-5px', 
                                          right: '-5px', 
                                          padding: '0' 
                                        }}
                                      >
                                        1
                                      </span>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    
                    /* INTERACTIVE CALENDAR VIEW */
                    <div className="row g-4">
                      <div className="col-lg-8">
                        <div className="p-3 bg-light rounded-4 border">
                          
                          {/* Calendar Navigation */}
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="h6 fw-bold m-0 text-primary-theme font-monospace">
                              {calDate.toLocaleDateString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
                            </h4>
                            <div className="d-flex gap-1.5">
                              <button type="button" className="btn btn-sm btn-outline-secondary rounded-circle" onClick={handlePrevMonth}>
                                <FaChevronLeft />
                              </button>
                              <button type="button" className="btn btn-sm btn-outline-secondary rounded-circle" onClick={handleNextMonth}>
                                <FaChevronRight />
                              </button>
                            </div>
                          </div>

                          {/* Day Labels */}
                          <div className="calendar-grid text-muted fw-bold mb-1">
                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(label => (
                              <div key={label} className="calendar-day-header">{label}</div>
                            ))}
                          </div>

                          {/* Month Cells Grid */}
                          <div className="calendar-grid">
                            {calendarCells.map((cell, index) => {
                              if (cell.differentMonth) {
                                return <div key={`empty-${index}`} className="calendar-cell different-month"></div>;
                              }
                              
                              const isSelected = selectedCalDate === cell.dateStr;
                              const hasSessions = cell.sessions && cell.sessions.length > 0;

                              return (
                                <div
                                  key={`cell-${cell.dateStr}`}
                                  className={`calendar-cell ${isSelected ? 'active-selected' : ''}`}
                                  onClick={() => setSelectedCalDate(cell.dateStr)}
                                >
                                  <span className="calendar-date-number">{cell.day}</span>
                                  
                                  {hasSessions && (
                                    <div className="d-flex flex-wrap gap-1 align-items-center mt-1">
                                      <span className="calendar-session-count">
                                        {cell.sessions.length} {cell.sessions.length === 1 ? 'Sess' : 'Sesses'}
                                      </span>
                                      
                                      <div className="d-flex gap-1">
                                        {cell.sessions.map((sess, sIdx) => {
                                          let dotColor = '#10b981'; // Verified
                                          if (sess.status === 'Flagged') dotColor = '#f59e0b';
                                          if (sess.status === 'Rejected') dotColor = '#ef4444';
                                          return (
                                            <span 
                                              key={sess._id || sIdx} 
                                              className="calendar-session-dot d-inline-block" 
                                              style={{ backgroundColor: dotColor }}
                                              title={`${sess.collegeName}: ${sess.entryTime} - ${sess.exitTime}`}
                                            ></span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* SELECTED DATE DETAILS SIDEBAR */}
                      <div className="col-lg-4">
                        <div className="p-3 bg-light rounded-4 border h-100 d-flex flex-column">
                          <h4 className="h6 fw-bold border-bottom pb-2 text-secondary mb-3">
                            📅 Sessions on {selectedCalDate ? new Date(selectedCalDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Selected Date'}
                          </h4>

                          {selectedDaySessions.length === 0 ? (
                            <div className="flex-grow-1 d-flex align-items-center justify-content-center py-5">
                              <p className="text-muted small m-0 text-center">No training sessions conducted on this date.</p>
                            </div>
                          ) : (
                            <div className="d-flex flex-column gap-3 overflow-y-auto" style={{ maxHeight: '420px' }}>
                              {selectedDaySessions.map((session) => (
                                <div key={session._id} className="p-3 bg-white rounded-3 border shadow-sm">
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <span className="fw-bold text-primary-theme d-block text-truncate" style={{ maxWidth: '160px' }} title={session.collegeName}>
                                      {session.collegeName}
                                    </span>
                                    
                                    {session.status === 'Flagged' ? (
                                      <span className="badge bg-warning bg-opacity-15 text-warning fw-bold px-2 py-0.5" style={{ fontSize: '0.65rem' }}>
                                        Flagged
                                      </span>
                                    ) : session.status === 'Rejected' ? (
                                      <span className="badge bg-danger bg-opacity-15 text-danger fw-bold px-2 py-0.5" style={{ fontSize: '0.65rem' }}>
                                        Rejected
                                      </span>
                                    ) : (
                                      <span className="badge bg-success bg-opacity-10 text-success fw-semibold px-2 py-0.5" style={{ fontSize: '0.65rem' }}>
                                        Verified
                                      </span>
                                    )}
                                  </div>

                                  <div className="small text-secondary mb-1">
                                    <strong>Subject:</strong> {session.subject}
                                  </div>
                                  <div className="small text-secondary font-monospace d-flex align-items-center gap-1 mb-3">
                                    <FaClock className="text-muted" /> {session.entryTime} - {session.exitTime}
                                  </div>

                                  <div className="d-flex gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-outline-primary py-1 px-2.5 rounded-pill d-inline-flex align-items-center gap-1"
                                      style={{ fontSize: '0.75rem' }}
                                      onClick={() => { setSelectedRecord(session); setFocusComments(false); }}
                                    >
                                      <FaEye /> View
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-outline-info py-1 px-2.5 rounded-pill d-inline-flex align-items-center gap-1 position-relative"
                                      style={{ fontSize: '0.75rem' }}
                                      onClick={() => { setSelectedRecord(session); setFocusComments(true); }}
                                    >
                                      <FaComment /> Comments
                                      {getUnreadCommentsCount(session, user) > 0 && (
                                        <span 
                                          className="position-absolute badge rounded-circle bg-info text-white d-flex align-items-center justify-content-center border border-white animate-pulse"
                                          style={{ 
                                            fontSize: '0.6rem', 
                                            width: '16px', 
                                            height: '16px', 
                                            top: '-5px', 
                                            right: '-5px', 
                                            padding: '0' 
                                          }}
                                        >
                                          1
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

             {/* History Detail Modal */}
            {selectedRecord && (
              <RecordModal
                record={selectedRecord}
                onClose={() => setSelectedRecord(null)}
                onRecordUpdate={handleRecordUpdate}
                API_URL={API_URL}
                autoFocusComment={focusComments}
              />
            )}

            {/* Late Verification Confirmation Modal */}
            {lateConfirm && (
              <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', zIndex: 1100 }}>
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content glass-card border border-warning shadow-2xl p-3">
                    <div className="modal-body text-center py-4">
                      <FaExclamationTriangle className="text-warning fs-1 mb-3 animate-pulse" />
                      <h4 className="fw-extrabold text-warning-emphasis mb-3">
                        {lateConfirm.title || 'Late Verification Alert'}
                      </h4>
                      <p className="text-secondary small font-sans mb-4" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {lateConfirm.message}
                      </p>
                      <div className="d-flex gap-3 justify-content-center">
                        <button 
                          type="button" 
                          className="btn btn-secondary px-4 rounded-pill fw-bold" 
                          onClick={lateConfirm.onCancel}
                        >
                          {lateConfirm.cancelLabel || 'Cancel Capture'}
                        </button>
                        <button 
                          type="button" 
                          className={`btn ${lateConfirm.confirmClass || 'btn-warning'} px-4 rounded-pill fw-bold hover-scale`}
                          onClick={lateConfirm.onConfirm}
                        >
                          {lateConfirm.confirmLabel || 'Confirm & Capture'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}



          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerDashboard;
