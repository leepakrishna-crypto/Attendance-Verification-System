import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, api } from '../context/AppContext';
import StatsCards from '../components/StatsCards';
import RecordTable from '../components/RecordTable';
import RecordModal from '../components/RecordModal';
import { 
  FaSignOutAlt, FaSearch, FaUndo, FaFileCsv, 
  FaFileExcel, FaFilePdf, FaChevronLeft, FaChevronRight, 
  FaSun, FaMoon, FaBars, FaTimes, FaSave, FaMapMarkedAlt,
  FaUsers, FaUserMinus, FaTrash
} from 'react-icons/fa';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme, logout, user, API_URL, showToast } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'trainers'

  // Records & Stats states
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Trainers state
  const [trainers, setTrainers] = useState([]);
  const [trainersLoading, setTrainersLoading] = useState(false);
  const [deletingTrainerId, setDeletingTrainerId] = useState(null);

  // Search & Filter parameters
  const [search, setSearch] = useState('');
  const [trainerQuery, setTrainerQuery] = useState('');
  const [trainerSearchTerm, setTrainerSearchTerm] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [employeeIdFilter, setEmployeeIdFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState('all');

  // Sort & Page parameters
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 5;

  // Active Modals
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [focusComments, setFocusComments] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const handleRecordUpdate = (updatedRecord) => {
    setRecords(prev => prev.map(r => r._id === updatedRecord._id ? updatedRecord : r));
    setSelectedRecord(updatedRecord);
  };
  


  // Sidebar toggle state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch Trainer List (Manager Only)
  const fetchTrainers = async () => {
    setTrainersLoading(true);
    try {
      const response = await api.get('/trainers');
      if (response.data.success) {
        setTrainers(response.data.data);
      } else {
        showToast(response.data.message || 'Failed to fetch trainers.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error communicating with backend API.', 'error');
    } finally {
      setTrainersLoading(false);
    }
  };

  // Delete Trainer Account (Manager Only)
  const handleDeleteTrainer = async (id, trainerName) => {
    try {
      const response = await api.delete(`/trainers/${id}`);
      if (response.data.success) {
        showToast(`Trainer account for "${trainerName}" removed successfully.`, 'success');
        setDeletingTrainerId(null);
        fetchTrainers();
        fetchRecords();
        fetchStats();
      } else {
        showToast(response.data.message || 'Deletion failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error removing trainer account.', 'error');
    }
  };

  // Approve Trainer Account (Manager Only)
  const handleApproveTrainer = async (id, trainerName) => {
    try {
      const response = await api.put(`/trainers/${id}/approve`);
      if (response.data.success) {
        showToast(`Trainer account for "${trainerName}" approved successfully.`, 'success');
        fetchTrainers();
        fetchRecords();
        fetchStats();
      } else {
        showToast(response.data.message || 'Approval failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error approving trainer account.', 'error');
    }
  };

  // Fetch trainers on tab switch
  useEffect(() => {
    if (activeTab === 'trainers') {
      fetchTrainers();
    }
  }, [activeTab]);


  // 1. Fetch Records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (collegeFilter.trim()) params.append('collegeName', collegeFilter.trim());
      if (employeeIdFilter.trim()) params.append('employeeId', employeeIdFilter.trim());
      if (dateFilter) params.append('date', dateFilter);
      if (locationFilter.trim()) params.append('location', locationFilter.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (timeframeFilter !== 'all') params.append('filter', timeframeFilter);
      
      params.append('sort', sort);
      params.append('page', page);
      params.append('limit', limit);

      const response = await api.get(`/records?${params.toString()}`);
      if (response.data.success) {
        setRecords(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setTotalRecords(response.data.pagination.totalRecords);
      } else {
        showToast(response.data.message || 'Failed to fetch logs.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error communicating with backend API.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await api.get('/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Trigger loads on parameter changes
  useEffect(() => {
    fetchRecords();
  }, [page, sort, statusFilter, timeframeFilter]);

  useEffect(() => {
    fetchStats();
    fetchTrainers();
  }, []);

  const [unreadUpdateCount, setUnreadUpdateCount] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setUnreadUpdateCount(prev => prev + 1);
    };
    window.addEventListener('comments_read_update', handleUpdate);
    return () => window.removeEventListener('comments_read_update', handleUpdate);
  }, []);

  // Request Notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const [latestCommentTime, setLatestCommentTime] = useState(0);
  const [latestRecordTime, setLatestRecordTime] = useState(() => Date.now());



  useEffect(() => {
    if (records.length > 0 && user) {
      // 1. Check for new comments
      const otherComments = records.flatMap(r => r.comments || [])
        .filter(c => c.role !== user.role);

      if (otherComments.length > 0) {
        const maxCommentTime = Math.max(...otherComments.map(c => new Date(c.createdAt).getTime()));
        const newUnreadComments = records.filter(r => {
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
          const title = "New Message / Feedback";
          const body = `You have ${newUnreadComments.length} new comment(s) pending your feedback!`;
          showToast(`${title}: ${body}`, 'info');
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
          }
        }

        if (maxCommentTime > latestCommentTime) {
          setLatestCommentTime(maxCommentTime);
        }
      }

      // 2. Check for new attendance submissions
      const maxRecordTime = Math.max(...records.map(r => new Date(r.createdAt || Date.now()).getTime()));
      const newRecords = records.filter(r => {
        const recordTime = new Date(r.createdAt).getTime();
        return recordTime > latestRecordTime;
      });

      if (newRecords.length > 0) {
        newRecords.forEach(r => {
          const title = "New Attendance Session";
          const body = `New attendance log submitted by ${r.trainerName} for ${r.collegeName}.`;
          showToast(`${title}: ${body}`, 'success');
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
          }

          // Check if Proof 1 was late
          if (r.proof1Status === 'Late') {
            const lateTitle = "Late Verification Alert";
            const lateBody = `Trainer ${r.trainerName} submitted Proof 1 at ${r.proof1ActualTime}.\nExpected Window: ${r.proof1ExpectedWindow}\nActual Submission: ${r.proof1ActualTime}\nStatus: Late Verification (${r.proof1DelayMinutes} minutes late)`;
            showToast(`${lateTitle}: ${r.trainerName} - Proof 1 is late!`, 'warning');
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(lateTitle, { body: lateBody });
            }
          }

          // Check if Proof 2 was late
          if (r.proof2Status === 'Late') {
            const lateTitle = "Late Verification Alert";
            const lateBody = `Trainer ${r.trainerName} submitted Proof 2 at ${r.proof2ActualTime}.\nExpected Window: ${r.proof2ExpectedWindow}\nActual Submission: ${r.proof2ActualTime}\nStatus: Late Verification (${r.proof2DelayMinutes} minutes late)`;
            showToast(`${lateTitle}: ${r.trainerName} - Proof 2 is late!`, 'warning');
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(lateTitle, { body: lateBody });
            }
          }
        });
      }

      if (maxRecordTime > latestRecordTime) {
        setLatestRecordTime(maxRecordTime);
      }
    }
  }, [records, user, latestCommentTime, latestRecordTime]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
    fetchStats();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCollegeFilter('');
    setEmployeeIdFilter('');
    setDateFilter('');
    setLocationFilter('');
    setStatusFilter('');
    setTimeframeFilter('all');
    setSort('newest');
    setPage(1);
    
    setTimeout(() => {
      fetchRecords();
      fetchStats();
    }, 50);
    showToast('Filters reset successfully.', 'info');
  };

  // 3. CRUD actions (Delete and Edit)
  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/records/${id}`);
      if (response.data.success) {
        showToast('Attendance record deleted successfully!', 'success');
        fetchRecords();
        fetchStats();
      } else {
        showToast(response.data.message || 'Deletion failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting attendance record.', 'error');
    }
  };

  const handleOpenEdit = (record) => {
    setEditingRecord({ 
      ...record,
      scheduledStartTime: record.scheduledStartTime || '',
      scheduledEndTime: record.scheduledEndTime || ''
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingRecord(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    
    // Time constraint check
    const [entryHrs, entryMins] = editingRecord.entryTime.split(':').map(Number);
    const [exitHrs, exitMins] = editingRecord.exitTime.split(':').map(Number);
    const entryTotalMins = entryHrs * 60 + entryMins;
    const exitTotalMins = exitHrs * 60 + exitMins;

    if (exitTotalMins < entryTotalMins) {
      showToast('Exit Time cannot be earlier than Entry Time.', 'error');
      return;
    }

    // Auto-calculate expected hours/minutes based on scheduled times
    let calculatedExpMins = 0;
    let calculatedExpText = '0 Hours 0 Minutes';

    if (editingRecord.scheduledStartTime && editingRecord.scheduledEndTime) {
      const [startH, startM] = editingRecord.scheduledStartTime.split(':').map(Number);
      const [endH, endM] = editingRecord.scheduledEndTime.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (endMins >= startMins) {
        calculatedExpMins = endMins - startMins;
      } else {
        calculatedExpMins = (24 * 60 - startMins) + endMins;
      }

      const hrs = Math.floor(calculatedExpMins / 60);
      const mins = calculatedExpMins % 60;
      calculatedExpText = `${hrs} ${hrs === 1 ? 'Hour' : 'Hours'} ${mins} ${mins === 1 ? 'Minute' : 'Minutes'}`;
    }

    const payload = {
      ...editingRecord,
      classHours: calculatedExpText,
      classHoursMinutes: calculatedExpMins
    };

    try {
      const response = await api.put(`/records/${editingRecord._id}`, payload);
      if (response.data.success) {
        showToast('Attendance record updated successfully!', 'success');
        setEditingRecord(null);
        fetchRecords();
        fetchStats();
      } else {
        showToast(response.data.message || 'Update failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Error updating attendance record.', 'error');
    }
  };

  // 4. Approve / Resolve Flagged Records
  const handleApproveRecord = async (id) => {
    try {
      const response = await api.put(`/records/${id}`, {
        status: 'Verified',
        statusMessage: 'Manually verified and approved by administrator.'
      });
      if (response.data.success) {
        showToast('Trainer attendance record approved and marked verified successfully!', 'success');
        fetchRecords();
        fetchStats();
      } else {
        showToast(response.data.message || 'Approval failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error approving attendance record.', 'error');
    }
  };

  const handleRejectRecord = async (id) => {
    try {
      const response = await api.put(`/records/${id}`, {
        status: 'Rejected',
        statusMessage: 'Rejected by administrator.'
      });
      if (response.data.success) {
        showToast('Trainer attendance record rejected successfully!', 'success');
        fetchRecords();
        fetchStats();
      } else {
        showToast(response.data.message || 'Rejection failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error rejecting attendance record.', 'error');
    }
  };

  // 5. Exporter Methods
  const handleExportCSV = () => {
    if (records.length === 0) {
      showToast('No records available to export.', 'warning');
      return;
    }

    const headers = [
      'Trainer Name', 
      'Employee ID', 
      'College Name', 
      'College City',
      'College Address', 
      'Training Subject', 
      'Verified Location', 
      'Latitude', 
      'Longitude', 
      'Date', 
      'Entry Time', 
      'Exit Time', 
      'Scheduled Class Hours',
      'Conducted Working Hours', 
      'Status',
      'Audit Warning Messages'
    ];

    const rows = records.map(r => [
      r.trainerName,
      r.employeeId,
      r.collegeName,
      r.collegeCity,
      r.collegeAddress,
      r.subject,
      r.locationAddress,
      r.latitude,
      r.longitude,
      r.trainingDate,
      r.entryTime,
      r.exitTime,
      r.classHours,
      r.workingHours,
      r.status,
      r.statusMessage
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Trainer_Attendance_CSV_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV export downloaded.', 'success');
  };

  const handleExportExcel = () => {
    if (records.length === 0) {
      showToast('No records available to export.', 'warning');
      return;
    }

    const headers = [
      'Trainer Name', 
      'Employee ID', 
      'College Name', 
      'College City',
      'College Address', 
      'Training Subject', 
      'Verified Location', 
      'Latitude', 
      'Longitude', 
      'Date', 
      'Entry Time', 
      'Exit Time', 
      'Scheduled Class Hours',
      'Conducted Working Hours', 
      'Status',
      'Audit Warning Messages'
    ];

    const rows = records.map(r => [
      r.trainerName,
      r.employeeId,
      r.collegeName,
      r.collegeCity,
      r.collegeAddress,
      r.subject,
      r.locationAddress,
      r.latitude,
      r.longitude,
      r.trainingDate,
      r.entryTime,
      r.exitTime,
      r.classHours,
      r.workingHours,
      r.status,
      r.statusMessage
    ]);

    let tableHtml = '<table border="1"><tr>' + headers.map(h => `<th style="background-color: #6366f1; color: white;">${h}</th>`).join('') + '</tr>';
    rows.forEach(row => {
      tableHtml += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
    });
    tableHtml += '</table>';

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Trainer_Attendance_Excel_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Excel spreadsheet downloaded.', 'success');
  };

  const handleExportPDF = () => {
    if (records.length === 0) {
      showToast('No records available to export.', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank');
    const tableRows = records.map(r => `
      <tr>
        <td><b>${r.trainerName}</b><br><span style="font-size:9px">${r.employeeId}</span></td>
        <td>${r.collegeName}<br><span style="font-size:9px;color:#555">${r.collegeCity}</span></td>
        <td>${r.subject}</td>
        <td>${r.trainingDate}</td>
        <td>${r.entryTime} - ${r.exitTime}</td>
        <td>${r.classHours}</td>
        <td>${r.workingHours}</td>
        <td><span style="color: ${r.status === 'Flagged' ? '#d97706' : 'green'}; font-weight: bold;">${r.status}</span><br><span style="font-size:8px;color:#777">${r.statusMessage}</span></td>
        <td>${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Trainer Attendance Audit Report</title>
          <style>
            body { font-family: sans-serif; padding: 25px; color: #1e293b; }
            h1 { color: #4f46e5; text-align: center; margin-bottom: 5px; }
            h3 { text-align: center; color: #64748b; margin-top: 0; margin-bottom: 20px; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 6px; text-align: left; font-size: 10px; }
            th { background-color: #f1f5f9; }
            .header-info { display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <h1>Trainer Attendance Audit Report</h1>
          <h3>Full Verification Log</h3>
          <div class="header-info">
            <span>Generated: ${new Date().toLocaleString()}</span>
            <span>Trainer Submissions: ${records.length}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Trainer Name & ID</th>
                <th>College Details</th>
                <th>Subject / Course</th>
                <th>Training Date</th>
                <th>Session Timings</th>
                <th>Scheduled Hours</th>
                <th>Conducted Hours</th>
                <th>Status & Audit Message</th>
                <th>GPS Coordinates</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Trainer Attendance Verification System. Authorized Audit Copy.
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    showToast('Print window launched.', 'info');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pendingCount = trainers.filter(t => !t.isApproved).length;

  const filteredTrainers = trainers.filter(t => {
    if (!trainerSearchTerm.trim()) return true;
    return (t.trainerName || '').toLowerCase().includes(trainerSearchTerm.toLowerCase().trim());
  });

  return (
    <div className="container-fluid p-0">
      
      {/* Mobile Header */}
      <header className="d-lg-none glass-card rounded-0 border-top-0 border-start-0 border-end-0 px-4 py-3 sticky-top d-flex justify-content-between align-items-center" style={{ zIndex: 1010 }}>
        <span className="navbar-brand fw-bold gradient-text d-flex align-items-center gap-2">
          <FaMapMarkedAlt className="text-primary fs-4" />
          GeoTag Admin
        </span>
        <div className="d-flex align-items-center gap-3">
          <button 
            className="btn btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center"
            style={{ width: '36px', height: '36px' }}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <FaSun className="text-warning" /> : <FaMoon />}
          </button>
          <button 
            className="btn btn-primary p-2 d-flex align-items-center justify-content-center"
            style={{ width: '36px', height: '36px' }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <div className={`sidebar ${sidebarOpen ? 'show' : ''} p-0`}>
        <div className="p-4 border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
          <span className="d-flex align-items-center gap-2 text-decoration-none">
            <FaMapMarkedAlt className="text-primary fs-3" />
            <span className="fw-bold text-white fs-5">GeoTag Admin</span>
          </span>
          <button className="btn d-lg-none text-white border-0 p-0" onClick={() => setSidebarOpen(false)}>
            <FaTimes />
          </button>
        </div>
        
        <div className="py-4 d-flex flex-column justify-content-between" style={{ height: 'calc(100vh - 85px)' }}>
          <ul className="nav nav-pills flex-column mb-auto">
            <li className="nav-item mb-1">
              <button 
                type="button"
                className={`nav-link w-100 text-start border-0 bg-transparent ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => { setActiveTab('summary'); setSidebarOpen(false); }}
                style={{ cursor: 'pointer' }}
              >
                <FaMapMarkedAlt className="me-2" /> Dashboard Summary
              </button>
            </li>
            <li className="nav-item">
              <button 
                type="button"
                className={`nav-link w-100 text-start border-0 bg-transparent d-flex align-items-center justify-content-between ${activeTab === 'trainers' ? 'active' : ''}`}
                onClick={() => { setActiveTab('trainers'); setSidebarOpen(false); }}
                style={{ cursor: 'pointer' }}
              >
                <span><FaUsers className="me-2" /> Manage Trainers</span>
                {pendingCount > 0 && (
                  <span className="badge bg-warning text-dark rounded-pill px-2" style={{ fontSize: '0.75rem' }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            </li>
          </ul>

          <div className="px-3">
            <hr className="bg-secondary opacity-25" />
            
            {/* Desktop Theme Toggle */}
            <div className="d-none d-lg-flex justify-content-between align-items-center mb-3 px-3">
              <span className="text-secondary" style={{ fontSize: '0.85rem' }}>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              <button 
                className="btn btn-sm btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center text-white border-secondary"
                style={{ width: '36px', height: '36px' }}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <FaSun className="text-warning" /> : <FaMoon className="text-secondary" />}
              </button>
            </div>

            <span className="d-block text-secondary mb-3 px-3 font-monospace" style={{ fontSize: '0.75rem' }}>
              User: <b>{user?.username}</b>
            </span>

            <button 
              className="btn btn-outline-danger w-100 py-2.5 rounded-pill d-flex align-items-center justify-content-center gap-2 hover-scale mb-3"
              onClick={handleLogout}
            >
              <FaSignOutAlt /> Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="container-fluid p-0">
          
          {/* Header Title Section */}
          <div className="text-center mb-4">
            <h1 className="dashboard-main-heading">Manager Dashboard</h1>
            <p className="dashboard-subtitle">
              Monitor logs, verify GeoTags, and audit trainer submissions.
            </p>
          </div>
          
          {/* Exports Bar */}
          <div className="d-flex justify-content-end mb-4 gap-2">
            <button className="btn btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-1 hover-scale bg-white" onClick={handleExportCSV}>
              <FaFileCsv className="text-success" /> CSV
            </button>
            <button className="btn btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-1 hover-scale bg-white" onClick={handleExportExcel}>
              <FaFileExcel className="text-success" /> Excel
            </button>
            <button className="btn btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-1 hover-scale bg-white" onClick={handleExportPDF}>
              <FaFilePdf className="text-danger" /> PDF Report
            </button>
          </div>

          {activeTab === 'summary' ? (
            <>
              {/* 1. Statistics Cards */}
              <StatsCards stats={stats} loading={statsLoading} />

              {/* 2. Filters & Searches */}
              <div className="glass-card p-4 mb-4 shadow-sm border border-opacity-10">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <h3 className="dashboard-section-heading m-0">
                    <FaSearch className="text-primary" /> Search & Filter Parameters
                  </h3>
                </div>
                <form onSubmit={handleSearchSubmit}>
                  <div className="row g-3">
                    {/* Trainer Name */}
                    <div className="col-xl-3 col-md-6">
                      <label className="form-label small fw-semibold text-secondary mb-1">Trainer Name</label>
                      <div className="input-group">
                        <span className="input-group-text bg-transparent border-end-0">
                          <FaSearch className="text-muted" style={{ fontSize: '0.85rem' }} />
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0"
                          placeholder="Trainer name..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* College Name */}
                    <div className="col-xl-3 col-md-6">
                      <label className="form-label small fw-semibold text-secondary mb-1">College Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="College name..."
                        value={collegeFilter}
                        onChange={(e) => setCollegeFilter(e.target.value)}
                      />
                    </div>

                    {/* Employee ID */}
                    <div className="col-xl-2 col-md-4 col-sm-6">
                      <label className="form-label small fw-semibold text-secondary mb-1">Employee ID</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Employee ID..."
                        value={employeeIdFilter}
                        onChange={(e) => setEmployeeIdFilter(e.target.value)}
                      />
                    </div>

                    {/* Date */}
                    <div className="col-xl-2 col-md-4 col-sm-6">
                      <label className="form-label small fw-semibold text-secondary mb-1">Training Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                      />
                    </div>

                    {/* Location */}
                    <div className="col-xl-2 col-md-4 col-sm-6">
                      <label className="form-label small fw-semibold text-secondary mb-1">Location / Address</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Location..."
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                      />
                    </div>

                    {/* Verification Status Filter */}
                    <div className="col-xl-3 col-md-6 col-sm-6">
                      <label className="form-label small fw-semibold text-secondary mb-1">Verification Status</label>
                      <select
                        className="form-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">All Verification States</option>
                        <option value="Verified">Verified Only</option>
                        <option value="Flagged">Flagged Only</option>
                      </select>
                    </div>

                    {/* Buttons */}
                    <div className="col-xl-3 col-md-6 d-flex gap-2 align-items-end">
                      <button type="submit" className="btn btn-primary px-4 py-2 hover-scale fw-bold w-100">
                        Apply Filters
                      </button>
                      <button type="button" className="btn btn-outline-secondary px-3 py-2 hover-scale bg-white d-flex align-items-center justify-content-center" onClick={handleResetFilters} title="Reset Filters">
                        <FaUndo />
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Timeframe pills & Sorting Selector */}
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                {/* Timeframe selector pills */}
                <div className="d-flex gap-1.5 bg-light p-1 rounded border">
                  <button 
                    className={`btn btn-sm px-3 rounded-pill fw-semibold ${timeframeFilter === 'all' ? 'btn-primary' : 'btn-light text-secondary'}`}
                    onClick={() => { setTimeframeFilter('all'); setPage(1); }}
                  >
                    All Records
                  </button>
                  <button 
                    className={`btn btn-sm px-3 rounded-pill fw-semibold ${timeframeFilter === 'today' ? 'btn-primary' : 'btn-light text-secondary'}`}
                    onClick={() => { setTimeframeFilter('today'); setPage(1); }}
                  >
                    Today's Records
                  </button>
                  <button 
                    className={`btn btn-sm px-3 rounded-pill fw-semibold ${timeframeFilter === 'week' ? 'btn-primary' : 'btn-light text-secondary'}`}
                    onClick={() => { setTimeframeFilter('week'); setPage(1); }}
                  >
                    This Week
                  </button>
                  <button 
                    className={`btn btn-sm px-3 rounded-pill fw-semibold ${timeframeFilter === 'month' ? 'btn-primary' : 'btn-light text-secondary'}`}
                    onClick={() => { setTimeframeFilter('month'); setPage(1); }}
                  >
                    This Month
                  </button>
                </div>

                {/* Sorting */}
                <div className="d-flex align-items-center gap-2">
                  <label className="text-secondary fw-semibold m-0" style={{ fontSize: '0.85rem' }}>Sort by:</label>
                  <select
                    className="form-select form-select-sm py-1.5"
                    style={{ width: '180px' }}
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="workingHours">Working Hours</option>
                    <option value="trainerName">Trainer Name</option>
                    <option value="collegeName">College Name</option>
                  </select>
                </div>
              </div>

               {/* 3. Table Records */}
              <RecordTable 
                records={records} 
                onViewClick={(record, autoFocus) => { setSelectedRecord(record); setFocusComments(!!autoFocus); }} 
                onEditClick={handleOpenEdit}
                onDeleteClick={handleDeleteRecord}
                API_URL={API_URL}
                loading={loading}
                startIndex={(page - 1) * limit}
              />

              {/* 4. Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                  <button
                    className="btn btn-outline-secondary rounded-circle p-2.5 d-flex align-items-center justify-content-center hover-scale bg-white"
                    style={{ width: '40px', height: '40px' }}
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  >
                    <FaChevronLeft />
                  </button>
                  <span className="fw-semibold text-secondary">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="btn btn-outline-secondary rounded-circle p-2.5 d-flex align-items-center justify-content-center hover-scale bg-white"
                    style={{ width: '40px', height: '40px' }}
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    <FaChevronRight />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="glass-card p-4 shadow-sm border border-opacity-10">
              <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
                <h3 className="dashboard-section-heading m-0">
                  <FaUsers className="text-primary" /> Trainer Accounts Directory
                </h3>
                <span className="badge bg-primary rounded-pill">
                  {trainerSearchTerm ? `${filteredTrainers.length} of ${trainers.length}` : trainers.length} Trainers
                </span>
              </div>

              {/* Trainer Search Bar */}
              {!trainersLoading && trainers.length > 0 && (
                <div className="mb-4">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      setTrainerSearchTerm(trainerQuery);
                    }}
                    className="row g-2 align-items-center"
                  >
                    <div className="col-md-6 col-lg-4">
                      <div className="input-group">
                        <span className="input-group-text bg-transparent border-end-0">
                          <FaSearch className="text-muted" style={{ fontSize: '0.85rem' }} />
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0"
                          placeholder="Search trainer name..."
                          value={trainerQuery}
                          onChange={(e) => {
                            setTrainerQuery(e.target.value);
                            if (!e.target.value.trim()) {
                              setTrainerSearchTerm('');
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="col-auto d-flex gap-2">
                      <button type="submit" className="btn btn-primary px-4 fw-bold hover-scale">
                        Search
                      </button>
                      {trainerSearchTerm && (
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary px-3 bg-white hover-scale"
                          onClick={() => {
                            setTrainerQuery('');
                            setTrainerSearchTerm('');
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {trainersLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-2 small">Fetching trainer database...</p>
                </div>
              ) : trainers.length === 0 ? (
                <div className="text-center py-5 text-secondary">
                  <FaUsers className="fs-1 text-muted mb-3 opacity-30" />
                  <p className="fw-semibold m-0">No Trainers Registered</p>
                  <p className="small text-muted">New trainers will appear here once they sign up.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table custom-table table-hover align-middle m-0">
                    <thead>
                      <tr>
                        <th>Trainer Name</th>
                        <th>Employee ID</th>
                        <th>Username</th>
                        <th>Email Address</th>
                        <th>Date Registered</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrainers.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-5 text-secondary">
                            <FaSearch className="fs-3 text-muted mb-2 opacity-50" /><br />
                            No trainers found matching "{trainerSearchTerm}".
                          </td>
                        </tr>
                      ) : (
                        filteredTrainers.map((t) => (
                        <tr key={t._id}>
                          <td>
                            <div className="fw-bold">{t.trainerName || 'N/A'}</div>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark font-monospace border">{t.employeeId || 'N/A'}</span>
                          </td>
                          <td>
                            <span className="text-secondary small font-monospace">@{t.username}</span>
                          </td>
                          <td>{t.email || 'N/A'}</td>
                          <td className="small text-secondary">
                            {new Date(t.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td>
                            {t.isApproved ? (
                              <span className="badge bg-success-subtle text-success border border-success border-opacity-25 rounded-pill px-2.5 py-1">
                                Approved
                              </span>
                            ) : (
                              <span className="badge bg-warning-subtle text-warning border border-warning border-opacity-25 rounded-pill px-2.5 py-1">
                                Pending Approval
                              </span>
                            )}
                          </td>
                          <td className="text-end">
                            <div className="d-flex align-items-center justify-content-end gap-2">
                              {!t.isApproved && (
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm rounded-pill px-3 py-1 hover-scale d-inline-flex align-items-center gap-1"
                                  onClick={() => handleApproveTrainer(t._id, t.trainerName || t.username)}
                                >
                                  Approve
                                </button>
                              )}
                              {deletingTrainerId === t._id ? (
                                <div className="d-inline-flex gap-2 align-items-center justify-content-end">
                                  <span className="small text-danger fw-semibold">Confirm Revoke?</span>
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm rounded-pill px-2.5 py-0.5 hover-scale"
                                    onClick={() => handleDeleteTrainer(t._id, t.trainerName || t.username)}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm rounded-pill px-2.5 py-0.5 hover-scale bg-white"
                                    onClick={() => setDeletingTrainerId(null)}
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1 hover-scale d-inline-flex align-items-center gap-1.5"
                                  onClick={() => setDeletingTrainerId(t._id)}
                                >
                                  <FaUserMinus /> Revoke Access
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

           {/* View Details Modal */}
          {selectedRecord && (
            <RecordModal 
              record={selectedRecord} 
              onClose={() => setSelectedRecord(null)} 
              onApproveClick={handleApproveRecord}
              onRejectClick={handleRejectRecord}
              onRecordUpdate={handleRecordUpdate}
              API_URL={API_URL} 
              autoFocusComment={focusComments}
            />
          )}

          {/* Manager EDIT Record Modal */}
          {editingRecord && (
            <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(5px)', zIndex: 1060 }}>
              <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <form onSubmit={handleSaveEdit} className="modal-content glass-card p-3 shadow-2xl">
                  <div className="modal-header border-bottom-0 pb-0 d-flex justify-content-between align-items-center">
                    <h5 className="modal-title fw-bold gradient-text m-0">Edit Attendance Record</h5>
                    <button type="button" className="btn-close" onClick={() => setEditingRecord(null)}></button>
                  </div>
                  
                  <div className="modal-body py-3">
                      <div className="row g-3">
                        {/* Trainer Name */}
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-secondary">Trainer Name</label>
                          <input
                            type="text"
                            name="trainerName"
                            className="form-control"
                            value={editingRecord.trainerName}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        {/* Employee ID */}
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-secondary">Employee ID</label>
                          <input
                            type="text"
                            name="employeeId"
                            className="form-control"
                            value={editingRecord.employeeId}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        {/* College Name */}
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-secondary">College Name</label>
                          <input
                            type="text"
                            name="collegeName"
                            className="form-control"
                            value={editingRecord.collegeName}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        {/* College City */}
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-secondary">College City</label>
                          <input
                            type="text"
                            name="collegeCity"
                            className="form-control"
                            value={editingRecord.collegeCity}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        {/* College Address */}
                        <div className="col-md-12">
                          <label className="form-label fw-semibold text-secondary">College Address</label>
                          <textarea
                            name="collegeAddress"
                            className="form-control"
                            rows="1.5"
                            value={editingRecord.collegeAddress}
                            onChange={handleEditInputChange}
                            required
                          ></textarea>
                        </div>

                        {/* Subject */}
                        <div className="col-md-12">
                          <label className="form-label fw-semibold text-secondary">Training Subject</label>
                          <input
                            type="text"
                            name="subject"
                            className="form-control"
                            value={editingRecord.subject}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        {/* Date */}
                        <div className="col-md-4">
                          <label className="form-label fw-semibold text-secondary">Training Date</label>
                          <input
                            type="date"
                            name="trainingDate"
                            className="form-control"
                            value={editingRecord.trainingDate}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        {/* Entry Time */}
                        <div className="col-md-4">
                          <label className="form-label fw-semibold text-secondary">Entry Time</label>
                          <input
                            type="time"
                            name="entryTime"
                            className="form-control"
                            value={editingRecord.entryTime}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        {/* Exit Time */}
                        <div className="col-md-4">
                          <label className="form-label fw-semibold text-secondary">Exit Time</label>
                          <input
                            type="time"
                            name="exitTime"
                            className="form-control"
                            value={editingRecord.exitTime}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        {/* Scheduled Session Times */}
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-secondary">Scheduled Start Time</label>
                          <input
                            type="time"
                            name="scheduledStartTime"
                            className="form-control"
                            value={editingRecord.scheduledStartTime || ''}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-secondary">Scheduled End Time</label>
                          <input
                            type="time"
                            name="scheduledEndTime"
                            className="form-control"
                            value={editingRecord.scheduledEndTime || ''}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        {/* Location Address */}
                        <div className="col-md-12">
                          <label className="form-label fw-semibold text-secondary">Verified GPS Address</label>
                          <input
                            type="text"
                            name="locationAddress"
                            className="form-control"
                            value={editingRecord.locationAddress}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        {/* Lat & Lon */}
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-secondary">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            name="latitude"
                            className="form-control font-monospace"
                            value={editingRecord.latitude}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-secondary">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            name="longitude"
                            className="form-control font-monospace"
                            value={editingRecord.longitude}
                            onChange={handleEditInputChange}
                            required
                          />
                        </div>

                      </div>
                    </div>

                    <div className="modal-footer border-top-0 pt-0 d-flex gap-2">
                      <button type="button" className="btn btn-secondary px-4 rounded-pill" onClick={() => setEditingRecord(null)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary px-4 rounded-pill d-flex align-items-center gap-1">
                        <FaSave /> Save Changes
                      </button>
                    </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
};

export default ManagerDashboard;
