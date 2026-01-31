// TrainerDashboard.jsx - Trainer Portal (Redesigned to match NoteOrbit Design System)
import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { BookOpen, Users, ClipboardList, Upload, FileText, LogOut, Loader2, Menu, ChevronDown, Book } from 'lucide-react';
import { api } from '../../api';
import StudentManagement from './StudentManagement';
import BulkAttendance from './BulkAttendance';
import BulkDataUpload from './BulkDataUpload';
import InterviewResultLogger from './InterviewResultLogger';

const OrbitLogo = () => (
    <div className="flex items-center gap-3 cursor-pointer select-none">
        <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <Book className="w-5 h-5 text-white stroke-[2.5]" />
            <div className="absolute top-0 right-0 -mr-1 -mt-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-950" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">
            Note<span className="font-light text-indigo-200">Orbit</span>
        </span>
    </div>
);

const TrainerDashboard = ({ token, setPage, setToken }) => {
    const [activeView, setActiveView] = useState('classes');
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const navRef = useRef(null);
    const indicatorRef = useRef(null);
    const contentRef = useRef(null);

    useEffect(() => { fetchClasses(); }, []);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/hrd/trainer/classes', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setClasses(res.data.classes || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleLogout = () => {
        localStorage.removeItem('noteorbit_token');
        localStorage.removeItem('noteorbit_user');
        setToken(null);
        setPage('login');
    };

    const navItems = [
        { id: 'classes', label: 'My Classes', icon: BookOpen },
        { id: 'students', label: 'Student Directory', icon: Users },
        { id: 'attendance', label: 'Bulk Attendance', icon: ClipboardList },
        { id: 'upload', label: 'Data Upload', icon: Upload },
        { id: 'interviews', label: 'Interview Results', icon: FileText },
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
            case 'classes':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-indigo-400" />
                            </div>
                            My Allocated Classes
                        </h2>
                        {loading ? (
                            <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-400 w-8 h-8" /></div>
                        ) : classes.length === 0 ? (
                            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                                <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-400">No classes allocated yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {classes.map(c => (
                                    <div
                                        key={c.id}
                                        className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 hover:shadow-[0_0_25px_rgba(99,102,241,0.1)] transition-all duration-300 cursor-pointer group"
                                        onClick={() => { setSelectedClass(c); setActiveView('students'); }}
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <BookOpen className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{c.subject_name}</h3>
                                        <p className="text-slate-400 text-sm">{c.degree} Sem {c.semester} - Section {c.section}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'students':
                return <StudentManagement token={token} allocation={selectedClass} />;
            case 'attendance':
                return <BulkAttendance token={token} classes={classes} />;
            case 'upload':
                return <BulkDataUpload token={token} />;
            case 'interviews':
                return <InterviewResultLogger token={token} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950">
            <div className="flex flex-col md:flex-row gap-6 p-4 md:p-6">
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-slate-900/60 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-white/10 flex-shrink-0 animate-in slide-in-from-left-4 duration-500">
                    {/* Logo */}
                    <div className="mb-6">
                        <OrbitLogo />
                        <p className="text-xs text-slate-500 mt-2 ml-1">Trainer Portal</p>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="space-y-1 relative hidden md:block" ref={navRef}>
                        <div ref={indicatorRef} className="absolute left-0 top-0 w-full bg-indigo-600/20 border border-indigo-500/30 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.2)] pointer-events-none opacity-0 z-0" style={{ height: 0 }} />
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                data-key={item.id}
                                onClick={() => setActiveView(item.id)}
                                className={`w-full flex items-center p-3 rounded-xl font-semibold transition-colors duration-200 relative z-10 ${activeView === item.id
                                    ? 'text-indigo-300'
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
                            <Menu className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 pointer-events-none" />
                            <select
                                value={activeView}
                                onChange={(e) => setActiveView(e.target.value)}
                                className="w-full bg-slate-800/80 border border-indigo-500/30 rounded-xl py-3 pl-10 pr-4 text-white appearance-none outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-lg font-semibold"
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
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default TrainerDashboard;
