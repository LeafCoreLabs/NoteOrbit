// HRDDashboard.jsx - Main Router for HRD Portal
import React from 'react';
import CHRODashboard from './CHRODashboard';
import TrainerDashboard from './TrainerDashboard';

const HRDDashboard = ({ userRole, token, setPage, setToken }) => {
    // If userRole not passed, fallback to localStorage user
    let role = userRole;
    if (!role) {
        const userStr = localStorage.getItem('noteorbit_user');
        if (userStr) {
            const u = JSON.parse(userStr);
            const r = u.role || 'hrd';
            if (r === 'trainer' || r === 'hrd_trainer') role = 'Trainer';
            else role = 'HRD';
        }
    }

    if (role === 'Trainer') {
        return <TrainerDashboard token={token} setPage={setPage} setToken={setToken} />;
    }

    // Default to CHRO
    return <CHRODashboard token={token} setPage={setPage} setToken={setToken} />;
};

export default HRDDashboard;
