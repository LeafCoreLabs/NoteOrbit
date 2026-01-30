// PlacementAssist.jsx - Student Placement Portal
import React, { useState } from 'react';
import { User, Briefcase, FileText, CheckCircle, BarChart2 } from 'lucide-react';
import PlacementProfile from './PlacementProfile';
import AvailableDrives from './AvailableDrives';
import MyApplications from './MyApplications';
import MyOffers from './MyOffers';
import HRDPerformance from '../hrd/HRDPerformance';

const PlacementAssist = ({ token, user }) => {
    const [activeTab, setActiveTab] = useState('drives');

    const tabs = [
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'drives', label: 'Available Drives', icon: Briefcase },
        { id: 'applications', label: 'Applications', icon: FileText },
        { id: 'offers', label: 'My Offers', icon: CheckCircle },
        { id: 'performance', label: 'Training Performance', icon: BarChart2 },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return <PlacementProfile token={token} />;
            case 'drives': return <AvailableDrives token={token} />;
            case 'applications': return <MyApplications token={token} />;
            case 'offers': return <MyOffers token={token} />;
            case 'performance': return <HRDPerformance token={token} />;
            default: return <div>Select a tab</div>;
        }
    };

    return (
        <div className="min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Placement Assist</h1>
                <p className="text-slate-400">Accelerate your career with campus opportunities & training.</p>
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

export default PlacementAssist;
