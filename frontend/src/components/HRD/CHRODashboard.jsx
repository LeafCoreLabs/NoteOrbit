// CHRODashboard.jsx - CHRO Command Center (Student Portal Design Replica)
import React, { useState } from 'react';
import { Building2, Users, BookOpen, Briefcase, Award, BarChart2, MapPin, LogOut } from 'lucide-react';
import CompanyManagement from './CompanyManagement';
import DriveManagement from './DriveManagement';
import OfferManagement from './OfferManagement';
import StudentManagement from './StudentManagement';
import SubjectManagement from './SubjectManagement';
import TrainerManagement from './TrainerManagement';
import WorkloadAllocation from './WorkloadAllocation';
import RoundManagement from './RoundManagement';
import GlobalAnalytics from './GlobalAnalytics';

const CHRODashboard = ({ token, setPage, setToken, catalogs }) => {
    const [activeTab, setActiveTab] = useState('analytics');

    const handleLogout = () => {
        localStorage.removeItem('noteorbit_token');
        localStorage.removeItem('noteorbit_user');
        setToken(null);
        setPage('login');
    };

    const tabs = [
        { id: 'analytics', label: 'Analytics', icon: BarChart2 },
        { id: 'companies', label: 'Companies', icon: Building2 },
        { id: 'drives', label: 'Drives', icon: Briefcase },
        { id: 'rounds', label: 'Rounds', icon: Award },
        { id: 'offers', label: 'Offers', icon: Award },
        { id: 'subjects', label: 'Subjects', icon: BookOpen },
        { id: 'trainers', label: 'Trainers', icon: Users },
        { id: 'allocations', label: 'Workload', icon: MapPin },
        { id: 'students', label: 'Students', icon: Users },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'analytics': return <GlobalAnalytics token={token} />;
            case 'companies': return <CompanyManagement token={token} />;
            case 'drives': return <DriveManagement token={token} />;
            case 'rounds': return <RoundManagement token={token} />;
            case 'offers': return <OfferManagement token={token} />;
            case 'subjects': return <SubjectManagement token={token} />;
            case 'trainers': return <TrainerManagement token={token} />;
            case 'allocations': return <WorkloadAllocation token={token} catalogs={catalogs} />;
            case 'students': return <StudentManagement token={token} catalogs={catalogs} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">CHRO Command Center</h1>
                    <p className="text-slate-400">Manage placements, training & workforce allocation.</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition"
                >
                    <LogOut className="w-4 h-4" /> Logout
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 p-1 bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/5 w-fit">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${isActive
                                ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {renderContent()}
            </div>
        </div>
    );
};

export default CHRODashboard;
