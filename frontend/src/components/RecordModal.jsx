import React, { useState, useEffect, useRef } from 'react';
import { useApp, api } from '../context/AppContext';
import { 
  FaTimes, FaUser, FaIdCard, FaUniversity, FaBook, 
  FaCalendarAlt, FaClock, FaMapMarkerAlt, FaExternalLinkAlt, FaCity, 
  FaCamera,
  FaExclamationTriangle, FaCheckCircle, FaComments, FaComment, FaPaperPlane
} from 'react-icons/fa';

const RecordModal = ({ record: initialRecord, onClose, onApproveClick, onRejectClick, onRecordUpdate, API_URL, autoFocusComment }) => {
  const { showToast, user } = useApp();
  const [record, setRecord] = useState(initialRecord);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentSectionRef = useRef(null);

  useEffect(() => {
    setRecord(initialRecord);
    setCommentText('');
    if (initialRecord) {
      const readKey = user ? `last_read_comments_${user._id || user.username}_${initialRecord._id}` : `last_read_comments_${initialRecord._id}`;
      localStorage.setItem(readKey, Date.now());
      window.dispatchEvent(new Event('comments_read_update'));
    }
  }, [initialRecord, user]);

  useEffect(() => {
    if (autoFocusComment && commentSectionRef.current) {
      setTimeout(() => {
        commentSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const inputEl = commentSectionRef.current.querySelector('textarea, input');
        if (inputEl) inputEl.focus();
      }, 300);
    }
  }, [autoFocusComment, initialRecord]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await api.post(`/records/${record._id}/comments`, {
        text: commentText.trim()
      });
      if (response.data.success) {
        showToast('Comment added successfully!', 'success');
        const updated = response.data.data;
        localStorage.setItem(`last_read_comments_${updated._id}`, Date.now());
        window.dispatchEvent(new Event('comments_read_update'));
        setRecord(updated);
        setCommentText('');
        if (onRecordUpdate) {
          onRecordUpdate(updated);
        }
      } else {
        showToast(response.data.message || 'Failed to add comment.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Error posting comment.', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!record) return null;

  const getImageUrl = (path) => {
    if (!path) return null;
    // If already a full URL, use it as-is
    if (/^https?:\/\//i.test(path) || /^\/\//.test(path)) return path;

    try {
      // Normalize API_URL to origin (remove trailing /api or slash)
      let base = API_URL || '';
      base = base.replace(/\/api\/?$/i, '');
      base = base.replace(/\/$/, '');
      return `${base}${path.startsWith('/') ? path : `/${path}`}`;
    } catch (e) {
      return path;
    }
  };

  const proofBadgeProps = (status) => {
    switch (status) {
      case 'On-Time':
        return { className: 'bg-success text-white', label: 'On Time' };
      case 'Late':
        return { className: 'bg-warning text-dark', label: 'Late' };
      case 'Missing':
        return { className: 'bg-danger text-white', label: 'Not Captured' };
      case 'Pending':
      default:
        return { className: 'bg-secondary text-white', label: 'Pending' };
    }
  };

  const proofStatusDescription = (status, delayMinutes) => {
    if (!status || status === 'Pending') {
      return 'Proof status is pending and will update when the proof is captured.';
    }
    if (status === 'On-Time') {
      return 'Captured within the expected verification window.';
    }
    if (status === 'Late') {
      return `Captured after the expected window by ${delayMinutes || 0} minute${delayMinutes === 1 ? '' : 's'}.`;
    }
    if (status === 'Missing') {
      return 'Proof was not captured. This record will be flagged for admin review.';
    }
    return 'Capture status unavailable.';
  };

  const addMinutesToTimeString = (timeString, minutesToAdd) => {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    const total = (hours * 60 + minutes + minutesToAdd + 24 * 60) % (24 * 60);
    const newHours = String(Math.floor(total / 60)).padStart(2, '0');
    const newMins = String(total % 60).padStart(2, '0');
    return `${newHours}:${newMins}`;
  };

  const getScheduledDurationMins = () => {
    if (!record?.scheduledStartTime || !record?.scheduledEndTime) return 0;
    const [startH, startM] = record.scheduledStartTime.split(':').map(Number);
    const [endH, endM] = record.scheduledEndTime.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60;
    return diff;
  };

  const deriveExpectedWindow = (type, providedValue) => {
    if (providedValue) return providedValue;
    if (!record.scheduledStartTime || !record.scheduledEndTime) return null;

    if (type === 'proof1') {
      const duration = getScheduledDurationMins();
      if (duration === 15) {
        const start = addMinutesToTimeString(record.scheduledStartTime, 6);
        const end = addMinutesToTimeString(record.scheduledStartTime, 9);
        return start && end ? `${start}–${end}` : null;
      }
      if (duration === 30) {
        const start = addMinutesToTimeString(record.scheduledStartTime, 9);
        const end = addMinutesToTimeString(record.scheduledStartTime, 12);
        return start && end ? `${start}–${end}` : null;
      }
      const start = addMinutesToTimeString(record.scheduledStartTime, 10);
      const end = addMinutesToTimeString(record.scheduledStartTime, 15);
      return start && end ? `${start}–${end}` : null;
    }

    if (type === 'proof2') {
      const duration = getScheduledDurationMins();
      if (duration === 15) {
        const start = addMinutesToTimeString(record.scheduledEndTime, -3);
        const end = record.scheduledEndTime;
        return start && end ? `${start}–${end}` : null;
      }
      if (duration === 30) {
        const start = addMinutesToTimeString(record.scheduledEndTime, -6);
        const end = addMinutesToTimeString(record.scheduledEndTime, -3);
        return start && end ? `${start}–${end}` : null;
      }
      const start = addMinutesToTimeString(record.scheduledEndTime, -20);
      const end = addMinutesToTimeString(record.scheduledEndTime, -10);
      return start && end ? `${start}–${end}` : null;
    }

    return null;
  };

  const renderProofDetail = ({ title, status, expectedWindow, actualTime, delayMinutes, typeKey }) => {
    const badge = proofBadgeProps(status);
    const safeExpectedWindow = deriveExpectedWindow(typeKey, expectedWindow) || 'Not available';
    const safeActualTime = actualTime || 'Not captured';

    return (
      <div className="col-sm-6 bg-white p-3 rounded border">
        <span className="fw-semibold text-secondary d-block mb-2" style={{ fontSize: '0.75rem' }}>{title}</span>
        <div className="d-flex align-items-center gap-2 mb-2">
          <span className={`badge ${badge.className} px-2 py-1`} style={{ fontSize: '0.75rem' }}>
            {badge.label}
          </span>
          <span className="text-secondary" style={{ fontSize: '0.8rem' }}>{proofStatusDescription(status, delayMinutes)}</span>
        </div>
        <div className="text-muted" style={{ fontSize: '0.82rem' }}>
          <div><strong>Expected window:</strong> {safeExpectedWindow}</div>
          <div><strong>Actual capture:</strong> {safeActualTime}</div>
        </div>
        {status === 'Late' && (
          <div className="text-danger fw-semibold mt-2" style={{ fontSize: '0.8rem' }}>
            Late by {delayMinutes || 0} minute{delayMinutes === 1 ? '' : 's'}.
          </div>
        )}
      </div>
    );
  };

  const renderPhotoOrPlaceholder = (photoPath, label) => {
    const imageUrl = getImageUrl(photoPath);
    if (imageUrl) {
      return (
        <a href={imageUrl} target="_blank" rel="noopener noreferrer">
          <img 
            src={imageUrl}
            alt={label}
            className="img-fluid rounded border hover-scale shadow-sm"
            style={{ maxHeight: '180px', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial, Helvetica, sans-serif" font-size="18">Image not available</text></svg>';
            }}
          />
        </a>
      );
    }
    return (
      <div className="d-flex flex-column align-items-center justify-content-center rounded border bg-white text-secondary" style={{ minHeight: '180px', padding: '1rem' }}>
        <FaCamera className="fs-3 mb-2" />
        <strong className="mb-1">{label}</strong>
        <span className="small">Photo not uploaded</span>
      </div>
    );
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`;
  const embedMapsUrl = `https://maps.google.com/maps?q=${record.latitude},${record.longitude}&z=15&output=embed`;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(5px)', zIndex: 1060 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content glass-card border shadow-2xl p-2">
          
          {/* Modal Header */}
          <div className="modal-header border-bottom-0 pb-0 d-flex justify-content-between align-items-center">
            <div>
              <h2 className="modal-title h5 fw-extrabold gradient-text m-0">{record.trainerName}</h2>
              <small className="text-secondary">{record.collegeName}</small>
            </div>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{ width: '36px', height: '36px' }}
              onClick={onClose}
            >
              <FaTimes />
            </button>
          </div>

          {/* Modal Body */}
          <div className="modal-body py-4">
            
            {/* Status Alert Banners */}
            <div className="d-flex flex-column gap-2 mb-4">
              {record.isDuplicatePhoto && (
                <div className="alert alert-danger border border-danger d-flex align-items-start gap-2.5 mb-0">
                  <FaExclamationTriangle className="fs-5 mt-0.5 text-danger" />
                  <div>
                    <h6 className="fw-bold m-0 text-danger-emphasis">Duplicate Photo Upload Detected!</h6>
                    <p className="m-0 text-secondary small">This session's check-in images match another check-in photo in the system database.</p>
                  </div>
                </div>
              )}

              {record.isLocationMismatch && (
                <div className="alert alert-warning border border-warning d-flex align-items-start gap-2.5 mb-0">
                  <FaExclamationTriangle className="fs-5 mt-0.5 text-warning" />
                  <div>
                    <h6 className="fw-bold m-0 text-warning-emphasis">Location Mismatch Detected!</h6>
                    <p className="m-0 text-secondary small">The trainer's live GPS coordinates resolve to a different state than the college location.</p>
                  </div>
                </div>
              )}

              {record.status === 'Flagged' ? (
                <div className="alert alert-warning border border-warning d-flex align-items-start gap-2.5 mb-0">
                  <FaExclamationTriangle className="fs-5 mt-0.5" />
                  <div>
                    <h6 className="fw-bold m-0 text-warning-emphasis">Record Audit Flagged</h6>
                    <p className="m-0 text-secondary" style={{ fontSize: '0.85rem' }}>{record.statusMessage}</p>
                  </div>
                </div>
              ) : record.status === 'Rejected' ? (
                <div className="alert alert-danger border border-danger d-flex align-items-start gap-2.5 mb-0">
                  <FaTimes className="fs-5 mt-0.5 text-danger" />
                  <div>
                    <h6 className="fw-bold m-0 text-danger-emphasis">Attendance Rejected</h6>
                    <p className="m-0 text-secondary" style={{ fontSize: '0.85rem' }}>{record.statusMessage}</p>
                  </div>
                </div>
              ) : (
                <div className="alert alert-success border border-success d-flex align-items-start gap-2.5 mb-0">
                  <FaCheckCircle className="fs-5 mt-0.5" />
                  <div>
                    <h6 className="fw-bold m-0 text-success-emphasis">Record Verified</h6>
                    <p className="m-0 text-secondary" style={{ fontSize: '0.85rem' }}>{record.statusMessage}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="row g-4">
              
              {/* Left Column: Details Cards */}
              <div className="col-lg-6">
                <div className="p-4 rounded-lg bg-light border h-100">
                  <h3 className="h6 fw-bold mb-4 text-primary-theme d-flex align-items-center gap-2 border-bottom pb-2">
                    <FaUser /> Session Attendance Record
                  </h3>

                  <div className="row g-3">
                    <div className="col-sm-6">
                      <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>TRAINER NAME</small>
                      <span className="fw-semibold text-primary-theme">{record.trainerName}</span>
                    </div>

                    <div className="col-sm-6">
                      <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>EMPLOYEE ID</small>
                      <span className="font-monospace text-primary-theme">{record.employeeId}</span>
                    </div>

                    <div className="col-sm-6">
                      <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>COLLEGE NAME</small>
                      <span className="fw-semibold text-primary-theme">{record.collegeName}</span>
                    </div>

                    <div className="col-sm-6">
                      <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>COLLEGE CITY</small>
                      <span className="fw-semibold text-primary-theme d-flex align-items-center gap-1">
                        <FaCity className="text-muted" style={{ fontSize: '0.85rem' }} /> {record.collegeCity}
                      </span>
                    </div>

                    <div className="col-sm-6">
                      <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>COURSE / SUBJECT</small>
                      <span className="fw-semibold text-primary-theme">{record.subject}</span>
                    </div>

                    <div className="col-sm-6">
                      <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>SESSION DATE</small>
                      <span className="text-secondary" style={{ fontSize: '0.85rem' }}><FaCalendarAlt className="me-1 text-muted" /> {record.trainingDate}</span>
                    </div>

                    <div className="col-12">
                      <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>COLLEGE ADDRESS</small>
                      <span className="text-secondary" style={{ fontSize: '0.85rem' }}>{record.collegeAddress}</span>
                    </div>

                    <div className="col-sm-6 text-start">
                      <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>SCHEDULED TIMINGS</small>
                      <span className="text-secondary fw-bold" style={{ fontSize: '0.85rem' }}><FaClock className="me-1 text-muted" /> {record.scheduledStartTime ? `${record.scheduledStartTime} - ${record.scheduledEndTime}` : 'N/A'}</span>
                    </div>

                    <div className="col-sm-6 text-start">
                      <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>GEOTAG TIMINGS (ACTUAL)</small>
                      <span className="text-secondary" style={{ fontSize: '0.85rem' }}><FaClock className="me-1 text-muted" /> {record.entryTime} - {record.exitTime}</span>
                    </div>

                    <div className="col-sm-6 text-start">
                      <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>SCHEDULED HOURS</small>
                      <span className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold px-2 py-1 font-monospace" style={{ fontSize: '0.75rem' }}>
                        {record.classHours}
                      </span>
                    </div>

                    <div className="col-sm-6 text-start">
                      <small className="text-secondary d-block fw-semibold" style={{ fontSize: '0.7rem' }}>CONDUCTED HOURS</small>
                      <span className="badge bg-primary bg-opacity-10 text-primary fw-bold px-2 py-1 font-monospace" style={{ fontSize: '0.75rem' }}>
                        {record.workingHours}
                      </span>
                    </div>

                    {/* Verification Proof Details */}
                    {record.scheduledStartTime && (
                      <div className="col-12 mt-3 pt-3 border-top text-start">
                        <small className="text-secondary d-block fw-bold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>VERIFICATION PROOF DETAILS</small>
                        <div className="row g-2">
                          {renderProofDetail({
                            typeKey: 'proof1',
                            title: 'PROOF 1 (ENTRY PHOTO)',
                            status: record.proof1Status,
                            expectedWindow: record.proof1ExpectedWindow,
                            actualTime: record.proof1ActualTime,
                            delayMinutes: record.proof1DelayMinutes
                          })}

                          {renderProofDetail({
                            typeKey: 'proof2',
                            title: 'PROOF 2 (EXIT PHOTO)',
                            status: record.proof2Status,
                            expectedWindow: record.proof2ExpectedWindow,
                            actualTime: record.proof2ActualTime,
                            delayMinutes: record.proof2DelayMinutes
                          })}
                        </div>
                      </div>
                    )}

                    <div className="col-12 mt-4">
                      <div className="p-3 rounded bg-white border">
                        <small className="text-secondary d-block fw-semibold mb-1" style={{ fontSize: '0.7rem' }}>RESOLVED GPS ADDRESS</small>
                        <p className="text-secondary m-0" style={{ fontSize: '0.85rem', lineHeight: '1.3' }}>
                          <FaMapMarkerAlt className="text-danger me-1" />
                          {record.locationAddress}
                        </p>
                        <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                          <small className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                            GPS: {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
                          </small>
                          <a 
                            href={googleMapsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-sm btn-link p-0 text-decoration-none d-flex align-items-center gap-1"
                          >
                            Google Maps Link <FaExternalLinkAlt style={{ fontSize: '0.75rem' }} />
                          </a>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Right Column: Google Maps Embed */}
              <div className="col-lg-6">
                <div className="h-100 rounded-lg overflow-hidden border shadow-inner bg-light" style={{ minHeight: '320px', borderRadius: '12px' }}>
                  <iframe
                    title="GPS Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={embedMapsUrl}
                    style={{ border: '0', minHeight: '320px' }}
                    allowFullScreen
                  ></iframe>
                </div>
              </div>

            </div>

            {/* Bottom Row: Large GeoTag Photos */}
            <div className="row g-3 mt-2 text-start">
              
              {/* Entry Photo */}
              <div className="col-sm-6 col-lg-3">
                <div className="card glass-card h-100 overflow-hidden">
                  <div className="card-header bg-transparent border-bottom-0 pb-0 fw-semibold text-secondary" style={{ fontSize: '0.8rem' }}>
                    📸 1. Entry Photo
                  </div>
                  <div className="card-body p-3 text-center d-flex flex-column justify-content-between">
                    {renderPhotoOrPlaceholder(record.entryPhoto, 'Entry GeoTag')}
                  </div>
                </div>
              </div>

              {/* Proof 1 Photo */}
              <div className="col-sm-6 col-lg-3">
                <div className="card glass-card h-100 overflow-hidden">
                  <div className="card-header bg-transparent border-bottom-0 pb-0 fw-semibold text-secondary" style={{ fontSize: '0.8rem' }}>
                    📸 2. Proof of Entry
                  </div>
                  <div className="card-body p-3 text-center d-flex flex-column justify-content-between">
                    {renderPhotoOrPlaceholder(record.proof1Photo, 'Proof 1 GeoTag')}
                  </div>
                </div>
              </div>

              {/* Proof 2 Photo */}
              <div className="col-sm-6 col-lg-3">
                <div className="card glass-card h-100 overflow-hidden">
                  <div className="card-header bg-transparent border-bottom-0 pb-0 fw-semibold text-secondary" style={{ fontSize: '0.8rem' }}>
                    📸 3. Proof of Exit
                  </div>
                  <div className="card-body p-3 text-center d-flex flex-column justify-content-between">
                    {renderPhotoOrPlaceholder(record.proof2Photo, 'Proof 2 GeoTag')}
                  </div>
                </div>
              </div>

              {/* Exit Photo */}
              <div className="col-sm-6 col-lg-3">
                <div className="card glass-card h-100 overflow-hidden">
                  <div className="card-header bg-transparent border-bottom-0 pb-0 fw-semibold text-secondary" style={{ fontSize: '0.8rem' }}>
                    📸 4. Exit Photo
                  </div>
                  <div className="card-body p-3 text-center d-flex flex-column justify-content-between">
                    {renderPhotoOrPlaceholder(record.exitPhoto, 'Exit GeoTag')}
                  </div>
                </div>
              </div>

            </div>

            {/* Comments / Discussion Section */}
            <div ref={commentSectionRef} className="card glass-card mt-4 overflow-hidden border">
              <div className="card-header bg-transparent border-bottom-0 pb-0 d-flex justify-content-between align-items-center">
                <span className="fw-extrabold text-primary-theme d-flex align-items-center gap-2">
                  <FaComments /> Attendance Feedback & Comments
                </span>
                <span className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold px-2.5 py-1" style={{ fontSize: '0.75rem' }}>
                  {record.comments?.length || 0} {record.comments?.length === 1 ? 'Comment' : 'Comments'}
                </span>
              </div>
              <div className="card-body p-3">
                
                {/* Comments List Feed */}
                <div 
                  className="comments-feed-container p-2 rounded mb-3 border bg-light bg-opacity-50"
                  style={{ maxHeight: '250px', overflowY: 'auto' }}
                >
                  {(!record.comments || record.comments.length === 0) ? (
                    <div className="text-center py-4 text-muted small">
                      <FaComment className="mb-2 fs-4 text-muted opacity-50" /><br />
                      No comments or messages regarding this attendance yet.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {record.comments.map((c, index) => {
                        const isManager = c.role === 'manager';
                        return (
                          <div 
                            key={c._id || index}
                            className={`p-3 rounded-3 shadow-sm border ${
                              isManager 
                                ? 'bg-primary-subtle bg-opacity-25 border-primary-subtle text-start ms-0 me-md-5' 
                                : 'bg-success-subtle bg-opacity-25 border-success-subtle text-start ms-md-5 me-0'
                            }`}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold text-primary-theme" style={{ fontSize: '0.85rem' }}>
                                  {c.author}
                                </span>
                                <span className={`badge px-2 py-0.5 rounded-pill fw-semibold ${
                                  isManager ? 'bg-primary text-white' : 'bg-success text-white'
                                }`} style={{ fontSize: '0.65rem' }}>
                                  {isManager ? 'Manager' : 'Trainer'}
                                </span>
                              </div>
                              <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                {new Date(c.createdAt).toLocaleString()}
                              </small>
                            </div>
                            <p className="mb-0 text-secondary font-sans" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                              {c.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Comment Form Input */}
                <form onSubmit={handleAddComment}>
                  <div className="d-flex gap-2">
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Type a message or comment regarding this attendance..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      style={{ fontSize: '0.85rem', resize: 'none' }}
                      required
                    ></textarea>
                    <button
                      type="submit"
                      className="btn btn-primary px-4 d-flex align-items-center justify-content-center gap-1.5 rounded-3"
                      disabled={submittingComment || !commentText.trim()}
                      style={{ minWidth: '130px' }}
                    >
                      {submittingComment ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <>
                          <FaPaperPlane style={{ fontSize: '0.85rem' }} /> Send
                        </>
                      )}
                    </button>
                  </div>
                </form>

              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="modal-header border-top pt-3 d-flex justify-content-between align-items-center">
            <div className="d-flex gap-2">
              {record.status === 'Flagged' && onApproveClick && (
                <button 
                  type="button" 
                  className="btn btn-success px-4 rounded-pill d-flex align-items-center gap-1.5 hover-scale fw-bold"
                  onClick={() => {
                    onApproveClick(record._id);
                    onClose();
                  }}
                >
                  <FaCheckCircle /> Verify Session
                </button>
              )}
              {record.status === 'Flagged' && onRejectClick && (
                <button 
                  type="button" 
                  className="btn btn-danger px-4 rounded-pill d-flex align-items-center gap-1.5 hover-scale fw-bold"
                  onClick={() => {
                    onRejectClick(record._id);
                    onClose();
                  }}
                >
                  <FaTimes /> Reject Session
                </button>
              )}
            </div>
            <button type="button" className="btn btn-secondary px-4 rounded-pill" onClick={onClose}>
              Close Window
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RecordModal;
