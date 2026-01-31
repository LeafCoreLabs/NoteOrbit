// CHRODashboard.jsx - CHRO Command Center
import React, { useState } from 'react';
import { Building2, Users, BookOpen, Briefcase, Award, BarChart2, Settings, LogOut, MapPin } from 'lucide-react';
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
    const [activeView, setActiveView] = useState('analytics');
    const [selectedDriveId, setSelectedDriveId] = useState(null);

    const handleLogout = () => {
        localStorage.removeItem('noteorbit_token');
        localStorage.removeItem('noteorbit_user');
        setToken(null);
        setPage('login');
    };

    const navGroups = [
        {
            title: 'Dashboard',
            items: [
                { id: 'analytics', label: 'Analytics', icon: BarChart2 },
            ]
        },
        {
            title: 'Placement Engine',
            items: [
                { id: 'companies', label: 'Companies', icon: Building2 },
                { id: 'drives', label: 'Drives', icon: Briefcase },
                { id: 'rounds', label: 'Interview Rounds', icon: Settings },
                { id: 'offers', label: 'Offers', icon: Award },
            ]
        },
        {
            title: 'Training Config',
            items: [
                { id: 'subjects', label: 'Subjects', icon: BookOpen },
                { id: 'trainers', label: 'Trainers', icon: Users },
                { id: 'allocations', label: 'Workload Map', icon: MapPin },
            ]
        },
        {
            title: 'Directory',
            items: [
                { id: 'students', label: 'Students', icon: Users },
            ]
        }
    ];

    const renderContent = () => {
        switch (activeView) {
            case 'analytics': return <GlobalAnalytics token={token} />;
            case 'companies': return <CompanyManagement token={token} />;
            case 'drives': return <DriveManagement token={token} />;
            case 'rounds': return <RoundManagement token={token} driveId={selectedDriveId} />;
            case 'offers': return <OfferManagement token={token} />;
            case 'subjects': return <SubjectManagement token={token} />;
            case 'trainers': return <TrainerManagement token={token} />;
            case 'allocations': return <WorkloadAllocation token={token} catalogs={catalogs} />;
            case 'students': return <StudentManagement token={token} catalogs={catalogs} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
            <div className="flex">
                {/* Sidebar */}
                <aside className="w-72 min-h-screen bg-slate-900/80 backdrop-blur-xl border-r border-white/5 p-6">
                    <div className="mb-8">
                        <h1 className="text-xl font-bold text-white">CHRO Command</h1>
                        <p className="text-xs text-slate-500">Placement & Training HQ</p>
                    </div>

                    <nav className="space-y-6">
                        {navGroups.map(group => (
                            <div key={group.title}>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{group.title}</p>
                                <div className="space-y-1">
                                    {group.items.map(item => {
                                        const Icon = item.icon;
                                        const isActive = activeView === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setActiveView(item.id)}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" /> {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    <button
                        onClick={handleLogout}
                        className="absolute bottom-6 left-6 flex items-center gap-2 text-slate-500 hover:text-red-400 transition text-sm"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default CHRODashboard;
