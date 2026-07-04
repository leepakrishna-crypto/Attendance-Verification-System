import React from 'react';
import { FaEye, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaEdit, FaTrash, FaCity, FaExclamationTriangle, FaComment } from 'react-icons/fa';
import { useApp } from '../context/AppContext';

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

const RecordTable = ({ records, onViewClick, onEditClick, onDeleteClick, API_URL, loading, startIndex = 0 }) => {
  const { user } = useApp();
  const [unreadUpdateCount, setUnreadUpdateCount] = React.useState(0);

  React.useEffect(() => {
    const handleUpdate = () => {
      setUnreadUpdateCount(prev => prev + 1);
    };
    window.addEventListener('comments_read_update', handleUpdate);
    return () => window.removeEventListener('comments_read_update', handleUpdate);
  }, []);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path) || /^\/\//.test(path)) return path;
    try {
      let base = API_URL || '';
      base = base.replace(/\/api\/?$/i, '');
      base = base.replace(/\/$/, '');
      return `${base}${path.startsWith('/') ? path : `/${path}`}`;
    } catch (e) {
      return path;
    }
  };

  const renderSmallPreview = (path, title) => {
    const imageUrl = getImageUrl(path);
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt={title} 
          className="rounded border shadow-sm"
          style={{ width: '28px', height: '28px', objectFit: 'cover' }} 
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="100%" height="100%" fill="%23f8fafc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial, Helvetica, sans-serif" font-size="8">N/A</text></svg>';
          }}
        />
      );
    }
    return (
      <div className="rounded border shadow-sm bg-light d-flex align-items-center justify-content-center text-secondary" style={{ width: '28px', height: '28px', fontSize: '0.65rem' }}>
        N/A
      </div>
    );
  };

  if (loading) {
    return (
      <div className="glass-card p-5 text-center my-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="text-secondary mt-2 mb-0">Loading trainer attendance logs...</p>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="glass-card p-5 text-center my-4">
        <h4 className="fw-semibold text-secondary">No Records Found</h4>
        <p className="text-muted m-0">No trainer attendance logs match the active query filters.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden shadow-sm">
      <div className="table-responsive">
        <table className="table custom-table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th className="text-center" style={{ width: '50px' }}>S.No</th>
              <th>Trainer Details</th>
              <th>College Details</th>
              <th>Course / Subject</th>
              <th>Date & Timings</th>
              <th>Expected Class Hours</th>
              <th>Conducted Hours</th>


              <th>Status</th>
              <th className="text-center" style={{ minWidth: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={record._id}>
                {/* Serial Number */}
                <td className="text-center fw-semibold text-secondary" style={{ fontSize: '0.8rem' }}>
                  {startIndex + index + 1}
                </td>

                {/* Trainer Info */}
                <td>
                  <span className="d-block fw-bold text-primary-theme">{record.trainerName}</span>
                  <small className="text-secondary bg-light border px-2 py-0.5 rounded-pill font-monospace" style={{ fontSize: '0.7rem' }}>
                    ID: {record.employeeId}
                  </small>
                </td>

                {/* College Info */}
                <td>
                  <span className="d-block fw-semibold text-primary-theme">{record.collegeName}</span>
                  <small className="d-block text-secondary mb-1">
                    <FaCity className="text-muted me-1" /> {record.collegeCity}
                  </small>
                  <span className="text-muted text-truncate d-inline-block" style={{ maxWidth: '140px', fontSize: '0.7rem' }} title={record.collegeAddress}>
                    {record.collegeAddress}
                  </span>
                </td>

                {/* Subject */}
                <td>
                  <span className="text-secondary">{record.subject}</span>
                </td>

                {/* Date & Times */}
                <td>
                  <small className="d-flex align-items-center gap-1 text-secondary mb-1">
                    <FaCalendarAlt className="text-muted" /> {record.trainingDate}
                  </small>
                  <small className="d-flex align-items-center gap-1 text-secondary font-monospace" style={{ fontSize: '0.7rem' }}>
                    <FaClock className="text-muted" /> {record.entryTime} - {record.exitTime}
                    {(record.proof1Status === 'Late' || record.proof2Status === 'Late') && (
                      <FaExclamationTriangle className="text-warning ms-1 animate-pulse" style={{ cursor: 'help' }} title={`Late submission: ${record.proof1Status === 'Late' ? `Proof 1 (${record.proof1DelayMinutes}m late)` : ''} ${record.proof2Status === 'Late' ? `Proof 2 (${record.proof2DelayMinutes}m late)` : ''}`} />
                    )}
                  </small>
                </td>

                {/* Expected Class Hours */}
                <td>
                  <span className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold px-2 py-1 font-monospace">
                    {record.classHours}
                  </span>
                </td>

                {/* Conducted Hours */}
                <td>
                  <span className="badge bg-primary bg-opacity-10 text-primary fw-bold px-2 py-1 font-monospace">
                    {record.workingHours}
                  </span>
                </td>





                {/* Status Column */}
                <td>
                  <div className="d-flex flex-column gap-1">
                    {record.status === 'Flagged' ? (
                      <div>
                        <span className="badge bg-warning bg-opacity-15 text-warning fw-bold px-2 py-1 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }} title={record.statusMessage}>
                          <FaExclamationTriangle /> Flagged
                        </span>
                        <small className="d-block text-muted text-truncate mt-1" style={{ fontSize: '0.65rem', maxWidth: '120px' }} title={record.statusMessage}>
                          {record.statusMessage}
                        </small>
                      </div>
                    ) : record.status === 'Rejected' ? (
                      <div>
                        <span className="badge bg-danger bg-opacity-15 text-danger fw-bold px-2 py-1 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }} title={record.statusMessage}>
                          ❌ Rejected
                        </span>
                        <small className="d-block text-muted text-truncate mt-1" style={{ fontSize: '0.65rem', maxWidth: '120px' }} title={record.statusMessage}>
                          {record.statusMessage}
                        </small>
                      </div>
                    ) : (
                      <div>
                        <span className="badge bg-success bg-opacity-10 text-success fw-semibold px-2 py-1" style={{ fontSize: '0.7rem' }}>
                          Verified
                        </span>
                      </div>
                    )}
                    
                    {(record.proof1Status === 'Late' || record.proof2Status === 'Late') && (
                      <div className="mt-1">
                        <span className="badge bg-warning bg-opacity-15 text-warning fw-bold px-2 py-1 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }} title={`Late Verification: ${record.proof1Status === 'Late' ? `Proof 1 (${record.proof1DelayMinutes}m late)` : ''} ${record.proof2Status === 'Late' ? `Proof 2 (${record.proof2DelayMinutes}m late)` : ''}`}>
                          <FaExclamationTriangle /> Late Verification
                        </span>
                      </div>
                    )}

                    {record.isDuplicatePhoto && (
                      <div className="mt-1">
                        <span className="badge bg-danger bg-opacity-15 text-danger fw-bold px-2 py-1" style={{ fontSize: '0.65rem' }} title="This photo matches another session photo in the database.">
                          ⚠️ Duplicate Image
                        </span>
                      </div>
                    )}
                    
                    {record.isLocationMismatch && (
                      <div className="mt-1">
                        <span className="badge bg-warning bg-opacity-15 text-warning fw-bold px-2 py-1 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }} title="Selected college location does not match live geotag resolved location state.">
                          <FaExclamationTriangle /> Location Mismatch
                        </span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td>
                  <div className="d-flex gap-1.5 justify-content-center">
                    <button
                      className="btn btn-sm btn-outline-primary rounded-circle p-2 d-flex align-items-center justify-content-center hover-scale"
                      style={{ width: '30px', height: '30px' }}
                      onClick={() => onViewClick(record, false)}
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                    <button
                      className="btn btn-sm btn-outline-info rounded-circle p-2 d-flex align-items-center justify-content-center hover-scale position-relative"
                      style={{ width: '30px', height: '30px' }}
                      onClick={() => onViewClick(record, true)}
                      title="Comments & Feedback"
                    >
                      <FaComment />
                      {getUnreadCommentsCount(record, user) > 0 && (
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
                    <button
                      className="btn btn-sm btn-outline-warning rounded-circle p-2 d-flex align-items-center justify-content-center hover-scale"
                      style={{ width: '30px', height: '30px' }}
                      onClick={() => onEditClick(record)}
                      title="Edit Record"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger rounded-circle p-2 d-flex align-items-center justify-content-center hover-scale"
                      style={{ width: '30px', height: '30px' }}
                      onClick={() => onDeleteClick(record._id)}
                      title="Delete Record"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecordTable;
