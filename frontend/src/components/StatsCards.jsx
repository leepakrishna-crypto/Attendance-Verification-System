import React from 'react';
import { FaUsers, FaWalking, FaMapMarkedAlt, FaHourglassHalf, FaCheckDouble } from 'react-icons/fa';

const StatsCards = ({ stats, loading }) => {
  const cardData = [
    {
      title: 'Registered Trainers',
      value: stats?.totalRegisteredTrainers ?? 0,
      icon: <FaUsers className="fs-3 text-primary" />,
      gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
      borderColor: '#6366f1'
    },
    {
      title: 'Active Trainers Today',
      value: stats?.activeTrainersToday ?? 0,
      icon: <FaWalking className="fs-3 text-success" />,
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
      borderColor: '#10b981'
    },
    {
      title: "Today's Visits",
      value: stats?.todayVisits ?? 0,
      icon: <FaWalking className="fs-3 text-success" />,
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
      borderColor: '#10b981'
    },
    {
      title: 'Colleges Covered',
      value: stats?.totalColleges ?? 0,
      icon: <FaMapMarkedAlt className="fs-3 text-warning" />,
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
      borderColor: '#f59e0b'
    },
    {
      title: 'Avg. Working Hours',
      value: stats?.averageWorkingHours ?? '0 Hours 0 Minutes',
      icon: <FaHourglassHalf className="fs-3 text-info" />,
      gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)',
      borderColor: '#06b6d4'
    },
    {
      title: 'Completed Trainings',
      value: stats?.completedTrainings ?? 0,
      icon: <FaCheckDouble className="fs-3 text-danger" />,
      gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
      borderColor: '#ef4444'
    }
  ];

  return (
    <div className="row g-3 mb-5">
      {cardData.map((card, index) => (
        <div key={index} className="col-sm-6 col-md-4 col-xl-2 col-xxl-2">
          <div 
            className="glass-card p-4 hover-scale h-100 d-flex align-items-center justify-content-between"
            style={{ 
              borderLeft: `4px solid ${card.borderColor}`,
              background: card.gradient 
            }}
          >
            <div>
              <span className="text-secondary fw-semibold mb-1 d-block stat-card-label">
                {card.title}
              </span>
              <h4 className="fw-bold m-0 text-primary-theme stat-card-number">
                {loading ? (
                  <span className="spinner-border spinner-border-sm text-secondary" role="status"></span>
                ) : (
                  card.value
                )}
              </h4>
            </div>
            <div className="p-2.5 bg-white rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
              {React.cloneElement(card.icon, { className: 'fs-5' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
