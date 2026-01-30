// TrainerDashboard.jsx - Faculty/Trainer Interface for HRD
import React, { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard, Users, BookOpen, ClipboardCheck,
    BarChart2, LogOut, Menu, ChevronDown, CalendarCheck, X
} from 'lucide-react';
import { api } from '../../api';
import gsap from 'gsap';

import TrainerClasses from './TrainerClasses';
import TrainerAttendance from './TrainerAttendance';
import TrainerMarks from './TrainerMarks';
import StudentManagement from './StudentManagement';

const TrainerDashboard = ({ token, setPage, setToken }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedAllocation, setSelectedAllocation] = useState(null); // The currently active class context

    // GSAP Refs
    const navRef = useRef(null);
    const indicatorRef = useRef(null);
    const contentRef = useRef(null);

    const handleLogout = () => {
        localStorage.removeItem('noteorbit_token');
        localStorage.removeItem('noteorbit_user');
        setToken(null);
        setPage('user_type');
    };

    const handleClassSelect = (allocation) => {
        setSelectedAllocation(allocation);
        setActiveTab('attendance'); // Auto-switch to attendance on select, or could stay
    };

    const menuItems = [
        { id: 'dashboard', label: 'My Classes', icon: BookOpen },
        { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
        { id: 'marks', label: 'Marks Entry', icon: ClipboardCheck },
        { id: 'students', label: 'My Students', icon: Users },
        { id: 'performance', label: 'Performance', icon: BarChart2 },
    ];

    // GSAP Navigation Animation
    useEffect(() => {
        if (navRef.current && indicatorRef.current) {
            setTimeout(() => {
                const activeBtn = navRef.current.querySelector(`button[data-key="${activeTab}"]`);
                if (activeBtn) {
                    gsap.to(indicatorRef.current, {
                        y: activeBtn.offsetTop,
                        height: activeBtn.offsetHeight,
                        opacity: 1,
                        duration: 0.5,
                        ease: "elastic.out(1, 0.6)"
                    });
                }
            }, 100);
        }
        if (contentRef.current) {
            gsap.fromTo(contentRef.current,
                { opacity: 0, x: 20 },
                { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
            );
        }
    }, [activeTab]);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <TrainerClasses token={token} onSelectClass={handleClassSelect} />;
            case 'attendance':
                return <TrainerAttendance token={token} allocation={selectedAllocation} />;
            case 'marks':
                return <TrainerMarks token={token} allocation={selectedAllocation} />;
            case 'students':
                return <StudentManagement token={token} allocation={selectedAllocation} />;

            default: return <div>Coming soon...</div>;
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-slate-900/60 backdrop-blur-xl p-4 rounded-xl shadow-lg border border-white/10 flex-shrink-0 animate-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h5 className="text-lg font-bold text-white">Trainer Panel</h5>
                        <p className="text-xs text-slate-400">Section Manager</p>
                    </div>
                </div>

                <nav className="space-y-1 relative hidden md:block" ref={navRef}>
                    <div ref={indicatorRef} className="absolute left-0 top-0 w-full bg-emerald-600/20 border border-emerald-500/30 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)] pointer-events-none opacity-0 z-0" style={{ height: 0 }} />
                    {menuItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                data-key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center p-3 rounded-xl font-semibold transition-colors duration-200 relative z-10 ${isActive
                                    ? 'text-emerald-300'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Mobile Nav */}
                <div className="md:hidden">
                    <div className="relative">
                        <Menu className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none" />
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value)}
                            className="w-full bg-slate-800/80 border border-emerald-500/30 rounded-xl py-3 pl-10 pr-4 text-white appearance-none outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-lg font-semibold"
                        >
                            {menuItems.map(item => (
                                <option key={item.id} value={item.id} className="bg-slate-900 text-white py-2">
                                    {item.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Selected Class Indicator */}
                {selectedAllocation && (
                    <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Active Class</span>
                            <button onClick={() => setSelectedAllocation(null)} className="text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
                        </div>
                        <p className="text-white font-bold text-sm line-clamp-1">{selectedAllocation.subject_name}</p>
                        <p className="text-slate-400 text-xs">Sem {selectedAllocation.semester} - Sec {selectedAllocation.section}</p>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-semibold"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div ref={contentRef} className="flex-1 min-h-[600px] bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-2xl border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                {renderContent()}
            </div>
        </div>
    );
};

export default TrainerDashboard;
