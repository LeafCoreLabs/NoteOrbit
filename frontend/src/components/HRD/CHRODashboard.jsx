// CHRODashboard.jsx - CHRO Command Center (Redesigned to match NoteOrbit Design System)
import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Building2, Users, BookOpen, Briefcase, Award, BarChart2, LogOut, MapPin, Menu, ChevronDown, Book } from 'lucide-react';
import CompanyManagement from './CompanyManagement';
import DriveManagement from './DriveManagement';
import OfferManagement from './OfferManagement';
import StudentManagement from './StudentManagement';
import SubjectManagement from './SubjectManagement';
import TrainerManagement from './TrainerManagement';
import WorkloadAllocation from './WorkloadAllocation';
import RoundManagement from './RoundManagement';
import GlobalAnalytics from './GlobalAnalytics';

const OrbitLogo = () => (
    <div className="flex items-center gap-3 cursor-pointer select-none">
        <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20 ring-1 ring-white/10">
            <Book className="w-5 h-5 text-white stroke-[2.5]" />
            <div className="absolute top-0 right-0 -mr-1 -mt-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-950" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">
            Note<span className="font-light text-purple-200">Orbit</span>
        </span>
    </div>
);

const CHRODashboard = ({ token, setPage, setToken, catalogs }) => {
    const [activeView, setActiveView] = useState('analytics');
    const [selectedDriveId, setSelectedDriveId] = useState(null);
    const navRef = useRef(null);
    const indicatorRef = useRef(null);
    const contentRef = useRef(null);

    const handleLogout = () => {
        localStorage.removeItem('noteorbit_token');
        localStorage.removeItem('noteorbit_user');
        setToken(null);
        setPage('login');
    };

    const navItems = [
        { id: 'analytics', label: 'Analytics', icon: BarChart2, color: 'purple' },
        { id: 'companies', label: 'Companies', icon: Building2, color: 'purple' },
        { id: 'drives', label: 'Drives', icon: Briefcase, color: 'purple' },
        { id: 'rounds', label: 'Interview Rounds', icon: Award, color: 'purple' },
        { id: 'offers', label: 'Offers', icon: Award, color: 'purple' },
        { id: 'subjects', label: 'Subjects', icon: BookOpen, color: 'purple' },
        { id: 'trainers', label: 'Trainers', icon: Users, color: 'purple' },
        { id: 'allocations', label: 'Workload Map', icon: MapPin, color: 'purple' },
        { id: 'students', label: 'Students', icon: Users, color: 'purple' },
    ];

    // GSAP Animation for active indicator
    useEffect(() => {
        if (navRef.current && indicatorRef.current) {
            const activeBtn = navRef.current.querySelector(`button[data-key="${activeView}"]`);
            if (activeBtn) {
                gsap.to(indicatorRef.current, {
                    y: activeBtn.offsetTop,
                    height: activeBtn.offsetHeight,
                    opacity: 1,
                    duration: 0.5,
                    ease: "elastic.out(1, 0.6)"
                });
            }
        }
        if (contentRef.current) {
            gsap.fromTo(contentRef.current,
                { opacity: 0, x: 20 },
                { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
            );
        }
    }, [activeView]);

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
            <div className="flex flex-col md:flex-row gap-6 p-4 md:p-6">
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-slate-900/60 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-white/10 flex-shrink-0 animate-in slide-in-from-left-4 duration-500">
                    {/* Logo */}
                    <div className="mb-6">
                        <OrbitLogo />
                        <p className="text-xs text-slate-500 mt-2 ml-1">CHRO Command Center</p>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="space-y-1 relative hidden md:block" ref={navRef}>
                        <div ref={indicatorRef} className="absolute left-0 top-0 w-full bg-purple-600/20 border border-purple-500/30 rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.2)] pointer-events-none opacity-0 z-0" style={{ height: 0 }} />
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                data-key={item.id}
                                onClick={() => setActiveView(item.id)}
                                className={`w-full flex items-center p-3 rounded-xl font-semibold transition-colors duration-200 relative z-10 ${activeView === item.id
                                    ? 'text-purple-300'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Mobile Navigation Dropdown */}
                    <div className="md:hidden">
                        <div className="relative">
                            <Menu className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 pointer-events-none" />
                            <select
                                value={activeView}
                                onChange={(e) => setActiveView(e.target.value)}
                                className="w-full bg-slate-800/80 border border-purple-500/30 rounded-xl py-3 pl-10 pr-4 text-white appearance-none outline-none focus:ring-2 focus:ring-purple-500/50 shadow-lg font-semibold"
                            >
                                {navItems.map(item => (
                                    <option key={item.id} value={item.id} className="bg-slate-900 text-white py-2">
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="mt-6 w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-400 transition text-sm py-2.5 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>

                {/* Main Content */}
                <div ref={contentRef} className="flex-1 min-h-[600px] bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default CHRODashboard;
